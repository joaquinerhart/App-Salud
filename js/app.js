/* Interfaz: foto → lectura (OCR) → resultado. */
(function () {
  const $ = (sel) => document.querySelector(sel);

  const pantallas = {
    inicio: $("#pantalla-inicio"),
    leyendo: $("#pantalla-leyendo"),
    recorte: $("#pantalla-recorte"),
    resultado: $("#pantalla-resultado"),
    acerca: $("#pantalla-acerca"),
  };
  function mostrar(nombre) {
    for (const [k, el] of Object.entries(pantallas)) el.hidden = k !== nombre;
    if (nombre === "inicio" && typeof pintarHistorial === "function") pintarHistorial();
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

  // ── Lector de texto (OCR) ──────────────────────────────────────────────
  let worker = null;
  let mensajeLectura = "Leyendo la etiqueta…";
  async function obtenerWorker() {
    if (worker) return worker;
    if (!window.Tesseract) throw new Error("No se pudo cargar el lector. Revisá tu conexión a internet.");
    worker = await Tesseract.createWorker("spa", 1, {
      ...(window.OCR_OPCIONES || {}), // permite servir el lector desde archivos propios
      logger: (m) => {
        if (m.status === "recognizing text") progreso(m.progress, mensajeLectura);
        else if (m.status && m.status.includes("load")) progreso(m.progress || 0, "Preparando el lector (solo la primera vez)…");
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
      alertaInicio("No se pudo abrir la foto. Probá con otra.");
      return;
    }
    imagenOriginal = img;
    giro = 0;
    sel = { x: 0, y: 0, w: 1, h: 1 };
    fuente = Imagen.girar(imagenOriginal, giro);
    $("#btn-recortar").hidden = false;
    await pedirConsentimiento();
    leerImagen();
  }

  function alertaInicio(msg) {
    mostrar("inicio");
    const p = document.createElement("p");
    p.className = "error";
    p.textContent = msg;
    pantallas.inicio.querySelector(".error")?.remove();
    pantallas.inicio.querySelector(".opciones").after(p);
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

  // ── Lectura con Claude ──────────────────────────────────────────────────
  // Claude lee fotos reales (borrosas, letra condensada, envases) mucho mejor que Tesseract.
  // Dos formas de llegar a Claude, con la misma interfaz { tipo, max, leer(imagenes, signal), clasificar(textos, signal) }:
  //  · "artifact": la app abierta dentro de Claude (usa la cuenta de quien la mira)
  //  · "servidor": la app de iPhone, a través del servidor de NutriLog (ver carpeta servidor/)
  const { INSTRUCCIONES_LECTURA, promptClasificar, ALERGENOS_VALIDOS } = window.NutriLogPrompts;
  const CONFIG = window.NUTRILOG_CONFIG || {};
  let lectorClaude = null;
  let claudeNoDisponible = false;
  let motivoSinClaude = ""; // por qué no se pudo usar Claude (se muestra en el resultado)

  function lectorArtifact(sample, max) {
    return {
      tipo: "artifact", max,
      leer: (imagenes, signal) => sample.json(INSTRUCCIONES_LECTURA, { images: imagenes, modelTier: "default", effort: "low", signal }),
      clasificar: (textos, signal) => sample.json(promptClasificar(textos), { modelTier: "default", effort: "low", signal }),
    };
  }

  const aBase64 = (blob) => new Promise((ok, mal) => {
    const fr = new FileReader();
    fr.onload = () => ok(String(fr.result).split(",")[1]);
    fr.onerror = () => mal(fr.error);
    fr.readAsDataURL(blob);
  });

  function lectorServidor(url) {
    const llamar = async (ruta, cuerpo, signal) => {
      const r = await fetch(url.replace(/\/$/, "") + ruta, {
        method: "POST", signal,
        headers: { "Content-Type": "application/json", "X-NutriLog-Version": "1" },
        body: JSON.stringify(cuerpo),
      });
      const datos = await r.json().catch(() => null);
      if (!r.ok) throw { code: (datos && datos.error) || "upstream_error", message: "HTTP " + r.status };
      return datos;
    };
    return {
      tipo: "servidor", max: 3,
      leer: async (imagenes, signal) => llamar("/leer", {
        imagenes: await Promise.all(imagenes.map(async (b) => ({ media_type: "image/jpeg", data: await aBase64(b) }))),
      }, signal),
      clasificar: (textos, signal) => llamar("/clasificar", { textos }, signal),
    };
  }

  function obtenerLectorClaude() {
    if (claudeNoDisponible) return Promise.resolve(null); // motivoSinClaude ya quedó guardado
    if (CONFIG.api) {
      if (!consentimientoDado()) { motivoSinClaude = "no aceptaste enviar fotos para leerlas con IA"; return Promise.resolve(null); }
      if (navigator.onLine === false) { motivoSinClaude = "no hay conexión a internet"; return Promise.resolve(null); }
      return Promise.resolve(lectorServidor(CONFIG.api));
    }
    if (!window.claude || typeof window.claude.use !== "function") {
      motivoSinClaude = "esta versión de la app no tiene acceso a Claude";
      return Promise.resolve(null);
    }
    // El resultado (y el motivo si no se puede) se calcula una vez y se reutiliza
    lectorClaude ??= window.claude.use("sample")
      .then(async (sample) => {
        if (!sample) { motivoArtifact = "Claude no está disponible en esta app"; return null; }
        const lim = await sample.limits().catch(() => null);
        if (!lim || !lim.images) { motivoArtifact = "esta app de Claude no permite enviar fotos (probá desde claude.ai en el navegador)"; return null; }
        return lectorArtifact(sample, lim.images.maxCount || 1);
      })
      .catch((e) => { motivoArtifact = "error al conectar con Claude (" + (e && (e.code || e.message)) + ")"; return null; });
    return lectorClaude.then((l) => { if (!l) motivoSinClaude = motivoArtifact; return l; });
  }
  let motivoArtifact = "";

  // Consentimiento para enviar fotos a un servicio de IA (lo pide Apple, guía 5.1.2)
  const CLAVE_CONSENTIMIENTO = "nutrilog-consentimiento-ia";
  function consentimientoDado() {
    try { return localStorage.getItem(CLAVE_CONSENTIMIENTO) === "si"; } catch { return false; }
  }
  function pedirConsentimiento() {
    if (!CONFIG.api || consentimientoDado()) return Promise.resolve(true);
    const dlg = $("#dialogo-consentimiento");
    if (!dlg || typeof dlg.showModal !== "function") return Promise.resolve(true);
    return new Promise((ok) => {
      dlg.addEventListener("close", () => {
        const si = dlg.returnValue === "si";
        if (si) { try { localStorage.setItem(CLAVE_CONSENTIMIENTO, "si"); } catch { /* sin almacenamiento */ } }
        ok(si);
      }, { once: true });
      dlg.showModal();
    });
  }

  // ── Ingredientes aprendidos: los que no estaban en la base y clasificó Claude ──
  const CLAVE_APRENDIDOS = "nutrilog-aprendidos";
  try { // migración desde el nombre anterior de la app
    for (const [viejo, nuevo] of [["app-salud-aprendidos", "nutrilog-aprendidos"], ["app-salud-historial", "nutrilog-historial"]]) {
      if (localStorage.getItem(viejo) && !localStorage.getItem(nuevo)) localStorage.setItem(nuevo, localStorage.getItem(viejo));
    }
  } catch { /* sin almacenamiento */ }
  function cargarAprendidos() {
    try {
      const d = JSON.parse(localStorage.getItem(CLAVE_APRENDIDOS) || "{}");
      Analizador.agregarIngredientes(d.ingredientes || []);
      Analizador.agregarIgnorados(d.ignorados || []);
    } catch { /* sin almacenamiento */ }
  }
  function guardarAprendidos(ingredientes, ignorados) {
    try {
      const d = JSON.parse(localStorage.getItem(CLAVE_APRENDIDOS) || "{}");
      d.ingredientes = [...(d.ingredientes || []), ...ingredientes].slice(-300);
      d.ignorados = [...(d.ignorados || []), ...ignorados].slice(-300);
      localStorage.setItem(CLAVE_APRENDIDOS, JSON.stringify(d));
    } catch { /* sin almacenamiento */ }
  }
  cargarAprendidos();

  const slug = (t) => Analizador.normalizar(t).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

  /** Pide a Claude que clasifique los ingredientes que no están en la base de datos. */
  async function clasificarDesconocidos(lector, desconocidos) {
    const lista = desconocidos.filter((d) => !/^E\d/.test(d)).slice(0, 25);
    if (!lista.length) return false;
    ctlClaude = new AbortController();
    const res = await lector.clasificar(lista, ctlClaude.signal);
    if (!Array.isArray(res)) return false;
    const nuevos = [], ignorados = [];
    for (const x of res) {
      if (!x || typeof x.original !== "string" || !x.original.trim()) continue;
      if (x.nivel === "ignorar") { ignorados.push(x.original); continue; }
      if (!["bueno", "neutral", "moderar", "evitar"].includes(x.nivel)) continue;
      nuevos.push({
        id: "aprendido-" + slug(x.original),
        nombre: String(x.nombre || x.original).slice(0, 80),
        alias: [x.original],
        categoria: String(x.categoria || "Otro").slice(0, 40),
        nivel: x.nivel,
        que: String(x.que || "").slice(0, 300),
        salud: String(x.salud || "").slice(0, 400),
        ...(ALERGENOS_VALIDOS.includes(x.alergeno) ? { alergeno: x.alergeno } : {}),
      });
    }
    Analizador.agregarIngredientes(nuevos);
    Analizador.agregarIgnorados(ignorados);
    guardarAprendidos(nuevos, ignorados);
    return nuevos.length + ignorados.length > 0;
  }
  obtenerLectorClaude(); // lo vamos preparando mientras el usuario saca la foto

  function recorteABlob(x, y, w, h, maxLado = 2400) {
    const sx = Math.round(x * fuente.width), sy = Math.round(y * fuente.height);
    const sw = Math.round(w * fuente.width), sh = Math.round(h * fuente.height);
    const esc = Math.min(1, maxLado / Math.max(sw, sh));
    const c = document.createElement("canvas");
    c.width = Math.round(sw * esc); c.height = Math.round(sh * esc);
    c.getContext("2d").drawImage(fuente, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return new Promise((r) => c.toBlob(r, "image/jpeg", 0.9));
  }

  let ctlClaude = null;
  async function leerConClaude(lector) {
    const imagenes = [await recorteABlob(sel.x, sel.y, sel.w, sel.h)];
    if (lector.max >= 3 && sel.h * fuente.height > 700) {
      imagenes.push(await recorteABlob(sel.x, sel.y, sel.w, sel.h * 0.55));
      imagenes.push(await recorteABlob(sel.x, sel.y + sel.h * 0.45, sel.w, sel.h * 0.55));
    }
    ctlClaude = new AbortController();
    return lector.leer(imagenes, ctlClaude.signal);
  }

  async function leerImagen() {
    if (!fuente) return;
    cancelado = false;
    vista.src = fuente.toDataURL("image/jpeg", 0.6);
    progreso(0, "Leyendo la etiqueta…");
    mostrar("leyendo");
    await new Promise((r) => setTimeout(r, 50)); // deja pintar la pantalla

    // 1º intento: Claude
    motivoSinClaude = "";
    const lector = await obtenerLectorClaude();
    if (lector && !cancelado) {
      barra.parentElement.classList.add("indeterminada");
      txtProgreso.textContent = "Claude está leyendo la etiqueta… (puede tardar unos segundos)";
      try {
        const r = await leerConClaude(lector);
        barra.parentElement.classList.remove("indeterminada");
        if (cancelado) return;
        const ing = r && typeof r.ingredientes === "string" ? r.ingredientes.trim() : "";
        if (!r || r.hayIngredientes === false || ing.length < 5) {
          alertaInicio("No encontramos una lista de ingredientes en la foto. Sacala de nuevo apuntando a la parte que dice «Ingredientes».");
          return;
        }
        producto = typeof r.producto === "string" ? r.producto.trim() : "";
        legibilidad = r.legibilidad;
        leidoPorClaude = true;
        motivoSinClaude = "";
        texto.value = /ingredient/i.test(ing.slice(0, 20)) ? ing : "Ingredientes: " + ing;

        // Ingredientes que no conocemos: se los preguntamos a Claude (y los recordamos)
        const previo = Analizador.analizar(texto.value, { leidoPorClaude: true });
        if (previo.desconocidos.length && !cancelado) {
          txtProgreso.textContent = "Analizando ingredientes poco comunes…";
          barra.parentElement.classList.add("indeterminada");
          try { await clasificarDesconocidos(lector, previo.desconocidos); }
          catch (e2) { if (e2 && e2.code === "cancelled") return; console.warn("No se pudieron clasificar:", e2 && e2.code); }
          barra.parentElement.classList.remove("indeterminada");
          if (cancelado) return;
        }
        analizarYMostrar();
        return;
      } catch (e) {
        barra.parentElement.classList.remove("indeterminada");
        if (cancelado || (e && e.code === "cancelled")) return;
        console.warn("Lectura con Claude no disponible:", e && e.code, e && e.message);
        motivoSinClaude = {
          not_granted: "no se dio permiso para usar Claude",
          sampling_disabled: "Claude no está habilitado en esta cuenta",
          images_unavailable: "esta app de Claude no permite enviar fotos (probá desde claude.ai en el navegador)",
          rate_limited: "se alcanzó el límite de uso de Claude por ahora",
          image_rejected: "Claude no pudo abrir esa foto",
          invalid_json: "Claude respondió en un formato inesperado",
          refused: "Claude no quiso procesar esa foto",
          session_expired: "la sesión de Claude expiró: volvé a iniciar sesión",
          server_not_configured: "el servidor de NutriLog no tiene configurada la clave de Claude",
          upstream_error: "el servicio de lectura no respondió; probá de nuevo en un rato",
          truncated: "la respuesta de Claude llegó incompleta",
        }[e && e.code] || "error de Claude (" + ((e && (e.code || e.message)) || "desconocido") + ")";
        if (e && ["not_granted", "sampling_disabled", "images_unavailable", "not_declared", "capability_disabled", "capability_removed"].includes(e.code)) {
          claudeNoDisponible = true;
        }
        // seguimos con el lector del teléfono
      }
    }

    // Respaldo: Tesseract en el propio teléfono
    try {
      progreso(0, "Leyendo la etiqueta…");
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

      producto = "";
      legibilidad = "";
      leidoPorClaude = false;
      texto.value = mejor.texto;
      if (!mejor.texto || !mejor.ingredientes) {
        alertaInicio("No pudimos leer los ingredientes. Acercate más a la lista, con buena luz, sin reflejos y con la foto bien enfocada."
          + (motivoSinClaude ? " (Se usó el lector del teléfono, menos preciso, porque " + motivoSinClaude + ".)" : ""));
        return;
      }
      analizarYMostrar();
    } catch (err) {
      console.error(err);
      if (!cancelado) alertaInicio("Error: " + (err.message || "no se pudo leer la foto"));
    }
  }
  let producto = "";
  let legibilidad = "";
  let leidoPorClaude = false; // el texto lo transcribió Claude (o lo escribió una persona): sin correcciones de OCR

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
  function svg(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }
  const SVG_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
  const SVG_OK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const SVG_DUDA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9a3 3 0 1 1 4.2 2.8c-.8.4-1.2 1-1.2 1.9V14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="18" r="1.4" fill="currentColor"/></svg>';
  const formatoNota = (n) => n.toLocaleString("es", { maximumFractionDigits: 1 });

  function pintarVeredicto(r) {
    const { resumen } = r;
    const v = $("#veredicto");
    v.replaceChildren();
    if (!r.fiable) {
      v.className = "veredicto nivel-neutral";
      v.append(
        Object.assign(el("div", "icono-grande"), { innerHTML: SVG_DUDA }),
        el("p", "veredicto-titulo", "No se pudo leer bien"),
        el("p", "veredicto-frase", "La foto no se leyó con claridad y preferimos no darte una nota que podría estar equivocada."),
        el("p", "veredicto-nota-lectura", "Sacá otra foto más de cerca, enfocada y con buena luz, o corregí el texto en «¿Se leyó mal la etiqueta?»."),
      );
      agregarNotaLector(v);
      return;
    }
    v.className = "veredicto nivel-" + resumen.nivel;
    if (producto) v.append(el("p", "veredicto-producto", producto));
    const anillo = el("div", "anillo");
    anillo.setAttribute("role", "img");
    anillo.setAttribute("aria-label", `Nota ${formatoNota(resumen.nota)} sobre 10`);
    anillo.append(svg('<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="pista" cx="60" cy="60" r="52"/><circle class="arco" cx="60" cy="60" r="52"/></svg>'));
    const centro = el("div", "anillo-centro");
    centro.append(el("span", "nota-num", formatoNota(resumen.nota)), el("span", "nota-max", "de 10"));
    anillo.append(centro);
    v.append(anillo, el("p", "veredicto-titulo", resumen.veredicto), el("p", "veredicto-frase", resumen.frase));
    if (legibilidad === "parcial" || legibilidad === "mala") {
      v.append(el("p", "veredicto-nota-lectura", "Parte de la etiqueta se veía borrosa: revisá la lista de ingredientes por las dudas."));
    }
    agregarNotaLector(v);
    // Animación del anillo hasta la nota
    const arco = anillo.querySelector(".arco");
    requestAnimationFrame(() => requestAnimationFrame(() => {
      arco.style.strokeDashoffset = String(326.7 * (1 - Math.max(0.02, resumen.nota / 10)));
    }));
  }

  /** Indica qué lector se usó y, si no se pudo usar Claude, por qué. */
  function agregarNotaLector(v) {
    if (!motivoSinClaude) return;
    v.append(el("p", "nota-lector", "Se usó el lector del teléfono, que es menos preciso, porque " + motivoSinClaude + "."));
  }

  function pintarContadores(r) {
    const c = $("#contadores");
    c.replaceChildren();
    c.hidden = !r.fiable;
    const { conteo } = r.resumen;
    for (const [nivel, etiqueta, n] of [["evitar", "Evitar", conteo.evitar], ["moderar", "Moderar", conteo.moderar], ["bueno", "Bien", conteo.bueno + conteo.neutral]]) {
      const d = el("div", "contador nivel-" + nivel);
      d.append(el("b", null, String(n)), el("span", null, etiqueta));
      c.append(d);
    }
  }

  function pintarMotivos(r) {
    const ul = $("#motivos");
    ul.replaceChildren();
    for (const m of r.resumen.motivos) {
      const li = el("li", "motivo motivo-" + m.tipo);
      const icono = el("span", m.tipo === "malo" ? "octogono" : "hoja");
      icono.innerHTML = m.tipo === "malo" ? SVG_X : SVG_OK;
      li.append(icono, el("span", null, m.texto));
      ul.append(li);
    }
    if (!r.resumen.motivos.length) ul.append(el("li", "motivo", "No hay ingredientes destacables, ni buenos ni malos."));

    const al = $("#alergenos");
    al.replaceChildren();
    al.hidden = !r.alergenos.length && !r.trazas.length;
    if (r.alergenos.length) {
      al.append(el("span", "alergenos-titulo", "Alérgenos"));
      for (const a of r.alergenos) al.append(el("span", "chip", a));
    }
    if (r.trazas.length) {
      al.append(el("span", "alergenos-titulo", "Puede contener"));
      for (const a of r.trazas) al.append(el("span", "chip traza", a));
    }

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
      nodo.classList.add("nivel-" + ing.nivel);
      nodo.querySelector(".nombre").textContent = ing.nombre;
      nodo.querySelector(".etiqueta-nivel").textContent = NIVELES[ing.nivel];
      nodo.querySelector(".que").textContent = ing.que;
      nodo.querySelector(".salud").textContent = ing.salud;
      lista.append(nodo);
    }
    $("#resumen-ingredientes").textContent = `Ver los ${r.ingredientes.length} ingredientes`;

    const desc = $("#desconocidos");
    desc.replaceChildren();
    if (r.desconocidos.length) desc.append(el("p", "ayuda", "No reconocidos: " + r.desconocidos.join(", ")));
  }

  // ── Historial (solo en este navegador) ─────────────────────────────────
  const CLAVE_HISTORIAL = "nutrilog-historial";
  function leerHistorial() {
    try { return JSON.parse(localStorage.getItem(CLAVE_HISTORIAL) || "[]").filter((h) => h && h.texto); } catch { return []; }
  }
  function guardarHistorial(items) {
    try { localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(items.slice(0, 8))); } catch { /* sin almacenamiento */ }
  }
  function agregarAlHistorial(r) {
    if (!r.fiable || esEjemplo) return;
    const titulo = producto || r.ingredientes.slice(0, 3).map((i) => i.nombre.split(" (")[0]).join(", ");
    const items = leerHistorial().filter((h) => h.texto !== texto.value);
    items.unshift({ titulo, producto, claude: leidoPorClaude, texto: texto.value, nota: r.resumen.nota, nivel: r.resumen.nivel, veredicto: r.resumen.veredicto, fecha: Date.now() });
    guardarHistorial(items);
  }
  function pintarHistorial() {
    const items = leerHistorial();
    const sec = $("#historial");
    sec.hidden = !items.length;
    const ul = $("#lista-historial");
    ul.replaceChildren();
    for (const h of items.slice(0, 5)) {
      const li = el("li");
      const b = el("button", "item-historial");
      b.type = "button";
      const mini = el("span", "mini-nota nivel-" + h.nivel, formatoNota(h.nota));
      const txt = el("span", "item-historial-texto");
      const fecha = new Date(h.fecha).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
      txt.append(el("span", "item-historial-titulo", h.titulo), el("span", "item-historial-meta", `${h.veredicto} · ${fecha}`));
      b.append(mini, txt);
      b.addEventListener("click", () => {
        texto.value = h.texto;
        leidoPorClaude = !!h.claude;
        motivoSinClaude = "";
        producto = h.producto || "";
        legibilidad = "";
        imagenOriginal = null;
        $("#btn-recortar").hidden = true;
        analizarYMostrar({ guardar: false });
      });
      li.append(b);
      ul.append(li);
    }
  }

  let esEjemplo = false;
  function analizarYMostrar({ guardar = true } = {}) {
    const valor = texto.value.trim();
    if (!valor) return;
    const r = Analizador.analizar(valor, { leidoPorClaude });
    if (!r.ingredientes.length) {
      alertaInicio("No reconocimos ningún ingrediente. Revisá el texto o probá con otra foto.");
      return;
    }
    pantallas.inicio.querySelector(".error")?.remove();
    for (const d of pantallas.resultado.querySelectorAll("details.plegable")) d.open = false;
    if (!r.fiable) $("#caja-corregir").open = true;
    $("#motivos-caja").hidden = !r.fiable;
    mostrar("resultado");
    pintarVeredicto(r);
    pintarContadores(r);
    pintarMotivos(r);
    pintarIngredientes(r);
    if (guardar) agregarAlHistorial(r);
    esEjemplo = false;
  }

  // ── Eventos ────────────────────────────────────────────────────────────
  const alElegir = (e) => { abrirImagen(e.target.files[0]); e.target.value = ""; };
  $("#input-camara").addEventListener("change", alElegir);
  $("#input-archivo").addEventListener("change", alElegir);
  $("#btn-escribir").addEventListener("click", (e) => {
    const z = $("#zona-escribir");
    z.hidden = !z.hidden;
    e.currentTarget.setAttribute("aria-expanded", String(!z.hidden));
    if (!z.hidden) $("#texto-manual").focus();
  });
  $("#btn-analizar-manual").addEventListener("click", () => {
    texto.value = $("#texto-manual").value;
    imagenOriginal = null;
    producto = ""; legibilidad = ""; leidoPorClaude = true; motivoSinClaude = "";
    $("#btn-recortar").hidden = true;
    analizarYMostrar();
  });
  $("#btn-ejemplo").addEventListener("click", () => {
    texto.value = EJEMPLO;
    esEjemplo = true;
    imagenOriginal = null;
    producto = ""; legibilidad = ""; leidoPorClaude = true; motivoSinClaude = "";
    $("#btn-recortar").hidden = true;
    analizarYMostrar();
  });
  // Si la persona corrigió el texto a mano, lo tomamos tal cual (sin correcciones de OCR)
  $("#btn-analizar").addEventListener("click", () => { legibilidad = ""; leidoPorClaude = true; analizarYMostrar(); });
  $("#btn-recortar").addEventListener("click", abrirRecorte);
  $("#btn-leer").addEventListener("click", leerImagen);
  $("#btn-girar").addEventListener("click", () => {
    giro = (giro + 90) % 360;
    sel = { x: 0, y: 0, w: 1, h: 1 };
    fuente = Imagen.girar(imagenOriginal, giro);
    cargarLienzo();
  });
  $("#btn-volver-resultado").addEventListener("click", () => mostrar("resultado"));
  $("#btn-inicio").addEventListener("click", () => { cancelado = true; ctlClaude?.abort(); mostrar("inicio"); });
  $("#btn-acerca").addEventListener("click", () => mostrar("acerca"));
  $("#btn-acerca-volver").addEventListener("click", () => mostrar("inicio"));
  $("#btn-borrar-historial").addEventListener("click", () => { guardarHistorial([]); pintarHistorial(); });
  pintarHistorial();
  $("#btn-cancelar").addEventListener("click", () => { cancelado = true; ctlClaude?.abort(); mostrar("inicio"); });
  $("#btn-otro").addEventListener("click", () => $("#input-camara").click());
  window.addEventListener("resize", () => { if (fuente && !pantallas.recorte.hidden) cargarLienzo(); });
})();
