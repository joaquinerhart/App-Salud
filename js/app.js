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
        if (m.status === "recognizing text") progreso(m.progress, mensajeLectura);
        else if (m.status) progreso(m.progress || 0, traducirEstado(m.status));
      },
    });
    return worker;
  }
  let mensajeLectura = "Leyendo texto…";

  function traducirEstado(s) {
    if (s.includes("loading")) return "Descargando el lector (sólo la primera vez)…";
    if (s.includes("initializ")) return "Iniciando el lector…";
    return "Procesando…";
  }

  function progreso(p, msg) {
    barra.style.width = Math.round((p || 0) * 100) + "%";
    txtProgreso.textContent = msg;
  }

  // ── Recorte ────────────────────────────────────────────────────────────
  const zonaRecorte = $("#zona-recorte");
  const lienzo = $("#lienzo-recorte");
  const ctxL = lienzo.getContext("2d");
  let imagenOriginal = null;
  let fuente = null; // imagen girada
  let giro = 0;
  let sel = { x: 0, y: 0, w: 1, h: 1 }; // selección en proporciones
  let arrastre = null;

  function cargarFuente() {
    fuente = Imagen.girar(imagenOriginal, giro);
    const ancho = Math.min(zonaRecorte.clientWidth || 600, 720);
    const altoMax = Math.max(260, window.innerHeight * 0.6);
    const esc = Math.min(ancho / fuente.width, altoMax / fuente.height);
    const dpr = window.devicePixelRatio || 1;
    lienzo.style.width = Math.round(fuente.width * esc) + "px";
    lienzo.style.height = Math.round(fuente.height * esc) + "px";
    lienzo.width = Math.round(fuente.width * esc * dpr);
    lienzo.height = Math.round(fuente.height * esc * dpr);
    dibujarRecorte();
  }

  function dibujarRecorte() {
    const W = lienzo.width, H = lienzo.height;
    ctxL.clearRect(0, 0, W, H);
    ctxL.drawImage(fuente, 0, 0, W, H);
    const x = sel.x * W, y = sel.y * H, w = sel.w * W, h = sel.h * H;
    ctxL.fillStyle = "rgba(0,0,0,.55)";
    ctxL.beginPath();
    ctxL.rect(0, 0, W, H);
    ctxL.rect(x, y, w, h);
    ctxL.fill("evenodd");
    const dpr = window.devicePixelRatio || 1;
    ctxL.strokeStyle = "#fff";
    ctxL.lineWidth = 2 * dpr;
    ctxL.strokeRect(x, y, w, h);
    const t = 14 * dpr;
    ctxL.fillStyle = "#fff";
    for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) ctxL.fillRect(cx - t / 2, cy - t / 2, t, t);
  }

  function puntoRel(e) {
    const r = lienzo.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
      rw: r.width, rh: r.height,
    };
  }

  lienzo.addEventListener("pointerdown", (e) => {
    if (!fuente) return;
    lienzo.setPointerCapture(e.pointerId);
    const p = puntoRel(e);
    const tolX = 24 / p.rw, tolY = 24 / p.rh;
    const esquinas = { nw: [sel.x, sel.y], ne: [sel.x + sel.w, sel.y], sw: [sel.x, sel.y + sel.h], se: [sel.x + sel.w, sel.y + sel.h] };
    for (const [k, [cx, cy]] of Object.entries(esquinas)) {
      if (Math.abs(p.x - cx) < tolX && Math.abs(p.y - cy) < tolY) { arrastre = { tipo: k, inicial: { ...sel } }; return; }
    }
    const dentro = p.x > sel.x && p.x < sel.x + sel.w && p.y > sel.y && p.y < sel.y + sel.h;
    const completa = sel.w > 0.98 && sel.h > 0.98;
    arrastre = dentro && !completa
      ? { tipo: "mover", origen: p, inicial: { ...sel } }
      : { tipo: "nuevo", origen: p };
  });

  lienzo.addEventListener("pointermove", (e) => {
    if (!arrastre) return;
    const p = puntoRel(e);
    if (arrastre.tipo === "nuevo") {
      const o = arrastre.origen;
      sel = { x: Math.min(o.x, p.x), y: Math.min(o.y, p.y), w: Math.abs(p.x - o.x), h: Math.abs(p.y - o.y) };
    } else if (arrastre.tipo === "mover") {
      const i = arrastre.inicial;
      sel.x = Math.min(1 - i.w, Math.max(0, i.x + p.x - arrastre.origen.x));
      sel.y = Math.min(1 - i.h, Math.max(0, i.y + p.y - arrastre.origen.y));
    } else {
      const i = arrastre.inicial;
      let x1 = i.x, y1 = i.y, x2 = i.x + i.w, y2 = i.y + i.h;
      if (arrastre.tipo.includes("n")) y1 = p.y; else y2 = p.y;
      if (arrastre.tipo.includes("w")) x1 = p.x; else x2 = p.x;
      sel = { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
    }
    dibujarRecorte();
  });

  const soltar = () => {
    if (arrastre && (sel.w < 0.03 || sel.h < 0.02)) sel = { x: 0, y: 0, w: 1, h: 1 }; // toque sin arrastrar
    arrastre = null;
    if (fuente) dibujarRecorte();
  };
  lienzo.addEventListener("pointerup", soltar);
  lienzo.addEventListener("pointercancel", soltar);

  $("#btn-girar").addEventListener("click", () => {
    giro = (giro + 90) % 360;
    sel = { x: 0, y: 0, w: 1, h: 1 };
    cargarFuente();
  });
  $("#btn-toda").addEventListener("click", () => { sel = { x: 0, y: 0, w: 1, h: 1 }; dibujarRecorte(); });
  $("#btn-leer").addEventListener("click", () => leerImagen());
  window.addEventListener("resize", () => { if (fuente && !zonaRecorte.hidden) cargarFuente(); });

  async function abrirImagen(archivo) {
    if (!archivo) return;
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      zonaOcr.hidden = false;
      progreso(0, "No se pudo abrir la imagen. Prueba con una foto en JPG o PNG.");
      return;
    }
    imagenOriginal = img;
    giro = 0;
    sel = { x: 0, y: 0, w: 1, h: 1 };
    zonaRecorte.hidden = false;
    zonaOcr.hidden = true;
    cargarFuente();
    zonaRecorte.scrollIntoView({ behavior: "smooth", block: "start" });
    obtenerWorker().catch(() => {}); // vamos cargando el lector mientras el usuario recorta
  }

  /** Puntúa una lectura: cuantos más ingredientes reconocidos y menos basura, mejor. */
  function puntuarLectura(textoLeido, confianza) {
    const r = Analizador.analizar(textoLeido);
    const exactos = r.ingredientes.filter((i) => !i.aproximado).length;
    const aprox = r.ingredientes.length - exactos;
    return {
      puntos: exactos * 10 + aprox * 6 - r.desconocidos.length * 3 + confianza / 10,
      ingredientes: r.ingredientes.length,
      desconocidos: r.desconocidos.length,
    };
  }

  async function leerImagen() {
    if (!fuente) return;
    zonaOcr.hidden = false;
    vista.src = lienzo.toDataURL("image/jpeg", 0.7);
    const btn = $("#btn-leer");
    btn.disabled = true;
    try {
      progreso(0, "Mejorando la imagen…");
      await new Promise((r) => setTimeout(r, 30)); // deja pintar el mensaje
      const recortada = !(sel.w > 0.98 && sel.h > 0.98);
      const { grises, binaria } = Imagen.prepararParaOcr(fuente, sel);
      const w = await obtenerWorker();

      // 1ª lectura: grises con la luz igualada (la que mejor funciona en general)
      mensajeLectura = "Leyendo texto…";
      await w.setParameters({ tessedit_pageseg_mode: recortada ? "6" : "3", preserve_interword_spaces: "1" });
      const l1 = (await w.recognize(grises)).data;
      let mejor = { texto: (l1.text || "").trim(), ...puntuarLectura(l1.text || "", l1.confidence || 0) };

      // 2ª lectura en blanco y negro sólo si la primera ha salido floja; nos quedamos con la mejor
      if (mejor.ingredientes < 4 || mejor.desconocidos > mejor.ingredientes * 0.25) {
        mensajeLectura = "Repasando con otra versión de la imagen…";
        await w.setParameters({ tessedit_pageseg_mode: recortada ? "6" : "3" });
        const l2 = (await w.recognize(binaria)).data;
        const p2 = puntuarLectura(l2.text || "", l2.confidence || 0);
        if (p2.puntos > mejor.puntos) mejor = { texto: (l2.text || "").trim(), ...p2 };
      }

      if (mejor.texto) {
        progreso(1, "¡Listo! Revisa el texto y corrige si hace falta.");
        texto.value = mejor.texto;
        zonaRecorte.hidden = true;
        analizarYMostrar();
      } else {
        progreso(0, "No se ha detectado texto. Marca sólo la lista de ingredientes o prueba con una foto más nítida.");
      }
    } catch (err) {
      console.error(err);
      progreso(0, "Error: " + (err.message || "no se pudo leer la imagen"));
    } finally {
      btn.disabled = false;
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
  $("#input-camara").addEventListener("change", (e) => abrirImagen(e.target.files[0]));
  $("#input-archivo").addEventListener("change", (e) => abrirImagen(e.target.files[0]));
  $("#btn-analizar").addEventListener("click", analizarYMostrar);
  $("#btn-ejemplo").addEventListener("click", () => { texto.value = EJEMPLO; analizarYMostrar(); });
  $("#btn-limpiar").addEventListener("click", () => {
    texto.value = "";
    secResultados.hidden = true;
    zonaOcr.hidden = true;
    zonaRecorte.hidden = true;
    $("#input-camara").value = "";
    $("#input-archivo").value = "";
    texto.focus();
  });
  document.querySelectorAll(".filtros .chip").forEach((b) => b.addEventListener("click", () => aplicarFiltro(b.dataset.filtro)));
  texto.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) analizarYMostrar();
  });
})();
