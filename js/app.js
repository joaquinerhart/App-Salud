/* Interfaz: captura de imagen, OCR con Tesseract.js y pintado de resultados. */
(function () {
  const $ = (sel) => document.querySelector(sel);
  const texto = $("#texto-ingredientes");
  const zonaOcr = $("#zona-ocr");
  const vista = $("#vista-previa");
  const barra = $("#barra-progreso");
  const txtProgreso = $("#texto-progreso");
  const secResultados = $("#resultados");
  const lista = $("#lista-ingredientes");
  const plantilla = $("#plantilla-ingrediente");

  const EJEMPLO =
    "INGREDIENTES: Harina de trigo, azúcar, aceite de palma, jarabe de glucosa-fructosa, cacao desgrasado en polvo (4,5 %), " +
    "leche desnatada en polvo, sal, gasificantes (bicarbonato sódico, difosfatos), emulgentes (lecitina de soja, E-471), " +
    "aroma, colorante: caramelo (E150d), conservante: sorbato potásico. Puede contener trazas de avellanas y huevo.";

  const NIVELES = {
    bueno: "Beneficioso",
    neutral: "Neutral",
    moderar: "Con moderación",
    evitar: "Mejor evitar",
  };

  // ── OCR ────────────────────────────────────────────────────────────────
  let worker = null;
  async function obtenerWorker() {
    if (worker) return worker;
    if (!window.Tesseract) throw new Error("No se pudo cargar el lector de texto. Revisa tu conexión a internet.");
    worker = await Tesseract.createWorker("spa", 1, {
      ...(window.OCR_OPCIONES || {}), // permite servir el lector desde archivos propios
      logger: (m) => {
        if (m.status === "recognizing text") progreso(m.progress, "Leyendo texto…");
        else if (m.status) progreso(m.progress || 0, traducirEstado(m.status));
      },
    });
    return worker;
  }

  function traducirEstado(s) {
    if (s.includes("loading")) return "Descargando el lector (sólo la primera vez)…";
    if (s.includes("initializ")) return "Iniciando el lector…";
    return "Procesando…";
  }

  function progreso(p, msg) {
    barra.style.width = Math.round((p || 0) * 100) + "%";
    txtProgreso.textContent = msg;
  }

  /** Escala de grises + contraste + tamaño adecuado: mejora mucho el OCR en fotos de móvil. */
  function preprocesar(img) {
    const maxLado = 2000, minLado = 1200;
    let { naturalWidth: w, naturalHeight: h } = img;
    const lado = Math.max(w, h);
    const escala = lado > maxLado ? maxLado / lado : lado < minLado ? minLado / lado : 1;
    w = Math.round(w * escala); h = Math.round(h * escala);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const datos = ctx.getImageData(0, 0, w, h);
    const d = datos.data;
    let min = 255, max = 0;
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = g;
      if (g < min) min = g;
      if (g > max) max = g;
    }
    const rango = Math.max(1, max - min);
    for (let i = 0; i < d.length; i += 4) {
      const v = ((d[i] - min) / rango) * 255;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(datos, 0, 0);
    return c;
  }

  async function procesarImagen(archivo) {
    if (!archivo) return;
    const url = URL.createObjectURL(archivo);
    vista.src = url;
    zonaOcr.hidden = false;
    progreso(0, "Preparando…");
    try {
      await vista.decode();
      const lienzo = preprocesar(vista);
      const w = await obtenerWorker();
      const { data } = await w.recognize(lienzo);
      const leido = (data.text || "").trim();
      progreso(1, leido ? "¡Listo! Revisa el texto y corrige si hace falta." : "No se ha detectado texto. Prueba con otra foto más nítida.");
      if (leido) {
        texto.value = leido;
        analizarYMostrar();
      }
    } catch (err) {
      console.error(err);
      progreso(0, "Error: " + (err.message || "no se pudo leer la imagen"));
    }
  }

  // ── Resultados ─────────────────────────────────────────────────────────
  function el(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  function pintarResumen(r) {
    const { resumen, alergenos, trazas, ingredientes } = r;
    const cont = $("#resumen");
    cont.replaceChildren();

    const cab = el("div", "resumen-cabecera");
    const nota = el("div", "nota nivel-" + resumen.nivel);
    nota.append(el("span", "nota-num", ingredientes.length ? resumen.puntos : "–"), el("span", "nota-max", "/100"));
    const txt = el("div");
    txt.append(el("h2", null, resumen.veredicto));
    txt.append(el("p", "ayuda", `${ingredientes.length} ingredientes reconocidos${r.desconocidos.length ? `, ${r.desconocidos.length} sin identificar` : ""}.`));
    cab.append(nota, txt);
    cont.append(cab);

    // Barra de distribución
    const total = ingredientes.length || 1;
    const distrib = el("div", "distribucion");
    const leyenda = el("div", "distribucion-leyenda");
    for (const nivel of ["evitar", "moderar", "neutral", "bueno"]) {
      const n = resumen.conteo[nivel];
      if (!n) continue;
      const seg = el("span", "nivel-" + nivel);
      seg.style.flexGrow = n;
      seg.title = `${NIVELES[nivel]}: ${n}`;
      distrib.append(seg);
      const l = el("span");
      l.append(el("span", "punto nivel-" + nivel), document.createTextNode(` ${NIVELES[nivel]}: ${n}`));
      leyenda.append(l);
    }
    if (ingredientes.length) cont.append(distrib, leyenda);

    if (alergenos.length || trazas.length) {
      const box = el("div", "alergenos");
      box.append(el("strong", null, "⚠️ Alérgenos: "));
      for (const a of alergenos) box.append(el("span", "chip-alergeno", a));
      if (trazas.length) {
        box.append(el("span", "trazas", " Puede contener trazas de: "));
        for (const a of trazas) box.append(el("span", "chip-alergeno traza", a));
      }
      cont.append(box);
    }

    if (resumen.avisos.length) {
      const ul = el("ul", "avisos");
      for (const a of resumen.avisos) ul.append(el("li", null, a));
      cont.append(ul);
    }
  }

  function pintarIngredientes(r) {
    lista.replaceChildren();
    for (const ing of r.ingredientes) {
      const nodo = plantilla.content.firstElementChild.cloneNode(true);
      nodo.dataset.nivel = ing.nivel;
      const ins = nodo.querySelector(".insignia");
      ins.textContent = NIVELES[ing.nivel];
      ins.classList.add("nivel-" + ing.nivel);
      nodo.querySelector(".nombre").textContent = ing.nombre;
      const meta = [ing.categoria];
      if (ing.codigos.length) meta.push(ing.codigos.join(", "));
      else if (ing.e && ing.e.length === 1) meta.push(ing.e[0]);
      if (ing.alergeno) meta.push("Alérgeno: " + ing.alergeno);
      nodo.querySelector(".meta").textContent = meta.join(" · ");
      nodo.querySelector(".que span").textContent = ing.que;
      nodo.querySelector(".salud span").textContent = ing.salud;
      nodo.querySelector(".detectado").textContent =
        (ing.aproximado ? "Coincidencia aproximada con: " : "Detectado como: ") + ing.terminos.join(", ");
      lista.append(nodo);
    }
    if (!r.ingredientes.length) {
      lista.append(el("li", "vacio", "No se ha reconocido ningún ingrediente. Revisa el texto o prueba con otra foto."));
    }

    const desc = $("#desconocidos");
    desc.replaceChildren();
    if (r.desconocidos.length) {
      desc.append(el("h3", null, "No identificados"));
      desc.append(el("p", "ayuda", "No están en nuestra base de datos o el texto se leyó mal. Puedes corregirlos arriba y volver a analizar."));
      const ul = el("ul", "lista-desconocidos");
      for (const d of r.desconocidos) ul.append(el("li", null, d));
      desc.append(ul);
    }
    aplicarFiltro(filtroActual);
  }

  let filtroActual = "todos";
  function aplicarFiltro(f) {
    filtroActual = f;
    document.querySelectorAll(".filtros .chip").forEach((b) => b.classList.toggle("activo", b.dataset.filtro === f));
    lista.querySelectorAll(".ingrediente").forEach((li) => {
      li.hidden = f !== "todos" && li.dataset.nivel !== f;
    });
  }

  function analizarYMostrar() {
    const valor = texto.value.trim();
    if (!valor) { texto.focus(); return; }
    const r = Analizador.analizar(valor);
    pintarResumen(r);
    pintarIngredientes(r);
    secResultados.hidden = false;
    secResultados.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ── Eventos ────────────────────────────────────────────────────────────
  $("#input-camara").addEventListener("change", (e) => procesarImagen(e.target.files[0]));
  $("#input-archivo").addEventListener("change", (e) => procesarImagen(e.target.files[0]));
  $("#btn-analizar").addEventListener("click", analizarYMostrar);
  $("#btn-ejemplo").addEventListener("click", () => { texto.value = EJEMPLO; analizarYMostrar(); });
  $("#btn-limpiar").addEventListener("click", () => {
    texto.value = "";
    secResultados.hidden = true;
    zonaOcr.hidden = true;
    $("#input-camara").value = "";
    $("#input-archivo").value = "";
    texto.focus();
  });
  document.querySelectorAll(".filtros .chip").forEach((b) => b.addEventListener("click", () => aplicarFiltro(b.dataset.filtro)));
  texto.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) analizarYMostrar();
  });
})();
