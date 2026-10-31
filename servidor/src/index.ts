/**
 * Servidor de NutriLog (Cloudflare Worker).
 *
 * La app de iPhone no puede llevar la clave de la API de Claude dentro (cualquiera podría
 * sacarla y usarla), así que le pide a este servidor que lea la etiqueta. El servidor:
 *   POST /leer        { imagenes: [{ media_type, data(base64) }] }  → { hayIngredientes, producto, ingredientes, legibilidad }
 *   POST /clasificar  { textos: string[] }                          → [{ original, nombre, categoria, nivel, que, salud, alergeno }]
 *   GET  /salud                                                     → { ok: true }
 *
 * Las instrucciones para Claude están en ../../js/prompts.js (las mismas que usa la app).
 * Las fotos no se guardan: se envían a Claude y se descartan.
 */
import Anthropic from "@anthropic-ai/sdk";
import prompts from "../../js/prompts.js";

interface LimitadorDeUso {
  limit(opciones: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  ANTHROPIC_API_KEY: string;
  /** Modelo de Claude. Por defecto claude-opus-5-5. */
  MODELO?: string;
  /** Orígenes web extra permitidos (separados por comas), p. ej. tu dominio de GitHub Pages. */
  ORIGENES_EXTRA?: string;
  /** Límite de uso por IP (opcional, se configura en wrangler.toml). */
  LIMITE?: LimitadorDeUso;
}

const MODELO_POR_DEFECTO = "claude-opus-5-5";
const MAX_IMAGENES = 3;
const MAX_BASE64_POR_IMAGEN = 7_000_000; // ≈ 5 MB
const MAX_TEXTOS = 25;
const TIPOS_IMAGEN = ["image/jpeg", "image/png", "image/webp"] as const;
type TipoImagen = (typeof TIPOS_IMAGEN)[number];

// Orígenes de la app nativa (Capacitor en iOS usa capacitor://localhost)
const ORIGENES_APP = ["capacitor://localhost", "ionic://localhost", "http://localhost", "https://localhost"];

const ESQUEMA_LECTURA = {
  type: "object",
  properties: {
    hayIngredientes: { type: "boolean" },
    producto: { type: "string" },
    ingredientes: { type: "string" },
    legibilidad: { type: "string", enum: ["buena", "parcial", "mala"] },
  },
  required: ["hayIngredientes", "producto", "ingredientes", "legibilidad"],
  additionalProperties: false,
};

const ESQUEMA_CLASIFICACION = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          original: { type: "string" },
          nombre: { type: "string" },
          categoria: { type: "string" },
          nivel: { type: "string", enum: ["bueno", "neutral", "moderar", "evitar", "ignorar"] },
          que: { type: "string" },
          salud: { type: "string" },
          alergeno: { type: "string" },
        },
        required: ["original", "nombre", "categoria", "nivel", "que", "salud", "alergeno"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

class ErrorDeCliente extends Error {
  constructor(public codigo: string, public estado: number) {
    super(codigo);
  }
}

function cabecerasCors(origen: string | null, env: Env): Record<string, string> {
  const permitidos = [...ORIGENES_APP, ...(env.ORIGENES_EXTRA || "").split(",").map((o) => o.trim()).filter(Boolean)];
  const h: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-NutriLog-Version",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (origen && permitidos.includes(origen)) h["Access-Control-Allow-Origin"] = origen;
  return h;
}

function json(datos: unknown, estado: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors },
  });
}

/** Llama a Claude y devuelve el JSON de la respuesta (garantizado por el esquema). */
async function preguntarAClaude(
  env: Env,
  contenido: Anthropic.Beta.BetaContentBlockParam[],
  esquema: Record<string, unknown>,
): Promise<unknown> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2 });
  const respuesta = await client.beta.messages.create({
    model: env.MODELO || MODELO_POR_DEFECTO,
    max_tokens: 16000,
    // Si el modelo rechaza la petición, la API la reintenta con el modelo de respaldo recomendado.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: esquema } },
    messages: [{ role: "user", content: contenido }],
  });

  if (respuesta.stop_reason === "refusal") throw new ErrorDeCliente("refused", 422);
  if (respuesta.stop_reason === "max_tokens") throw new ErrorDeCliente("truncated", 502);
  const texto = respuesta.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text;
  if (!texto) throw new ErrorDeCliente("empty_completion", 502);
  try {
    return JSON.parse(texto);
  } catch {
    throw new ErrorDeCliente("invalid_json", 502);
  }
}

