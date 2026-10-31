/*
 * Motor de análisis: recibe el texto de una etiqueta (tecleado o leído por OCR),
 * localiza la lista de ingredientes y la cruza con la base de datos.
 */
(function (root) {
  const db = typeof module !== "undefined" && module.exports
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
  const palabrasFuncion = new Set(db.PALABRAS_FUNCION.map(normalizar));
  const funcionesOrdenadas = [...palabrasFuncion].sort((a, b) => b.length - a.length);

  function buscarCodigoE(code) {
    code = code.toUpperCase();
    if (indiceE.has(code)) return indiceE.get(code);
    const base = code.replace(/[A-Z]$/, "");
    return indiceE.get(base) || null;
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
    let t = String(textoOriginal)
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

    let inicio = 0;
    const mIng = base.match(/ingredientes?\s*[:.]?/);
    if (mIng) inicio = mIng.index + mIng[0].length;

    let fin = t.length;
    for (const marca of MARCAS_FIN) {
      const i = base.indexOf(marca, inicio);
      if (i !== -1 && i < fin) fin = i;
    }

    let lista = t.slice(inicio, fin);
    let baseLista = base.slice(inicio, fin);

    let trazas = "";
    const mTr = baseLista.match(/puede contener(\s+trazas?)?(\s+de)?\s*|contiene\s+trazas?(\s+de)?\s*|trazas?\s+de\s*/);
    if (mTr) {
      const resto = lista.slice(mTr.index + mTr[0].length);
      const finTr = resto.search(/\.\s|$/);
      trazas = resto.slice(0, finTr === -1 ? undefined : finTr);
      lista = lista.slice(0, mTr.index) + " " + resto.slice(trazas.length);
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

      const encontrados = buscarEnFragmento(s);
      if (encontrados.length) {
        for (const f of encontrados) {
          if (f.ing) anotar(f.ing, f.termino, { codigo: f.codigo });
          else if (!desconocidos.includes(f.codigo)) desconocidos.push(f.codigo);
        }
        continue;
      }

      const limpio = quitarFuncionInicial(s).replace(/[^a-z0-9ñ ]/g, "").trim();
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
      for (const f of buscarEnFragmento(normalizar(original))) {
        if (f.ing && f.ing.alergeno && !trazasAlergenos.includes(f.ing.alergeno)) {
          trazasAlergenos.push(f.ing.alergeno);
        }
      }
    }

    const alergenos = [...new Set(resultados.filter((r) => r.alergeno).map((r) => r.alergeno))];

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

  const api = { analizar, normalizar, extraerIngredientes, trocear, levenshtein, NIVELES };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Analizador = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
