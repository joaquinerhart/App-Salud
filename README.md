# App Salud · Lector de ingredientes

Web app (funciona en el móvil) que **lee la lista de ingredientes de la etiqueta de un alimento** y te explica **qué es cada ingrediente y cómo afecta a tu salud**.

## Cómo funciona

1. **Haz una foto** de la etiqueta (o sube una imagen, o pega el texto).
2. El texto se lee con OCR ([Tesseract.js](https://github.com/naptha/tesseract.js)) **en tu propio dispositivo**: la imagen no se envía a ningún servidor.
3. Cada ingrediente se cruza con una base de datos de ~120 ingredientes y aditivos (incluidos los códigos E) y se muestra:
   - qué es y para qué se usa,
   - su efecto en la salud (según EFSA, OMS e IARC),
   - una valoración: **Beneficioso / Neutral / Con moderación / Mejor evitar**.
4. Resumen con puntuación 0-100, alérgenos (y trazas), azúcares añadidos "camuflados", aviso de ultraprocesado y de colorantes que afectan a la atención de los niños.

El texto leído se puede corregir antes de analizar, y el analizador tolera pequeños errores del OCR.

## Probarla

Es una página estática, no necesita servidor propio ni claves:

```bash
npm start          # sirve la carpeta en http://localhost:8080
# o simplemente: python3 -m http.server 8080
```

Para usarla desde el móvil, publícala con **GitHub Pages** (Settings → Pages → rama del proyecto, carpeta `/`).
La cámara del móvil requiere HTTPS (GitHub Pages ya lo da).

## Tests

```bash
npm test
```

## Estructura

- `index.html`: interfaz
- `css/estilos.css`: estilos (modo claro/oscuro)
- `js/ingredientes-db.js`: base de datos de ingredientes y aditivos
- `js/analizador.js`: extracción y análisis de la lista de ingredientes (funciona también en Node)
- `js/app.js`: cámara, OCR y pintado de resultados

> Información orientativa. No sustituye el consejo de un profesional sanitario.
