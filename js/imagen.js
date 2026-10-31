/*
 * Tratamiento de la foto antes de leerla (OCR):
 *  - recorte y giro
 *  - ampliación del texto pequeño
 *  - escala de grises, contraste y corrección de texto claro sobre fondo oscuro
 *  - enderezado automático de fotos ligeramente torcidas
 *  - binarización adaptativa (corrige luz desigual y reflejos)
 */
(function (root) {
  /** Dibuja la imagen girada (0, 90, 180 o 270 grados) en un lienzo nuevo. */
  function girar(img, grados, maxLado = 4000) {
    const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
    const esc = Math.min(1, maxLado / Math.max(w0, h0));
    const w = Math.round(w0 * esc), h = Math.round(h0 * esc);
    const vertical = grados % 180 !== 0;
    const c = document.createElement("canvas");
    c.width = vertical ? h : w;
    c.height = vertical ? w : h;
    const ctx = c.getContext("2d");
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate((grados * Math.PI) / 180);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    return c;
  }

  /** Recorta (rect en proporciones 0..1) y escala para que el texto tenga un tamaño cómodo para el OCR. */
  function recortarYEscalar(fuente, rect) {
    const sx = Math.round(rect.x * fuente.width), sy = Math.round(rect.y * fuente.height);
    const sw = Math.max(1, Math.round(rect.w * fuente.width)), sh = Math.max(1, Math.round(rect.h * fuente.height));
    const objetivo = 2600; // lado largo deseado
    let esc = Math.min(3.5, Math.max(1, objetivo / Math.max(sw, sh)));
    const maxPix = 9e6;
    if (sw * sh * esc * esc > maxPix) esc = Math.sqrt(maxPix / (sw * sh));
    const c = document.createElement("canvas");
    c.width = Math.round(sw * esc);
    c.height = Math.round(sh * esc);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(fuente, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return c;
  }

  function aGrises(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h).data;
    const g = new Uint8ClampedArray(w * h);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) g[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    return g;
  }

  /** Estira el contraste usando percentiles (ignora reflejos y sombras puntuales). */
  function estirarContraste(g) {
    const hist = new Uint32Array(256);
    for (let i = 0; i < g.length; i++) hist[g[i]]++;
    const corte = g.length * 0.01;
    let lo = 0, hi = 255, acc = 0;
    for (; lo < 255; lo++) { acc += hist[lo]; if (acc > corte) break; }
    acc = 0;
    for (; hi > 0; hi--) { acc += hist[hi]; if (acc > corte) break; }
    const rango = Math.max(1, hi - lo);
    for (let i = 0; i < g.length; i++) g[i] = ((g[i] - lo) * 255) / rango;
    return g;
  }

  /** Si la mayor parte es oscura, el texto probablemente es claro: invertimos. */
  function invertirSiOscuro(g) {
    let suma = 0;
    for (let i = 0; i < g.length; i++) suma += g[i];
    if (suma / g.length < 110) for (let i = 0; i < g.length; i++) g[i] = 255 - g[i];
    return g;
  }

  /** Media local de cada píxel en una ventana de lado `s` (imagen integral). */
  function mediaLocal(g, w, h, s) {
    const integral = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      let fila = 0;
      for (let x = 0; x < w; x++) {
        fila += g[y * w + x];
        integral[(y + 1) * (w + 1) + (x + 1)] = integral[y * (w + 1) + (x + 1)] + fila;
      }
    }
    const media = new Float32Array(w * h);
    const r = s >> 1;
    for (let y = 0; y < h; y++) {
      const y1 = Math.max(0, y - r), y2 = Math.min(h - 1, y + r);
      for (let x = 0; x < w; x++) {
        const x1 = Math.max(0, x - r), x2 = Math.min(w - 1, x + r);
        const n = (x2 - x1 + 1) * (y2 - y1 + 1);
        media[y * w + x] = (integral[(y2 + 1) * (w + 1) + (x2 + 1)] - integral[y1 * (w + 1) + (x2 + 1)]
          - integral[(y2 + 1) * (w + 1) + x1] + integral[y1 * (w + 1) + x1]) / n;
      }
    }
    return media;
  }

  /** Corrige la luz desigual: divide cada píxel por el brillo de su entorno (fondo ≈ blanco). */
  function igualarIluminacion(g, w, h) {
    const s = Math.max(31, Math.round(Math.max(w, h) / 12)) | 1;
    const fondo = mediaLocal(g, w, h, s);
    const out = new Uint8ClampedArray(w * h);
    for (let i = 0; i < g.length; i++) out[i] = (g[i] / Math.max(1, fondo[i])) * 235;
    return estirarContraste(out);
  }

  /** Umbral adaptativo de Bradley-Roth: negro si es claramente más oscuro que su entorno. */
  function binarizar(g, w, h, t = 0.25) {
    const s = Math.max(15, Math.round(Math.max(w, h) / 32)) | 1;
    const media = mediaLocal(g, w, h, s);
    const out = new Uint8ClampedArray(w * h);
    for (let i = 0; i < g.length; i++) out[i] = g[i] < media[i] * (1 - t) ? 0 : 255;
    return out;
  }

  /** Estima el ángulo de inclinación del texto (grados) buscando las filas más "limpias". */
  function estimarInclinacion(bin, w, h) {
    // Trabajamos con una versión reducida para ir rápido
    const esc = Math.min(1, 700 / w);
    const pw = Math.max(1, Math.round(w * esc)), ph = Math.max(1, Math.round(h * esc));
    const puntos = [];
    for (let y = 0; y < ph; y++) {
      const oy = Math.min(h - 1, Math.round(y / esc));
      for (let x = 0; x < pw; x++) {
        if (bin[oy * w + Math.min(w - 1, Math.round(x / esc))] === 0) puntos.push(x, y);
      }
    }
    if (puntos.length < 50) return 0;
    const puntuar = (grados) => {
      const a = (grados * Math.PI) / 180, sin = Math.sin(a), cos = Math.cos(a);
      const filas = new Float64Array(ph * 2 + pw);
      const off = pw;
      for (let i = 0; i < puntos.length; i += 2) {
        const yr = Math.round(puntos[i + 1] * cos - puntos[i] * sin) + off;
        if (yr >= 0 && yr < filas.length) filas[yr]++;
      }
      let s = 0;
      for (let i = 0; i < filas.length; i++) s += filas[i] * filas[i];
      return s;
    };
    let mejor = 0, mejorS = -1;
    for (let a = -10; a <= 10; a += 1) { const s = puntuar(a); if (s > mejorS) { mejorS = s; mejor = a; } }
    const base = mejor;
    for (let a = base - 1; a <= base + 1; a += 0.2) { const s = puntuar(a); if (s > mejorS) { mejorS = s; mejor = a; } }
    return Math.abs(mejor) < 0.3 ? 0 : mejor;
  }

  function lienzoDesdeGrises(g, w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    const im = ctx.createImageData(w, h);
    for (let i = 0, j = 0; j < g.length; i += 4, j++) {
      im.data[i] = im.data[i + 1] = im.data[i + 2] = g[j];
      im.data[i + 3] = 255;
    }
    ctx.putImageData(im, 0, 0);
    return c;
  }

  function rotarLienzo(c, grados) {
    if (!grados) return c;
    const a = (grados * Math.PI) / 180;
    const sin = Math.abs(Math.sin(a)), cos = Math.abs(Math.cos(a));
    const w = Math.round(c.width * cos + c.height * sin), h = Math.round(c.width * sin + c.height * cos);
    const o = document.createElement("canvas");
    o.width = w; o.height = h;
    const ctx = o.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2);
    ctx.rotate(a);
    ctx.drawImage(c, -c.width / 2, -c.height / 2);
    return o;
  }

  /**
   * Prepara dos versiones de la imagen para el OCR:
   * `grises` (contraste mejorado) y `binaria` (blanco y negro adaptativo), ya enderezadas.
   */
  function prepararParaOcr(fuente, rect) {
    const c = recortarYEscalar(fuente, rect);
    const w = c.width, h = c.height;
    const g0 = invertirSiOscuro(estirarContraste(aGrises(c.getContext("2d", { willReadFrequently: true }), w, h)));
    const g = igualarIluminacion(g0, w, h);
    const bin = binarizar(g0, w, h, 0.25);
    const angulo = estimarInclinacion(bin, w, h);
    return {
      angulo,
      grises: rotarLienzo(lienzoDesdeGrises(g, w, h), -angulo),
      binaria: rotarLienzo(lienzoDesdeGrises(bin, w, h), -angulo),
    };
  }

  root.Imagen = { girar, prepararParaOcr, binarizar, estimarInclinacion };
})(typeof globalThis !== "undefined" ? globalThis : this);
