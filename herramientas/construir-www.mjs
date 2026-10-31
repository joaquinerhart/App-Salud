// Arma la carpeta www/ que se empaqueta dentro de la app de iPhone (Capacitor).
// Todo va incluido en la app: fuentes, lector de texto (OCR) y datos. Nada se descarga de otros sitios.
//
// Uso: npm run build
// La dirección del servidor se toma de nutrilog.config.json o de la variable NUTRILOG_API.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const www = path.join(raiz, "www");
const nm = path.join(raiz, "node_modules");
const copiar = (de, a) => { fs.mkdirSync(path.dirname(a), { recursive: true }); fs.cpSync(de, a, { recursive: true }); };

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });

// 1) Código y estilos de la app
for (const f of ["css", "js", "icon.svg", "manifest.webmanifest"]) copiar(path.join(raiz, f), path.join(www, f));

// 2) Fuentes (sin Google Fonts: funcionan sin internet y no se avisa a terceros)
for (const paquete of ["bricolage-grotesque", "figtree"]) {
  const origen = path.join(nm, "@fontsource-variable", paquete);
  copiar(path.join(origen, "files"), path.join(www, "fuentes", "files"));
  fs.writeFileSync(path.join(www, "fuentes", paquete + ".css"), fs.readFileSync(path.join(origen, "index.css")));
}

// 3) Lector de texto del teléfono (Tesseract) y datos en español
copiar(path.join(nm, "tesseract.js/dist/tesseract.min.js"), path.join(www, "ocr/tesseract.min.js"));
copiar(path.join(nm, "tesseract.js/dist/worker.min.js"), path.join(www, "ocr/worker.min.js"));
for (const f of ["tesseract-core-simd-lstm.wasm.js", "tesseract-core-lstm.wasm.js"]) {
  copiar(path.join(nm, "tesseract.js-core", f), path.join(www, "ocr", f));
}
const datosSpa = fs.readdirSync(path.join(nm, "@tesseract.js-data/spa")).find((d) => d.endsWith("best_int"))
  || fs.readdirSync(path.join(nm, "@tesseract.js-data/spa")).find((d) => /^\d/.test(d));
copiar(path.join(nm, "@tesseract.js-data/spa", datosSpa, "spa.traineddata.gz"), path.join(www, "ocr/spa.traineddata.gz"));

// 4) Configuración (dirección del servidor de NutriLog)
let config = {};
try { config = JSON.parse(fs.readFileSync(path.join(raiz, "nutrilog.config.json"), "utf8")); } catch { /* sin archivo */ }
if (process.env.NUTRILOG_API) config.api = process.env.NUTRILOG_API;
if (!config.api) console.warn("⚠️  Falta la dirección del servidor (nutrilog.config.json → \"api\"). La app usará solo el lector del teléfono.");
fs.writeFileSync(path.join(www, "config.js"),
  `window.NUTRILOG_CONFIG = ${JSON.stringify({ api: config.api || "" })};\n` +
  `window.OCR_OPCIONES = { workerPath: new URL("ocr/worker.min.js", location.href).href, corePath: new URL("ocr/", location.href).href, langPath: new URL("ocr/", location.href).href, workerBlobURL: false };\n`);

// 5) index.html adaptado: fuentes y OCR locales, configuración primero
let html = fs.readFileSync(path.join(raiz, "index.html"), "utf8");
html = html
  .split("\n").filter((l) => !l.includes("fonts.googleapis.com") && !l.includes("fonts.gstatic.com")).join("\n")
  .replace('<link rel="stylesheet" href="css/estilos.css">',
    '<link rel="stylesheet" href="fuentes/bricolage-grotesque.css">\n  <link rel="stylesheet" href="fuentes/figtree.css">\n  <link rel="stylesheet" href="css/estilos.css">')
  .replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/tesseract\.js@[^"]+" defer><\/script>/,
    '<script src="config.js"></script>\n  <script src="ocr/tesseract.min.js" defer></script>')
  .replace('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">');
if (html.includes("cdn.jsdelivr") || html.includes("fonts.googleapis")) throw new Error("Quedó una dependencia externa en index.html");
fs.writeFileSync(path.join(www, "index.html"), html);

const tam = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? tam(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log(`✓ www/ lista (${(tam(www) / 1e6).toFixed(1)} MB). Servidor: ${config.api || "(sin configurar)"}`);
