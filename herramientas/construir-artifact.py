"""Genera una versión de un solo archivo (index.html + carpeta ocr/) que no depende de CDNs para el OCR.

Uso: python3 herramientas/construir-artifact.py <carpeta-salida> <node_modules con tesseract.js, tesseract.js-core y @tesseract.js-data/spa>
"""
import os, shutil, sys

raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
salida, nm = sys.argv[1], sys.argv[2]
os.makedirs(os.path.join(salida, "ocr"), exist_ok=True)

leer = lambda p: open(os.path.join(raiz, p), encoding="utf-8").read()
html, css = leer("index.html"), leer("css/estilos.css")

# Modo oscuro también con data-theme, y margen lateral seguro
oscuro = css[css.index("@media (prefers-color-scheme: dark) {\n  :root {"):]
oscuro = oscuro[: oscuro.index("}\n}\n") + 4]
tokens = oscuro[oscuro.index("{\n  :root {") + 11 : oscuro.index("  }\n}")]
css = css.replace(oscuro, "@media (prefers-color-scheme: dark) {\n  :root:not([data-theme=\"light\"]) {" + tokens + "    color-scheme: dark;\n  }\n}\n:root[data-theme=\"dark\"] {" + tokens + "  color-scheme: dark;\n}\n")
css = css.replace("padding: 0 16px; }", "padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }")
css = css.replace("color: #fff; padding: 28px 0 22px;", "color: #fff; padding-block: 28px 22px;")

FUENTES = "".join(l.strip() + "\n" for l in html.splitlines() if "fonts.g" in l)
cuerpo = html[html.index("<body>") + 6 : html.index("<script src=")].replace('<span aria-hidden="true">🥗</span> ', "")
ocr = """<script>
window.OCR_OPCIONES = {
  workerPath: new URL("ocr/worker.min.js", location.href).href,
  corePath: new URL("ocr/", location.href).href,
  langPath: new URL("ocr/", location.href).href,
  workerBlobURL: false,
};
</script>
"""
scripts = "".join("<script>\n" + leer(f) + "\n</script>\n" for f in ["js/ingredientes-db.js", "js/analizador.js", "js/prompts.js", "js/imagen.js", "js/app.js"])
pagina = ('<meta charset="utf-8">\n<title>NutriLog</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
          + FUENTES + "<style>\n" + css + "</style>\n" + cuerpo +
          '<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js"></script>\n' + ocr + scripts)
open(os.path.join(salida, "index.html"), "w", encoding="utf-8").write(pagina)

# El worker pide "spa.traineddata.gz"; lo servimos con una extensión permitida.
redir = '(function(){var f=self.fetch.bind(self);self.fetch=function(u,o){if(typeof u==="string"&&/spa\\.traineddata\\.gz$/.test(u))u=u.replace(/spa\\.traineddata\\.gz$/,"spa-traineddata.wasm");return f(u,o);};})();\n'
open(os.path.join(salida, "ocr/worker.min.js"), "w").write(redir + open(os.path.join(nm, "tesseract.js/dist/worker.min.js")).read())
for f in ["tesseract-core-simd-lstm.wasm.js", "tesseract-core-lstm.wasm.js"]:
    shutil.copy(os.path.join(nm, "tesseract.js-core", f), os.path.join(salida, "ocr", f))
shutil.copy(os.path.join(nm, "@tesseract.js-data/spa/4.0.0_best_int/spa.traineddata.gz"), os.path.join(salida, "ocr/spa-traineddata.wasm"))
print("Generado en", salida)
