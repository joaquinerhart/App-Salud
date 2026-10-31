/*
 * Motor de análisis: recibe el texto de una etiqueta (tecleado o leído por OCR),
 * localiza la lista de ingredientes y la cruza con la base de datos.
 */
(function (root) {
  const db = typeof window === "undefined" && typeof module !== "undefined"
    ? require("./ingredientes-db.js")
    : root.SaludDB;

  const NIVELES = {
    bueno: { etiqueta: "Beneficioso", orden: 0 },
    neutral: { etiqueta: "Neutral", orden: 1 },
    moderar: { etiqueta: "Con moderación", orden: 2 },
    evitar: { etiqueta: "Mejor evitar", orden: 3 },
  };

  /** Minúsculas, sin acentos, guiones como espacios y espacios compactados. */
  function normalizar(texto) {
    return String(texto)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[’'`´]/g, "")
      .replace(/[-‐‑–—_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const esLetraODigito = (c) => c !== undefined && /[a-z0-9ñ]/.test(c);

  // ── Índices precalculados ──────────────────────────────────────────────
  const indiceAlias = [];
  const indiceE = new Map();
  for (const ing of db.INGREDIENTES) {
    for (const a of ing.alias) {
      const n = normalizar(a);
      if (n) indiceAlias.push({ alias: n, ing });
    }
    for (const code of ing.e || []) indiceE.set(code.toUpperCase(), ing);
  }
  indiceAlias.sort((x, y) => y.alias.length - x.alias.length);
  // Palabras sueltas que delatan un alérgeno dentro de otro ingrediente ("lecitina de soja", "almidón de trigo")
  const palabraAlergeno = new Map();
  for (const ing of db.INGREDIENTES) {
    if (!ing.alergeno) continue;
    for (const a of ing.alias) { const n = normalizar(a); if (!n.includes(" ") && n.length >= 4) palabraAlergeno.set(n, ing.alergeno); }
  }
  const palabrasFuncion = new Set(db.PALABRAS_FUNCION.map(normalizar));
  const funcionesOrdenadas = [...palabrasFuncion].sort((a, b) => b.length - a.length);

  // Vocabulario de palabras conocidas para corregir errores de lectura (OCR)
  const vocabulario = new Set();
  for (const { alias } of indiceAlias) for (const w of alias.split(" ")) if (w.length >= 3) vocabulario.add(w);
  for (const f of palabrasFuncion) for (const w of f.split(" ")) if (w.length >= 3) vocabulario.add(w);
  for (const w of ["polvo", "parcialmente", "natural", "naturales", "acido", "acidos", "sodio", "potasio", "calcio",
    "variable", "proporcion", "origen", "vegetal", "vegetales", "concentrado", "deshidratado", "deshidratada",
    "contiene", "puede", "trazas", "elaborado", "fabrica", "producto", "procedente", "total", "cobertura"]) vocabulario.add(w);
  const vocabPorLongitud = new Map();
  for (const w of vocabulario) {
    if (!vocabPorLongitud.has(w.length)) vocabPorLongitud.set(w.length, []);
    vocabPorLongitud.get(w.length).push(w);
  }
  const cacheCorreccion = new Map();

  /** Devuelve la palabra conocida más parecida, o null si no hay una clara. */
  function corregirPalabra(w) {
    if (w.length < 4 || vocabulario.has(w) || /\d/.test(w)) return null;
    if (cacheCorreccion.has(w)) return cacheCorreccion.get(w);
    const tol = w.length >= 8 ? 2 : 1;
    let mejor = null, mejorD = Infinity, empate = false;
    for (let len = w.length - tol; len <= w.length + tol; len++) {
      for (const v of vocabPorLongitud.get(len) || []) {
        const d = levenshtein(w, v);
        if (d > tol) continue;
        if (d < mejorD) { mejor = v; mejorD = d; empate = false; }
        else if (d === mejorD && v !== mejor) empate = true;
      }
    }
    const r = mejor && !empate ? mejor : null;
    cacheCorreccion.set(w, r);
    return r;
  }

  function corregirFragmento(s) {
    const corregidas = new Set();
    const texto = s.split(" ").map((w) => {
      const c = corregirPalabra(w);
      if (c) { corregidas.add(c); return c; }
      return w;
    }).join(" ");
    return { texto, corregidas };
  }

  /** Arreglos típicos de lectura: | por l, 0/1 dentro de palabras, letras en códigos E. */
  function corregirOCR(t) {
    return String(t)
      .replace(/[|¦]/g, "l")
      .replace(/(\p{L})0(?=\p{L})/gu, "$1o")
      .replace(/(\p{L})1(?=\p{L})/gu, "$1l")
      .replace(/\b([EeÉé])\s?[-–.]?\s?([0-9OoIlSB]{3,4})([a-fA-F]?)\b/g, (m, e, num, letra) => {
        const digitos = num.replace(/[Oo]/g, "0").replace(/[Il]/g, "1").replace(/S/g, "5").replace(/B/g, "8");
        if (!/^\d+$/.test(digitos) || (num.match(/\d/g) || []).length < 2) return m;
        return "E" + digitos + letra.toLowerCase();
      });
  }

  function buscarCodigoE(code) {
    code = code.toUpperCase();
    if (indiceE.has(code)) return indiceE.get(code);
    const base = code.replace(/[A-Z]$/, "");
    if (indiceE.has(base)) return indiceE.get(base);
    // "E1500" suele ser "E150d" mal leído: probamos con los tres primeros dígitos
    if (/^E\d{4}$/.test(base) && indiceE.has(base.slice(0, 4))) return indiceE.get(base.slice(0, 4));
    return null;
  }

  // ── Preparación del texto ──────────────────────────────────────────────
  const MARCAS_FIN = [
    "informacion nutricional", "valores nutricionales", "valor nutricional", "valor energetico",
    "declaracion nutricional", "conservar en", "consumir preferentemente", "fecha de caducidad",
    "modo de empleo", "modo de preparacion", "instrucciones de uso", "fabricado por", "elaborado por",
    "envasado por", "distribuido por", "peso neto", "contenido neto", "una vez abierto", "por 100 g",
    "por 100g", "por 100 ml",
  ];

  /**
   * Devuelve { lista, trazas } con el fragmento de ingredientes y,
   * si existe, el texto de "puede contener trazas de …".
   */
  function extraerIngredientes(textoOriginal) {
    let t = corregirOCR(textoOriginal)
      .replace(/(\p{L})-\s*\n\s*(\p{L})/gu, "$1$2") // palabras partidas por el OCR
      .replace(/\s*\n\s*/g, " ");

    const n = normalizar(t);
    // normalizar() no conserva posiciones, así que buscamos sobre una versión
    // del original con la misma longitud (sólo minúsculas y sin acentos letra a letra).
    const espejo = [...t].map((c) => normalizar(c) || " ").join("");
    if (espejo.length !== t.length) {
      // caso raro (caracteres compuestos): trabajamos con el texto normalizado
      t = n;
    }
    const base = espejo.length === t.length ? espejo : n;

    // Palabras con su posición, para buscar las palabras clave aunque estén mal leídas
    const palabras = [];
    for (const m of base.matchAll(/[a-z0-9ñ]+/g)) palabras.push({ w: m[0], i: m.index, f: m.index + m[0].length });
    const parecida = (w, objetivo, tol) => Math.abs(w.length - objetivo.length) <= tol && levenshtein(w, objetivo) <= tol;

    let inicio = 0;
    const cab = palabras.find((p) => parecida(p.w, "ingredientes", 3) || parecida(p.w, "ingrediente", 2)
      || (/(dientes|ientes|edientes)$/.test(p.w) && parecida(p.w, "ingredientes", 4)));
    if (cab) {
      inicio = cab.f;
      while (inicio < base.length && /[\s:.;]/.test(base[inicio])) inicio++;
    }

    let fin = t.length;
    for (const marca of MARCAS_FIN) {
      const i = base.indexOf(marca, inicio);
      if (i !== -1 && i < fin) fin = i;
    }
    for (let k = 0; k < palabras.length; k++) {
      const p = palabras[k];
      if (p.i < inicio || p.i >= fin) continue;
      if (parecida(p.w, "nutricional", 3) || parecida(p.w, "nutricionales", 3) || parecida(p.w, "energetico", 2)) {
        const previa = palabras[k - 1];
        fin = previa && previa.i >= inicio && (parecida(previa.w, "informacion", 3) || parecida(previa.w, "valor", 1) || parecida(previa.w, "valores", 2) || parecida(previa.w, "declaracion", 3)) ? previa.i : p.i;
        break;
      }
    }

    let lista = t.slice(inicio, fin);

    // "Puede contener (trazas de) …" o "trazas de …", tolerando errores de lectura
    let trazas = "";
    let iTr = -1, fTr = -1;
    for (let k = 0; k < palabras.length; k++) {
      const p = palabras[k];
      if (p.i < inicio || p.i >= fin) continue;
      const sig = palabras[k + 1], sig2 = palabras[k + 2];
      if (sig && parecida(p.w, "puede", 1) && parecida(sig.w, "contener", 2)) {
        iTr = p.i; fTr = sig.f;
        const s2 = palabras[k + 2], s3 = palabras[k + 3];
        if (s2 && parecida(s2.w, "trazas", 2)) { fTr = s2.f; if (s3 && s3.w === "de") fTr = s3.f; }
        else if (s2 && s2.w === "de") fTr = s2.f;
        break;
      }
      if (sig && (parecida(p.w, "trazas", 2) || parecida(p.w, "traza", 1)) && sig.w === "de") {
        iTr = p.i; fTr = sig.f;
        if (k > 0 && parecida(palabras[k - 1].w, "contiene", 2)) iTr = palabras[k - 1].i;
        break;
      }
      void sig2;
    }
    if (iTr !== -1) {
      const a = iTr - inicio, b = fTr - inicio;
      const resto = lista.slice(b);
      // Suele ser la última frase; si tras el punto queda poco texto, también es parte de las trazas
      // (el OCR a menudo convierte comas en puntos).
      let finTr = resto.search(/\.\s|\.$|$/);
      if (resto.length - finTr < 120) finTr = resto.length;
      trazas = resto.slice(0, finTr);
      lista = lista.slice(0, a) + " " + resto.slice(trazas.length);
    }
    return { lista: lista.trim(), trazas: trazas.trim() };
  }

  /** Parte la lista en fragmentos simples. */
  function trocear(lista) {
    return lista
      .replace(/\d+(?:[.,]\d+)?\s*%/g, " ") // porcentajes "12,5 %"
      .split(/[,;()\[\]{}:•·\/|*]|\.(?=\s|$)|\s+y\s+(?=e\s?-?\d{3})/i)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  }

  function quitarFuncionInicial(s) {
    for (const f of funcionesOrdenadas) {
      if (s.startsWith(f + " ")) return s.slice(f.length + 1).trim();
    }
    return s;
  }

  /** Busca coincidencias de alias y códigos E dentro de un fragmento normalizado. */
  function buscarEnFragmento(s) {
    const encontrados = [];
    const cubierto = new Array(s.length).fill(false);

    // Códigos E primero (son inequívocos)
    const reE = /\be ?(\d{3,4})([a-f])?(?![a-z0-9])/g;
    let m;
    while ((m = reE.exec(s))) {
      const code = "E" + m[1] + (m[2] || "");
      const ing = buscarCodigoE(code);
      for (let k = m.index; k < m.index + m[0].length; k++) cubierto[k] = true;
      encontrados.push({ ing, termino: code, pos: m.index, codigo: code });
    }

    for (const { alias, ing } of indiceAlias) {
      let desde = 0, i;
      while ((i = s.indexOf(alias, desde)) !== -1) {
        desde = i + 1;
        const fin = i + alias.length;
        if (esLetraODigito(s[i - 1]) || esLetraODigito(s[fin])) continue;
        let libre = true;
        for (let k = i; k < fin; k++) if (cubierto[k]) { libre = false; break; }
        if (!libre) continue;
        if (/\bsin $/.test(s.slice(Math.max(0, i - 4), i))) continue; // "sin gluten"
        for (let k = i; k < fin; k++) cubierto[k] = true;
        encontrados.push({ ing, termino: alias, pos: i });
      }
    }
    return encontrados.sort((a, b) => a.pos - b.pos);
  }

  function buscarAproximado(s) {
    if (s.length < 5) return null;
    const tolerancia = s.length >= 9 ? 2 : 1;
    let mejor = null;
    for (const { alias, ing } of indiceAlias) {
      if (alias.length < 5 || Math.abs(alias.length - s.length) > tolerancia) continue;
      const d = levenshtein(s, alias);
      if (d <= tolerancia && (!mejor || d < mejor.d)) mejor = { d, ing, alias };
    }
    return mejor;
  }

  /**
   * Analiza el texto de una etiqueta.
   * @returns {{ingredientes: Array, desconocidos: string[], trazas: Array, alergenos: string[], resumen: object}}
   */
  function analizar(texto) {
    const { lista, trazas } = extraerIngredientes(texto);
    const porId = new Map();
    const resultados = [];
    const desconocidos = [];
    let orden = 0;

    const anotar = (ing, termino, extra = {}) => {
      if (porId.has(ing.id)) {
        const r = porId.get(ing.id);
        if (!r.terminos.includes(termino)) r.terminos.push(termino);
        if (extra.codigo && !r.codigos.includes(extra.codigo)) r.codigos.push(extra.codigo);
        return;
      }
      const r = {
        ...ing,
        posicion: orden++,
        terminos: [termino],
        codigos: extra.codigo ? [extra.codigo] : [],
        aproximado: !!extra.aproximado,
      };
      porId.set(ing.id, r);
      resultados.push(r);
    };

    for (const original of trocear(lista)) {
      const s = normalizar(original);
      if (!s || palabrasFuncion.has(s) || /^sin /.test(s)) continue; // "sin gluten", "sin azúcares añadidos"

      const { texto: sCorregido, corregidas } = corregirFragmento(s);
      if (palabrasFuncion.has(sCorregido)) continue;
      const encontrados = buscarEnFragmento(sCorregido);
      if (encontrados.length) {
        for (const f of encontrados) {
          const aproximado = !f.codigo && f.termino.split(" ").some((w) => corregidas.has(w));
          if (f.ing) anotar(f.ing, aproximado ? original.trim() : f.termino, { codigo: f.codigo, aproximado });
          else if (!desconocidos.includes(f.codigo)) desconocidos.push(f.codigo);
        }
        continue;
      }

      const limpio = quitarFuncionInicial(sCorregido).replace(/[^a-z0-9ñ ]/g, "").trim();
      if (limpio.length < 3 || palabrasFuncion.has(limpio) || /^\d+$/.test(limpio)) continue;

      const aprox = buscarAproximado(limpio);
      if (aprox) {
        anotar(aprox.ing, original.trim(), { aproximado: true });
        continue;
      }
      const mostrar = original.replace(/\s+/g, " ").trim();
      if (!desconocidos.includes(mostrar)) desconocidos.push(mostrar);
    }

    // Trazas: sólo nos interesan los alérgenos
    const trazasAlergenos = [];
    for (const original of trocear(trazas)) {
      for (const f of buscarEnFragmento(corregirFragmento(normalizar(original)).texto)) {
        if (f.ing && f.ing.alergeno && !trazasAlergenos.includes(f.ing.alergeno)) {
          trazasAlergenos.push(f.ing.alergeno);
        }
      }
    }

    const alergenos = [];
    for (const r of resultados) {
      const lista = r.alergeno ? [r.alergeno] : [];
      for (const t of r.terminos) for (const w of normalizar(t).split(" ")) if (palabraAlergeno.has(w)) lista.push(palabraAlergeno.get(w));
      for (const a of lista) if (!alergenos.includes(a)) alergenos.push(a);
    }

    return {
      textoIngredientes: lista,
      ingredientes: resultados,
      desconocidos,
      alergenos,
      trazas: trazasAlergenos.filter((a) => !alergenos.includes(a)),
      resumen: resumir(resultados),
    };
  }

  const MARCADORES_ULTRAPROCESADO = new Set([
    "jarabe-glucosa-fructosa", "jarabe-glucosa", "maltodextrina", "dextrosa", "azucar-invertido",
    "grasa-hidrogenada", "almidon-modificado", "proteina-hidrolizada", "aroma", "potenciadores",
    "ribonucleotidos", "mono-diglicéridos", "polisorbatos", "esteres-sacarosa", "carragenano", "celulosas",
    "colorantes-southampton", "azules-sinteticos", "caramelo", "aspartamo", "acesulfamo", "sucralosa",
    "sacarina", "ciclamato", "carne-separada", "fosfatos", "pgpr", "bha-bht", "edta", "gomas-vegetales",
  ]);

  function resumir(resultados) {
    const conteo = { bueno: 0, neutral: 0, moderar: 0, evitar: 0 };
    let puntos = 100;
    const azucares = [];
    for (const r of resultados) {
      conteo[r.nivel]++;
      const principal = r.posicion < 3; // los primeros ingredientes son los más abundantes
      if (r.nivel === "evitar") puntos -= principal ? 25 : 18;
      else if (r.nivel === "moderar") puntos -= principal ? 12 : 6;
      else if (r.nivel === "bueno") puntos += principal ? 6 : 3;
      if (r.categoria === "Azúcar añadido") azucares.push(r.nombre);
    }
    puntos = Math.max(0, Math.min(100, Math.round(puntos)));

    const marcadores = resultados.filter((r) => MARCADORES_ULTRAPROCESADO.has(r.id));
    const ultraprocesado = marcadores.length >= 2 || (marcadores.length >= 1 && resultados.length >= 8);

    let veredicto, nivel;
    if (!resultados.length) { veredicto = "Sin datos suficientes"; nivel = "neutral"; }
    else if (puntos >= 75) { veredicto = "Buena opción"; nivel = "bueno"; }
    else if (puntos >= 50) { veredicto = "Consumo moderado"; nivel = "moderar"; }
    else { veredicto = "Consumo ocasional"; nivel = "evitar"; }

    const avisos = [];
    if (azucares.length >= 2) avisos.push(`Contiene ${azucares.length} tipos de azúcares añadidos (${azucares.join(", ")}). Es una forma habitual de que el azúcar no aparezca el primero en la lista.`);
    else if (azucares.length === 1 && resultados.find((r) => r.categoria === "Azúcar añadido").posicion < 3) avisos.push("Un azúcar añadido está entre los tres ingredientes principales.");
    if (ultraprocesado) avisos.push("Por sus ingredientes, probablemente es un alimento ultraprocesado (grupo NOVA 4). Su consumo frecuente se asocia con peor salud.");
    if (resultados.some((r) => r.id === "colorantes-southampton")) avisos.push("Contiene colorantes que pueden afectar a la actividad y la atención de los niños.");

    return { puntos, veredicto, nivel, conteo, ultraprocesado, avisos };
  }

  const api = { analizar, normalizar, extraerIngredientes, trocear, levenshtein, corregirOCR, NIVELES };
  if (typeof window === "undefined" && typeof module !== "undefined") module.exports = api;
  else root.Analizador = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
