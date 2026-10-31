const test = require("node:test");
const assert = require("node:assert");
const { analizar } = require("../js/analizador.js");

const ids = (r) => r.ingredientes.map((i) => i.id);

test("reconoce ingredientes básicos y respeta el orden", () => {
  const r = analizar("Ingredientes: harina de trigo, azúcar, aceite de palma, sal.");
  assert.deepStrictEqual(ids(r), ["harina-trigo", "azucar", "aceite-palma", "sal"]);
});

test("reconoce códigos E con y sin guion", () => {
  const r = analizar("emulgente: E-471, colorante E150d, E 102");
  assert.deepStrictEqual(ids(r), ["mono-diglicéridos", "caramelo", "colorantes-southampton"]);
});

test("no duplica un aditivo citado por nombre y código", () => {
  const r = analizar("potenciador del sabor: glutamato monosódico (E621)");
  assert.deepStrictEqual(ids(r), ["potenciadores"]);
});

test("prefiere la coincidencia más larga", () => {
  const r = analizar("jarabe de glucosa-fructosa, lecitina de soja");
  assert.deepStrictEqual(ids(r), ["jarabe-glucosa-fructosa", "lecitinas", "soja"].filter((x) => ids(r).includes(x)));
  assert.ok(!ids(r).includes("jarabe-glucosa"));
});

test("ignora porcentajes y palabras de función", () => {
  const r = analizar("cacao (12,5 %), conservantes, azúcar 20%");
  assert.deepStrictEqual(ids(r), ["cacao", "azucar"]);
  assert.deepStrictEqual(r.desconocidos, []);
});

test("separa alérgenos y trazas", () => {
  const r = analizar("Ingredientes: leche entera, huevo. Puede contener trazas de cacahuete y soja.");
  assert.deepStrictEqual(r.alergenos, ["leche", "huevo"]);
  assert.deepStrictEqual(r.trazas, ["cacahuete", "soja"]);
});

test("corta en la información nutricional", () => {
  const r = analizar("Ingredientes: agua, sal. Información nutricional: grasas 0 g, azúcares 0 g");
  assert.deepStrictEqual(ids(r), ["agua", "sal"]);
});

test("tolera errores pequeños de OCR", () => {
  const r = analizar("maltodextrlna, sorbato potasico");
  assert.deepStrictEqual(ids(r), ["maltodextrina", "sorbatos"]);
  assert.ok(r.ingredientes[0].aproximado);
});

test("no confunde 'sin gluten' con gluten", () => {
  const r = analizar("harina de arroz, sin gluten");
  assert.ok(!ids(r).includes("gluten"));
});

test("marca desconocidos y E sin datos", () => {
  const r = analizar("quinotrufa, E999");
  assert.ok(r.desconocidos.includes("quinotrufa"));
  assert.ok(r.desconocidos.includes("E999"));
});

test("puntúa peor un producto ultraprocesado", () => {
  const malo = analizar("azúcar, jarabe de glucosa-fructosa, grasa vegetal parcialmente hidrogenada, E102, aroma");
  const bueno = analizar("copos de avena, almendras, pasas");
  assert.ok(malo.resumen.puntos < 50);
  assert.ok(bueno.resumen.puntos >= 75);
  assert.ok(malo.resumen.ultraprocesado);
});

test("corrige palabras mal leídas por el OCR", () => {
  const r = analizar("lngredientes: harlna de trigo, azucar, difostato disódico, lecitlna de soja, co1orante (E15Od)");
  assert.deepStrictEqual(ids(r), ["harina-trigo", "azucar", "fosfatos", "lecitinas", "caramelo"]);
  assert.ok(r.alergenos.includes("soja"));
  assert.ok(r.ingredientes.find((i) => i.id === "fosfatos").aproximado);
});

test("no corrige palabras ya correctas", () => {
  const r = analizar("sal, agua, carbonato ácido de amonio");
  assert.deepStrictEqual(ids(r), ["sal", "agua", "carbonatos"]);
  assert.ok(r.ingredientes.every((i) => !i.aproximado));
});

test("encuentra cabecera, trazas y fin aunque estén mal leídos", () => {
  const r = analizar("MORNEDIENTES: harina de trigo, sal. Pusde comener vazas de huevo. BSPFORMACIÓN NUTIECIONAL por 100 g: azúcares 3 g");
  assert.deepStrictEqual(ids(r), ["harina-trigo", "sal"]);
  assert.deepStrictEqual(r.trazas, ["huevo"]);
  assert.deepStrictEqual(r.desconocidos, []);
});

test("ignora palabras de función mal leídas y arregla E1500", () => {
  const r = analizar("gauficantes (bicarbonato sódico), emuigentes, colorante (E1500)");
  assert.deepStrictEqual(ids(r), ["carbonatos", "caramelo"]);
  assert.deepStrictEqual(r.desconocidos, []);
});
