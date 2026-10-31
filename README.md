# NutriLog

Sacás una foto de la lista de ingredientes de un alimento y NutriLog te dice si es **Recomendado, Poco recomendado o No recomendado** para tu salud. Te da una **nota del 0 al 10**, los motivos, los alérgenos y una explicación de cada ingrediente.

- Lee etiquetas de Argentina (códigos INS, vocabulario local) y de otros países hispanohablantes (códigos E).
- La foto la lee **Claude**. Sin conexión usa Tesseract, un lector dentro del teléfono, menos preciso.
- La nota la calcula la app con una base de datos de más de 120 ingredientes y aditivos. Los ingredientes desconocidos se los pregunta a Claude y los recuerda.

## Estructura

| Carpeta / archivo | Qué es |
|---|---|
| `index.html`, `css/`, `js/` | La app (HTML + JavaScript, sin frameworks) |
| `js/ingredientes-db.js` | Base de datos de ingredientes y aditivos |
| `js/analizador.js` | Lee la lista y calcula la nota (también corre en Node) |
| `js/prompts.js` | Instrucciones para Claude (las usan la app y el servidor) |
| `js/imagen.js` | Mejora la foto para el lector del teléfono |
| `servidor/` | Servidor (Cloudflare Worker) que llama a Claude sin poner la clave en la app |
| `ios/` | Proyecto de Xcode de la app de iPhone (Capacitor) |
| `herramientas/construir-www.mjs` | Arma `www/`, la versión que va dentro de la app (fuentes y lector incluidos) |
| `app-store/` | Textos y capturas para la App Store |
| `privacidad.html`, `soporte.html` | Páginas que pide Apple (se publican con GitHub Pages) |
| `PUBLICAR-EN-APP-STORE.md` | **Guía paso a paso para publicar** |

## Comandos

```bash
npm install
npm test          # pruebas del analizador
npm start         # la app web en http://localhost:8080
npm run build     # arma www/
npm run ios       # arma, copia al proyecto de iOS y abre Xcode (necesita un Mac)
```

> NutriLog es orientativa y no reemplaza a un profesional de la salud.
