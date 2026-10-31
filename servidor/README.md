# Servidor de NutriLog

La app de iPhone necesita a Claude para leer las fotos de las etiquetas. La clave de la API de Claude **no puede ir dentro de la app**: cualquiera podría sacarla y gastar tu saldo. Por eso la app le pide la lectura a este pequeño servidor, que tiene la clave guardada como secreto.

Corre en **Cloudflare Workers**. El plan gratis incluye 100.000 pedidos por día.

## Qué hace

| Ruta | Para qué |
|---|---|
| `POST /leer` | Recibe hasta 3 imágenes (la foto y dos recortes) y devuelve la lista de ingredientes transcrita |
| `POST /clasificar` | Recibe nombres de ingredientes desconocidos y devuelve qué son y cómo afectan a la salud |
| `GET /salud` | Para comprobar que el servidor está andando |

- Las instrucciones para Claude son las de `../js/prompts.js`, las mismas que usa la app.
- Usa el modelo `claude-opus-5-5`. Si Claude rechaza un pedido, la API lo reintenta sola con el modelo de respaldo recomendado (`fallbacks: "default"`).
- **No guarda las fotos.**
- Limita a 15 lecturas por minuto por IP (en `wrangler.toml`) y solo acepta pedidos de la app (CORS).

## Instalarlo (una sola vez)

Necesitás [Node.js](https://nodejs.org) instalado.

1. Creá una cuenta gratis en [Cloudflare](https://dash.cloudflare.com/sign-up).
2. Creá una clave de API en [platform.claude.com](https://platform.claude.com) → API Keys, y cargá saldo en Billing.
3. En una terminal, dentro de esta carpeta:
   ```bash
   npm install
   npx wrangler login                        # abre el navegador para entrar a Cloudflare
   npx wrangler secret put ANTHROPIC_API_KEY # pegá la clave de Claude cuando la pida
   npx wrangler deploy
   ```
4. Al final te muestra la dirección del servidor, algo como `https://nutrilog-servidor.TU-USUARIO.workers.dev`.
5. Probá que ande abriendo `https://nutrilog-servidor.TU-USUARIO.workers.dev/salud` en el navegador. Tiene que mostrar `{"ok":true}`.
6. Pegá esa dirección en `../nutrilog.config.json`:
   ```json
   { "api": "https://nutrilog-servidor.TU-USUARIO.workers.dev" }
   ```

## Costo aproximado

Cada escaneo manda la foto en 3 imágenes a Claude. Con `claude-opus-5-5` cuesta del orden de **4 centavos de dólar** por escaneo, o sea unos US$ 40 cada 1.000 escaneos. Para ver el gasto real, entrá a platform.claude.com → Usage.

- Si querés gastar menos, podés probar otro modelo agregando `MODELO = "claude-sonnet-5-5"` en la sección `[vars]` de `wrangler.toml`. Antes de publicar, comprobá que siga leyendo bien tus etiquetas.
- En platform.claude.com → Limits podés poner un **tope de gasto mensual**, así nunca te llevás una sorpresa.

## Para probar en tu computadora

```bash
echo 'ANTHROPIC_API_KEY=tu-clave' > .dev.vars
npm run dev                    # queda en http://localhost:8787
npm run typecheck              # revisa los tipos
```
