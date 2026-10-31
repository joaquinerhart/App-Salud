/*
 * Instrucciones para Claude. Las usan la app (cuando corre dentro de Claude)
 * y el servidor de NutriLog (cuando corre como app de iPhone), así que hay una sola versión.
 */
(function (root) {
  const ALERGENOS_VALIDOS = ["gluten", "leche", "huevo", "soja", "maní", "frutos de cáscara", "pescado",
    "crustáceos y moluscos", "sésamo", "mostaza", "apio", "sulfitos", "altramuces"];

  const INSTRUCCIONES_LECTURA = `Te paso la foto de la etiqueta de un producto alimenticio (puede ser de Argentina u otro país de habla hispana). Si hay más de una imagen, la primera es la foto completa y las otras son recortes ampliados de la misma foto (mitad de arriba y mitad de abajo) para leer mejor la letra chica.

Transcribí EXACTAMENTE la lista de ingredientes tal como está escrita: desde la palabra "Ingredientes" hasta el final de la lista, con sus paréntesis, porcentajes y códigos (INS o E), y las frases de alérgenos ("Contiene…", "Puede contener…"). No incluyas la información nutricional, los datos del fabricante, promociones, fechas ni el modo de conservación. Si una palabra se ve borrosa, escribí la más probable para una etiqueta de alimentos, pero no inventes ingredientes que no se vean.

Respondé solo con este JSON:
{"hayIngredientes": true, "producto": "nombre del producto si se ve, si no vacío", "ingredientes": "Ingredientes: …", "legibilidad": "buena" | "parcial" | "mala"}`;

  function promptClasificar(lista) {
    return `Sos nutricionista. Estos textos salieron de la lista de ingredientes de un alimento (etiqueta de Argentina u otro país hispanohablante) y no están en nuestra base de datos. Para cada uno, decí qué es y cómo afecta a la salud según la evidencia (OMS, EFSA, IARC).

Niveles: "bueno" = alimento poco procesado con beneficios (verduras, legumbres, integrales, frutos secos…); "neutral" = seguro en cantidades habituales; "moderar" = azúcares añadidos, sal, grasas saturadas, carne roja, aditivos con dudas o que afectan a grupos sensibles; "evitar" = evidencia clara de riesgo (grasas trans, carne procesada con nitritos, aditivos prohibidos en otros países…). Si el texto NO es un ingrediente (una marca, una frase de la etiqueta, una cantidad), usá "ignorar".

Respondé solo con un JSON array, un objeto por texto y en el mismo orden:
[{"original": "texto exacto que te pasé", "nombre": "nombre corto", "categoria": "p. ej. Lácteo, Carne, Aditivo", "nivel": "bueno|neutral|moderar|evitar|ignorar", "que": "qué es, en una oración", "salud": "efecto en la salud, en una o dos oraciones", "alergeno": "uno de: ${ALERGENOS_VALIDOS.join(", ")}; o vacío"}]

Textos:
${lista.map((t) => "- " + t).join("\n")}`;
  }

  const api = { ALERGENOS_VALIDOS, INSTRUCCIONES_LECTURA, promptClasificar };
  if (typeof window === "undefined" && typeof module !== "undefined") module.exports = api;
  else root.NutriLogPrompts = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