async function leer(cuerpo: unknown, env: Env): Promise<unknown> {
  const imagenes = (cuerpo as { imagenes?: unknown })?.imagenes;
  if (!Array.isArray(imagenes) || imagenes.length === 0 || imagenes.length > MAX_IMAGENES) {
    throw new ErrorDeCliente("invalid_request", 400);
  }
  const bloques: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const img of imagenes) {
    const { media_type, data } = (img ?? {}) as { media_type?: string; data?: string };
    if (typeof data !== "string" || data.length === 0 || data.length > MAX_BASE64_POR_IMAGEN) throw new ErrorDeCliente("image_rejected", 413);
    if (!TIPOS_IMAGEN.includes(media_type as TipoImagen)) throw new ErrorDeCliente("image_rejected", 415);
    bloques.push({ type: "image", source: { type: "base64", media_type: media_type as TipoImagen, data } });
  }
  bloques.push({ type: "text", text: prompts.INSTRUCCIONES_LECTURA });
  return preguntarAClaude(env, bloques, ESQUEMA_LECTURA);
}

async function clasificar(cuerpo: unknown, env: Env): Promise<unknown> {
  const textos = (cuerpo as { textos?: unknown })?.textos;
  if (!Array.isArray(textos) || textos.length === 0 || textos.length > MAX_TEXTOS) throw new ErrorDeCliente("invalid_request", 400);
  const limpios = textos.map((t) => String(t).replace(/\s+/g, " ").trim().slice(0, 200)).filter(Boolean);
  if (!limpios.length) throw new ErrorDeCliente("invalid_request", 400);
  const r = (await preguntarAClaude(env, [{ type: "text", text: prompts.promptClasificar(limpios) }], ESQUEMA_CLASIFICACION)) as { items?: unknown };
  return Array.isArray(r?.items) ? r.items : [];
}

export default {
  async fetch(peticion: Request, env: Env): Promise<Response> {
    const url = new URL(peticion.url);
    const cors = cabecerasCors(peticion.headers.get("Origin"), env);

    if (peticion.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (peticion.method === "GET" && url.pathname === "/salud") return json({ ok: true }, 200, cors);
    if (peticion.method !== "POST" || !["/leer", "/clasificar"].includes(url.pathname)) {
      return json({ error: "not_found" }, 404, cors);
    }
    if (!env.ANTHROPIC_API_KEY) return json({ error: "server_not_configured" }, 500, cors);

    // Límite de uso por IP para que nadie gaste tu saldo de la API
    if (env.LIMITE) {
      const ip = peticion.headers.get("CF-Connecting-IP") || "desconocida";
      const { success } = await env.LIMITE.limit({ key: ip });
      if (!success) return json({ error: "rate_limited" }, 429, cors);
    }

    try {
      const cuerpo = await peticion.json().catch(() => {
        throw new ErrorDeCliente("invalid_request", 400);
      });
      const resultado = url.pathname === "/leer" ? await leer(cuerpo, env) : await clasificar(cuerpo, env);
      return json(resultado, 200, cors);
    } catch (e) {
      if (e instanceof ErrorDeCliente) return json({ error: e.codigo }, e.estado, cors);
      if (e instanceof Anthropic.RateLimitError) return json({ error: "rate_limited" }, 429, cors);
      if (e instanceof Anthropic.BadRequestError) {
        console.error("Petición rechazada por la API:", e.message);
        return json({ error: "upstream_error" }, 502, cors);
      }
      if (e instanceof Anthropic.AuthenticationError) {
        console.error("Clave de API inválida");
        return json({ error: "server_not_configured" }, 500, cors);
      }
      if (e instanceof Anthropic.APIConnectionError) return json({ error: "upstream_error" }, 503, cors);
      if (e instanceof Anthropic.APIError) {
        console.error(`Error de la API ${e.status}:`, e.message);
        return json({ error: "upstream_error" }, 502, cors);
      }
      console.error("Error inesperado:", e);
      return json({ error: "upstream_error" }, 500, cors);
    }
  },
};
