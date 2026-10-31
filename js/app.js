/* Interfaz: foto → lectura (OCR) → resultado. */
(function () {
  const $ = (sel) => document.querySelector(sel);

  const pantallas = {
    inicio: $("#pantalla-inicio"),
    leyendo: $("#pantalla-leyendo"),
    recorte: $("#pantalla-recorte"),
    resultado: $("#pantalla-resultado"),
  };
  function mostrar(nombre) {
    for (const [k, el] of Object.entries(pantallas)) el.hidden = k !== nombre;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const texto = $("#texto-ingredientes");
  const vista = $("#vista-previa");
  const barra = $("#barra-progreso");
  const txtProgreso = $("#texto-progreso");

  const EJEMPLO =
    "INGREDIENTES: Harina de trigo, azúcar, aceite de palma, jarabe de glucosa-fructosa, cacao desgrasado en polvo (4,5 %), " +
    "leche desnatada en polvo, sal, gasificantes (bicarbonato sódico, difosfatos), emulgentes (lecitina de soja, E-471), " +
    "aroma, colorante: caramelo (E150d), conservante: sorbato potásico. Puede contener trazas de avellanas y huevo.";

  const NIVELES = { bueno: "Bueno", neutral: "Normal", moderar: "Moderar", evitar: "Evitar" };
  const ICONOS = { bueno: "✓", moderar: "!", evitar: "✕", neutral: "?" };

  // ── Lector de texto (OCR) ──────────────────────────────────────────────
  let worker = null;
  let mensajeLectura = "Leyendo la etiqueta…";
  async function obtenerWorker() {
    if (worker) return worker;
    if (!window.Tesseract) throw new Error("No se pudo cargar el lector. Revisa tu conexión a internet.");
    worker = await Tesseract.createWorker("spa", 1, {
      ...(window.OCR_OPCIONES || {}), // permite servir el lector desde archivos propios
      logger: (m) => {
        if (m.status === "recognizing text") progreso(m.progress, mensajeLectura);
        else if (m.status && m.status.includes("load")) progreso(m.progress || 0, "Preparando el lector (sólo la primera vez)…");
      },
    });
    return worker;
  }

  function progreso(p, msg) {
    barra.style.width = Math.round((p || 0) * 100) + "%";
    if (msg) txtProgreso.textContent = msg;
  }

  // ── Foto y recorte opcional ────────────────────────────────────────────
  const lienzo = $("#lienzo-recorte");
  const ctxL = lienzo.getContext("2d");
  let imagenOriginal = null;
  let fuente = null; // imagen girada
  let giro = 0;
  let sel = { x: 0, y: 0, w: 1, h: 1 }; // selección en proporciones
  let arrastre = null;
  let cancelado = false;

  async function abrirImagen(archivo) {
    if (!archivo) return;
    const img = new Image();
    img.src = URL.createObjectURL(archivo);
    try {
      await img.decode();
    } catch {
      alertaInicio("No se pudo abrir la foto. Prueba con otra.");
      return;
    }
    imagenOriginal = img;
    giro = 0;
    sel = { x: 0, y: 0, w: 1, h: 1 };
    fuente = Imagen.girar(imagenOriginal, giro);
    $("#btn-recortar").hidden = false;
    leerImagen();
  }

  function alertaInicio(msg) {
    mostrar("inicio");
    const p = document.createElement("p");
    p.className = "error";
    p.textContent = msg;
    pantallas.inicio.querySelector(".error")?.remove();
    pantallas.inicio.append(p);
  }

  function puntuarLectura(textoLeido, confianza) {
    const r = Analizador.analizar(textoLeido);
    const exactos = r.ingredientes.filter((i) => !i.aproximado).length;
    return {
      puntos: exactos * 10 + (r.ingredientes.length - exactos) * 6 - r.desconocidos.length * 3 + confianza / 10,
      ingredientes: r.ingredientes.length,
      desconocidos: r.desconocidos.length,
    };
  }

  async function leerImagen() {
    if (!fuente) return;
    cancelado = false;
    vista.src = fuente.toDataURL("image/jpeg", 0.6);
    progreso(0, "Leyendo la etiqueta…");
    mostrar("leyendo");
    try {
      await new Promise((r) => setTimeout(r, 50)); // deja pintar la pantalla
      const recortada = !(sel.w > 0.98 && sel.h > 0.98);
      const { grises, binaria } = Imagen.prepararParaOcr(fuente, sel);
      const w = await obtenerWorker();

      mensajeLectura = "Leyendo la etiqueta…";
      await w.setParameters({ tessedit_pageseg_mode: recortada ? "6" : "3", preserve_interword_spaces: "1" });
      const l1 = (await w.recognize(grises)).data;
      let mejor = { texto: (l1.text || "").trim(), ...puntuarLectura(l1.text || "", l1.confidence || 0) };

      // Segunda lectura sólo si la primera ha salido floja
      if (!cancelado && (mejor.ingredientes < 4 || mejor.desconocidos > mejor.ingredientes * 0.25)) {
        mensajeLectura = "Repasando la foto…";
        const l2 = (await w.recognize(binaria)).data;
        const p2 = puntuarLectura(l2.text || "", l2.confidence || 0);
        if (p2.puntos > mejor.puntos) mejor = { texto: (l2.text || "").trim(), ...p2 };
      }
      if (cancelado) return;

      if (!mejor.texto || !mejor.ingredientes) {
        texto.value = mejor.texto;
        alertaInicio("No hemos podido leer los ingredientes. Acércate más a la lista, con buena luz y sin reflejos.");
        return;
      }
      texto.value = mejor.texto;
      analizarYMostrar();
    } catch (err) {
      console.error(err);
      if (!cancelado) alertaInicio("Error: " + (err.message || "no se pudo leer la foto"));
    }
  }

  function abrirRecorte() {
    if (!imagenOriginal) return;
    mostrar("recorte");
    cargarLienzo();
  }

  function cargarLienzo() {
    const ancho = Math.min(pantallas.recorte.clientWidth || 600, 720);
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
    arrastre = dentro && !completa ? { tipo: "mover", origen: p, inicial: { ...sel } } : { tipo: "nuevo", origen: p };
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

  // ── Resultado ──────────────────────────────────────────────────────────
  function el(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  function pintarVeredicto(r) {
    const { resumen } = r;
    const v = $("#veredicto");
    v.className = "veredicto nivel-" + resumen.nivel;
    v.replaceChildren();
    const icono = el("div", "veredicto-icono", ICONOS[resumen.nivel]);
    icono.setAttribute("aria-hidden", "true");
    const nota = el("div", "veredicto-nota");
    nota.append(
      el("span", "nota-num", r.ingredientes.length ? resumen.nota.toLocaleString("es", { maximumFractionDigits: 1 }) : "–"),
      el("span", "nota-max", "/10"),
    );
    v.append(icono, el("p", "veredicto-titulo", resumen.veredicto), nota, el("p", "veredicto-frase", resumen.frase));
  }

  function pintarMotivos(r) {
    const ul = $("#motivos");
    ul.replaceChildren();
    for (const m of r.resumen.motivos) {
      const li = el("li", "motivo motivo-" + m.tipo);
      li.append(el("span", "motivo-icono", m.tipo === "malo" ? "✕" : "✓"), el("span", null, m.texto));
      ul.append(li);
    }
    if (!r.resumen.motivos.length) ul.append(el("li", "motivo", "No hay ingredientes destacables, ni buenos ni malos."));

    const al = $("#alergenos");
    al.hidden = !r.alergenos.length && !r.trazas.length;
    al.textContent = "";
    if (r.alergenos.length) al.append(el("strong", null, "Alérgenos: "), document.createTextNode(r.alergenos.join(", ") + ". "));
    if (r.trazas.length) al.append(el("strong", null, "Puede contener: "), document.createTextNode(r.trazas.join(", ") + "."));

    const av = $("#avisos");
    av.hidden = !r.resumen.avisos.length;
    av.textContent = r.resumen.avisos.join(" ");
  }

  function pintarIngredientes(r) {
    const lista = $("#lista-ingredientes");
    lista.replaceChildren();
    const plantilla = $("#plantilla-ingrediente");
    for (const ing of r.ingredientes) {
      const nodo = plantilla.content.firstElementChild.cloneNode(true);
      nodo.querySelector(".punto").classList.add("nivel-" + ing.nivel);
      nodo.querySelector(".nombre").textContent = ing.nombre;
      const et = nodo.querySelector(".etiqueta-nivel");
      et.textContent = NIVELES[ing.nivel];
      et.classList.add("nivel-" + ing.nivel);
      nodo.querySelector(".que").textContent = ing.que;
      nodo.querySelector(".salud").textContent = ing.salud;
      lista.append(nodo);
    }
    $("#resumen-ingredientes").textContent = `Ver los ${r.ingredientes.length} ingredientes`;

    const desc = $("#desconocidos");
    desc.replaceChildren();
    if (r.desconocidos.length) {
      desc.append(el("p", "ayuda", "No reconocidos: " + r.desconocidos.join(", ")));
    }
  }

  function analizarYMostrar() {
    const valor = texto.value.trim();
    if (!valor) return;
    const r = Analizador.analizar(valor);
    if (!r.ingredientes.length) {
      alertaInicio("No hemos reconocido ningún ingrediente. Revisa el texto o prueba con otra foto.");
      return;
    }
    pantallas.inicio.querySelector(".error")?.remove();
    pintarVeredicto(r);
    pintarMotivos(r);
    pintarIngredientes(r);
    for (const d of pantallas.resultado.querySelectorAll("details.plegable")) d.open = false;
    mostrar("resultado");
  }

  // ── Eventos ────────────────────────────────────────────────────────────
  const alElegir = (e) => { abrirImagen(e.target.files[0]); e.target.value = ""; };
  $("#input-camara").addEventListener("change", alElegir);
  $("#input-archivo").addEventListener("change", alElegir);
  $("#btn-escribir").addEventListener("click", () => {
    const z = $("#zona-escribir");
    z.hidden = !z.hidden;
    if (!z.hidden) $("#texto-manual").focus();
  });
  $("#btn-analizar-manual").addEventListener("click", () => {
    texto.value = $("#texto-manual").value;
    imagenOriginal = null;
    $("#btn-recortar").hidden = true;
    analizarYMostrar();
  });
  $("#btn-ejemplo").addEventListener("click", () => {
    texto.value = EJEMPLO;
    imagenOriginal = null;
    $("#btn-recortar").hidden = true;
    analizarYMostrar();
  });
  $("#btn-analizar").addEventListener("click", analizarYMostrar);
  $("#btn-recortar").addEventListener("click", abrirRecorte);
  $("#btn-leer").addEventListener("click", leerImagen);
  $("#btn-girar").addEventListener("click", () => {
    giro = (giro + 90) % 360;
    sel = { x: 0, y: 0, w: 1, h: 1 };
    fuente = Imagen.girar(imagenOriginal, giro);
    cargarLienzo();
  });
  $("#btn-volver-resultado").addEventListener("click", () => mostrar("resultado"));
  $("#btn-cancelar").addEventListener("click", () => { cancelado = true; mostrar("inicio"); });
  $("#btn-otro").addEventListener("click", () => $("#input-camara").click());
  window.addEventListener("resize", () => { if (fuente && !pantallas.recorte.hidden) cargarLienzo(); });
})();
