/*
 * Base de datos de ingredientes y aditivos alimentarios.
 *
 * nivel:
 *   "bueno"    -> aporta beneficios o es un alimento básico saludable
 *   "neutral"  -> considerado seguro en cantidades habituales
 *   "moderar"  -> conviene limitar su consumo o hay grupos sensibles
 *   "evitar"   -> hay evidencia de riesgo relevante; mejor evitar o minimizar
 *
 * La información es divulgativa y está basada en evaluaciones de organismos como
 * la EFSA, la OMS y la IARC. No sustituye el consejo de un profesional sanitario.
 */
(function (root) {
  const INGREDIENTES = [
    // ───────────── Azúcares y edulcorantes calóricos ─────────────
    {
      id: "azucar", nombre: "Azúcar (sacarosa)", categoria: "Azúcar añadido", nivel: "moderar",
      alias: ["azúcar", "azucar", "sacarosa", "azúcar blanco", "azúcar de caña", "azúcar moreno", "azúcar de remolacha", "azúcar glas", "azúcar integral", "panela", "azúcar mascabado", "piloncillo", "rapadura"],
      que: "Azúcar extraído de la caña o la remolacha. Se usa para endulzar, dar textura y conservar.",
      salud: "Aporta calorías sin nutrientes. El exceso de azúcares añadidos se asocia con caries, sobrepeso, diabetes tipo 2 y enfermedad cardiovascular. La OMS recomienda que no superen el 10 % de las calorías diarias (idealmente menos del 5 %, unos 25 g)."
    },
    {
      id: "jarabe-glucosa-fructosa", nombre: "Jarabe de glucosa-fructosa", categoria: "Azúcar añadido", nivel: "evitar",
      alias: ["jarabe de glucosa-fructosa", "jarabe de glucosa y fructosa", "jarabe de fructosa-glucosa", "jarabe de fructosa", "jarabe de maíz alto en fructosa", "jarabe de maíz de alta fructosa", "jarabe de maiz", "jarabe de maíz", "isoglucosa", "jmaf", "sirope de maíz"],
      que: "Edulcorante líquido barato obtenido del almidón de maíz o trigo. Muy usado en refrescos, bollería y salsas.",
      salud: "Es azúcar añadido muy concentrado. Su consumo frecuente (sobre todo en bebidas) se relaciona con hígado graso, aumento de triglicéridos, resistencia a la insulina y obesidad."
    },
    {
      id: "jarabe-glucosa", nombre: "Jarabe de glucosa", categoria: "Azúcar añadido", nivel: "moderar",
      alias: ["jarabe de glucosa", "glucosa", "sirope de glucosa", "jarabe de trigo", "jarabe de arroz", "sirope de arroz", "jarabe de azúcar"],
      que: "Solución concentrada de azúcares obtenida al descomponer almidón. Aporta dulzor, brillo y evita que cristalice el azúcar.",
      salud: "Es un azúcar añadido de absorción rápida que eleva la glucosa en sangre. Conviene limitarlo igual que el azúcar común."
    },
    {
      id: "dextrosa", nombre: "Dextrosa", categoria: "Azúcar añadido", nivel: "moderar",
      alias: ["dextrosa", "jarabe de dextrosa"],
      que: "Es glucosa pura obtenida del almidón.",
      salud: "Tiene el índice glucémico más alto (100): produce picos rápidos de glucosa. Es un azúcar añadido."
    },
    {
      id: "fructosa", nombre: "Fructosa", categoria: "Azúcar añadido", nivel: "moderar",
      alias: ["fructosa", "azúcar de fruta"],
      que: "Azúcar presente de forma natural en la fruta; añadido como ingrediente se obtiene industrialmente.",
      salud: "Añadida en exceso se metaboliza en el hígado y favorece el hígado graso y el aumento de triglicéridos. La fructosa de la fruta entera no supone este problema."
    },
    {
      id: "maltodextrina", nombre: "Maltodextrina", categoria: "Carbohidrato procesado", nivel: "moderar",
      alias: ["maltodextrina", "maltodextrinas", "dextrina", "dextrinas"],
      que: "Polvo derivado del almidón usado como espesante, relleno o para dar cuerpo.",
      salud: "Tiene un índice glucémico muy alto (incluso mayor que el azúcar), aunque no sepa dulce. Precaución en diabetes."
    },
    {
      id: "azucar-invertido", nombre: "Azúcar invertido", categoria: "Azúcar añadido", nivel: "moderar",
      alias: ["azúcar invertido", "jarabe de azúcar invertido", "jarabe invertido"],
      que: "Sacarosa separada en glucosa y fructosa. Mantiene húmedos los productos y evita la cristalización.",
      salud: "Es azúcar añadido; mismas recomendaciones que el azúcar común."
    },
    {
      id: "miel", nombre: "Miel", categoria: "Azúcar añadido", nivel: "moderar",
      alias: ["miel", "miel de abeja"],
      que: "Sustancia dulce producida por las abejas a partir del néctar.",
      salud: "Contiene pequeñas cantidades de antioxidantes, pero nutricionalmente cuenta como azúcar libre. No debe darse a menores de 1 año por riesgo de botulismo."
    },
    {
      id: "sirope-agave", nombre: "Sirope de agave", categoria: "Azúcar añadido", nivel: "moderar",
      alias: ["sirope de agave", "jarabe de agave", "néctar de agave"],
      que: "Endulzante líquido obtenido de la planta de agave.",
      salud: "Muy rico en fructosa (hasta un 85 %). Aunque se vende como saludable, es un azúcar libre."
    },
    {
      id: "extracto-malta", nombre: "Extracto de malta", categoria: "Azúcar añadido", nivel: "moderar", alergeno: "gluten",
      alias: ["extracto de malta", "extracto de malta de cebada", "malta de cebada", "jarabe de malta", "malta"],
      que: "Jarabe o polvo obtenido de cereales germinados (normalmente cebada). Aporta sabor tostado y color.",
      salud: "Es fuente de azúcares (maltosa). Contiene gluten: no apto para personas celíacas salvo que se indique lo contrario."
    },

    // ───────────── Edulcorantes ─────────────
    {
      id: "aspartamo", nombre: "Aspartamo", e: ["E951"], categoria: "Edulcorante", nivel: "moderar",
      alias: ["aspartamo", "aspartame"],
      que: "Edulcorante artificial unas 200 veces más dulce que el azúcar. Usado en bebidas 'light' o 'zero'.",
      salud: "Autorizado como seguro por EFSA y OMS hasta 40 mg/kg/día. En 2023 la IARC lo clasificó como 'posiblemente cancerígeno' (grupo 2B) por evidencia limitada. Contiene fenilalanina: prohibido para personas con fenilcetonuria."
    },
    {
      id: "acesulfamo", nombre: "Acesulfamo K", e: ["E950"], categoria: "Edulcorante", nivel: "moderar",
      alias: ["acesulfamo k", "acesulfamo potásico", "acesulfamo-k", "acesulfame k", "acesulfamo"],
      que: "Edulcorante artificial sin calorías, a menudo combinado con aspartamo o sucralosa.",
      salud: "Considerado seguro por la EFSA dentro de la ingesta diaria admisible. Algunos estudios observacionales relacionan los edulcorantes artificiales con mayor riesgo cardiovascular; la evidencia no es concluyente."
    },
    {
      id: "sucralosa", nombre: "Sucralosa", e: ["E955"], categoria: "Edulcorante", nivel: "moderar",
      alias: ["sucralosa"],
      que: "Edulcorante artificial derivado del azúcar, unas 600 veces más dulce.",
      salud: "Autorizada como segura. Estudios recientes sugieren que puede alterar la microbiota intestinal y que al calentarse a altas temperaturas puede generar compuestos clorados. La OMS (2023) desaconseja usar edulcorantes para controlar el peso."
    },
    {
      id: "sacarina", nombre: "Sacarina", e: ["E954"], categoria: "Edulcorante", nivel: "moderar",
      alias: ["sacarina", "sacarina sódica"],
      que: "Uno de los edulcorantes artificiales más antiguos, unas 300 veces más dulce que el azúcar.",
      salud: "Se retiró de la lista de posibles cancerígenos en 2000 y se considera segura en dosis habituales. Puede dejar regusto metálico."
    },
    {
      id: "ciclamato", nombre: "Ciclamato", e: ["E952"], categoria: "Edulcorante", nivel: "moderar",
      alias: ["ciclamato", "ciclamato sódico", "ácido ciclámico"],
      que: "Edulcorante artificial unas 30-50 veces más dulce que el azúcar.",
      salud: "Permitido en la UE con una ingesta diaria baja (7 mg/kg). Está prohibido en EE. UU. desde 1970. Es fácil superar el límite en niños que toman muchas bebidas edulcoradas."
    },
    {
      id: "stevia", nombre: "Glucósidos de esteviol (stevia)", e: ["E960"], categoria: "Edulcorante", nivel: "neutral",
      alias: ["stevia", "estevia", "glucósidos de esteviol", "glicósidos de esteviol", "rebaudiósido a", "esteviol"],
      que: "Edulcorante sin calorías extraído de la hoja de la planta Stevia rebaudiana.",
      salud: "Considerado seguro hasta 4 mg/kg/día. No eleva la glucosa. Mantiene el hábito del sabor dulce."
    },
    {
      id: "eritritol", nombre: "Eritritol", e: ["E968"], categoria: "Edulcorante (poliol)", nivel: "moderar",
      alias: ["eritritol"],
      que: "Poliol (alcohol de azúcar) casi sin calorías, presente en productos 'keto' y sin azúcar.",
      salud: "No eleva la glucosa. Un estudio de 2023 (Nature Medicine) asoció niveles altos en sangre con mayor riesgo de trombosis e infarto; se está investigando. En grandes cantidades puede causar molestias digestivas."
    },
    {
      id: "polioles", nombre: "Polioles (sorbitol, maltitol, xilitol…)", e: ["E420", "E421", "E953", "E964", "E965", "E966", "E967"], categoria: "Edulcorante (poliol)", nivel: "neutral",
      alias: ["sorbitol", "jarabe de sorbitol", "maltitol", "jarabe de maltitol", "xilitol", "manitol", "isomalt", "lactitol", "polioles", "isomaltitol"],
      que: "Edulcorantes de la familia de los alcoholes de azúcar. Aportan menos calorías que el azúcar y no producen caries.",
      salud: "En exceso tienen efecto laxante y causan gases (los envases lo advierten). El maltitol eleva la glucosa casi como el azúcar. El xilitol es muy tóxico para perros."
    },

    // ───────────── Grasas ─────────────
    {
      id: "grasa-hidrogenada", nombre: "Grasas hidrogenadas", categoria: "Grasa", nivel: "evitar",
      alias: ["grasa vegetal hidrogenada", "grasa hidrogenada", "aceite vegetal hidrogenado", "aceite hidrogenado", "parcialmente hidrogenado", "parcialmente hidrogenada", "aceite parcialmente hidrogenado", "grasa parcialmente hidrogenada", "grasas hidrogenadas", "aceites hidrogenados", "grasa vegetal parcialmente hidrogenada"],
      que: "Aceites líquidos endurecidos químicamente para hacerlos sólidos y más estables.",
      salud: "Si la hidrogenación es parcial contienen grasas trans, que aumentan el colesterol LDL ('malo'), bajan el HDL y elevan claramente el riesgo de infarto. La UE las limita a 2 g por 100 g de grasa desde 2021. Si es 'totalmente hidrogenada' no tiene trans, pero sí mucha grasa saturada."
    },
    {
      id: "aceite-palma", nombre: "Aceite de palma", categoria: "Grasa", nivel: "moderar",
      alias: ["aceite de palma", "grasa de palma", "palma", "palmiste", "aceite de palmiste", "estearina de palma", "oleína de palma", "grasa de palmiste"],
      que: "Grasa vegetal sólida a temperatura ambiente. Barata y estable, muy usada en bollería, galletas y snacks.",
      salud: "Rica en grasa saturada (≈50 %), que en exceso eleva el colesterol LDL. El refinado a altas temperaturas genera contaminantes (ésteres de glicidol) que la EFSA vigila. Además tiene impacto ambiental (deforestación)."
    },
    {
      id: "aceite-coco", nombre: "Aceite de coco", categoria: "Grasa", nivel: "moderar",
      alias: ["aceite de coco", "grasa de coco", "manteca de coco"],
      que: "Grasa extraída de la pulpa del coco.",
      salud: "Es una de las grasas con más ácidos grasos saturados (≈90 %) y eleva el colesterol LDL. No hay evidencia sólida de sus supuestos beneficios."
    },
    {
      id: "grasa-vegetal", nombre: "Grasa / aceite vegetal (sin especificar)", categoria: "Grasa", nivel: "moderar",
      alias: ["grasa vegetal", "grasas vegetales", "aceite vegetal", "aceites vegetales", "aceites y grasas vegetales", "grasa vegetal no hidrogenada", "aceites vegetales en proporción variable", "margarina"],
      que: "Mezcla de grasas vegetales cuyo origen no se detalla. Con frecuencia incluye palma o coco.",
      salud: "Al no indicarse el tipo, puede tratarse de grasas saturadas de baja calidad. Desde 2014 la normativa de la UE obliga a especificar el origen vegetal."
    },
    {
      id: "aceite-oliva", nombre: "Aceite de oliva", categoria: "Grasa saludable", nivel: "bueno",
      alias: ["aceite de oliva", "aceite de oliva virgen", "aceite de oliva virgen extra", "aove", "aceite de orujo de oliva"],
      que: "Aceite obtenido de las aceitunas; base de la dieta mediterránea.",
      salud: "Rico en grasa monoinsaturada (ácido oleico) y, si es virgen extra, en polifenoles antioxidantes. Se asocia con menor riesgo cardiovascular (estudio PREDIMED)."
    },
    {
      id: "aceite-girasol", nombre: "Aceite de girasol", categoria: "Grasa", nivel: "neutral",
      alias: ["aceite de girasol", "aceite de girasol alto oleico", "girasol"],
      que: "Aceite de semillas de girasol, muy común en productos fritos y envasados.",
      salud: "Aporta grasas insaturadas y vitamina E. La versión 'alto oleico' es más estable al calor. Mejor opción que palma o coco."
    },
    {
      id: "aceite-colza", nombre: "Aceite de colza / canola", categoria: "Grasa", nivel: "neutral",
      alias: ["aceite de colza", "aceite de canola", "colza", "canola"],
      que: "Aceite de semillas de colza, bajo en grasa saturada.",
      salud: "Tiene buen perfil de grasas, incluido omega-3 (ácido alfa-linolénico). Las variedades actuales tienen niveles seguros de ácido erúcico."
    },
    {
      id: "aceites-semillas", nombre: "Aceites de semillas (soja, maíz, cacahuete…)", categoria: "Grasa", nivel: "neutral",
      alias: ["aceite de soja", "aceite de maíz", "aceite de algodón", "aceite de semillas", "aceite de cacahuete", "aceite de cártamo", "aceite de sésamo"],
      que: "Aceites vegetales líquidos de diferentes semillas.",
      salud: "Ricos en grasas poliinsaturadas (omega-6). Son adecuados con moderación; no conviene reutilizarlos muchas veces para freír."
    },
    {
      id: "mantequilla", nombre: "Mantequilla / nata", categoria: "Grasa láctea", nivel: "moderar", alergeno: "leche",
      alias: ["mantequilla", "manteca", "nata", "crema de leche", "grasa láctea", "grasa de leche", "mantequilla concentrada", "ghee"],
      que: "Grasa obtenida de la leche.",
      salud: "Rica en grasa saturada; mejor en cantidades moderadas. Contiene leche (alérgeno)."
    },
    {
      id: "manteca-cerdo", nombre: "Manteca de cerdo / grasa animal", categoria: "Grasa animal", nivel: "moderar",
      alias: ["manteca de cerdo", "grasa de cerdo", "tocino", "sebo", "grasa animal", "grasa de vacuno", "lardo"],
      que: "Grasa de origen animal.",
      salud: "Alta en grasa saturada y colesterol. Conviene limitarla. No apta para dietas vegetarianas ni ciertas dietas religiosas."
    },
    {
      id: "manteca-cacao", nombre: "Manteca de cacao", categoria: "Grasa", nivel: "neutral",
      alias: ["manteca de cacao", "grasa de cacao"],
      que: "Grasa natural del grano de cacao; da la textura al chocolate.",
      salud: "Tiene grasa saturada, pero predominantemente ácido esteárico, que apenas eleva el colesterol."
    },

    // ───────────── Sal y sodio ─────────────
    {
      id: "sal", nombre: "Sal", categoria: "Sal", nivel: "moderar",
      alias: ["sal", "sal yodada", "sal marina", "cloruro sódico", "cloruro de sodio", "sal de mesa", "sal refinada", "sal del himalaya"],
      que: "Cloruro sódico. Potencia el sabor y ayuda a conservar.",
      salud: "El exceso de sodio eleva la tensión arterial y el riesgo de ictus e infarto. La OMS recomienda menos de 5 g de sal al día. La mayor parte proviene de alimentos procesados."
    },
    {
      id: "cloruro-potasio", nombre: "Cloruro potásico", e: ["E508"], categoria: "Sustituto de sal", nivel: "neutral",
      alias: ["cloruro potásico", "cloruro de potasio"],
      que: "Sal de potasio usada para reducir el sodio.",
      salud: "Ayuda a bajar el sodio. Precaución en enfermedad renal o con medicamentos que retienen potasio."
    },

    // ───────────── Cereales, harinas y almidones ─────────────
    {
      id: "harina-trigo", nombre: "Harina de trigo refinada", categoria: "Cereal", nivel: "neutral", alergeno: "gluten",
      alias: ["harina de trigo", "harina", "harina de trigo refinada", "harina blanca", "sémola de trigo", "trigo", "harina de trigo enriquecida", "harina de fuerza"],
      que: "Harina obtenida del trigo sin el salvado ni el germen.",
      salud: "Aporta energía pero poca fibra; tiene un índice glucémico alto. Contiene gluten: no apta para celíacos."
    },
    {
      id: "harina-integral", nombre: "Harina / cereal integral", categoria: "Cereal integral", nivel: "bueno", alergeno: "gluten",
      alias: ["harina integral", "harina de trigo integral", "trigo integral", "harina integral de trigo", "cereales integrales", "harina de centeno integral", "salvado de trigo", "salvado", "germen de trigo", "espelta integral", "harina de espelta integral"],
      que: "Harina del grano completo, con salvado y germen.",
      salud: "Rica en fibra, vitaminas del grupo B y minerales. Su consumo se asocia con menor riesgo de diabetes, enfermedad cardiovascular y cáncer colorrectal. Contiene gluten."
    },
    {
      id: "otros-cereales-gluten", nombre: "Cebada / centeno / espelta", categoria: "Cereal", nivel: "neutral", alergeno: "gluten",
      alias: ["cebada", "harina de cebada", "centeno", "harina de centeno", "espelta", "harina de espelta", "kamut", "triticale"],
      que: "Cereales con gluten.",
      salud: "Fuente de energía y algo de fibra (más si son integrales). Contienen gluten: no aptos para celíacos."
    },
    {
      id: "avena", nombre: "Avena", categoria: "Cereal integral", nivel: "bueno", alergeno: "gluten",
      alias: ["avena", "copos de avena", "harina de avena", "salvado de avena", "avena integral"],
      que: "Cereal integral rico en fibra soluble.",
      salud: "Sus betaglucanos ayudan a reducir el colesterol LDL y moderan la glucosa (alegación aprobada por la EFSA). Puede contener gluten por contaminación cruzada salvo que sea 'sin gluten'."
    },
    {
      id: "arroz", nombre: "Arroz", categoria: "Cereal", nivel: "neutral",
      alias: ["arroz", "harina de arroz", "arroz integral", "almidón de arroz"],
      que: "Cereal sin gluten.",
      salud: "Fuente de energía. El integral aporta más fibra. Puede contener arsénico inorgánico, por lo que no conviene que sea el único cereal en la dieta infantil."
    },
    {
      id: "maiz", nombre: "Maíz", categoria: "Cereal", nivel: "neutral",
      alias: ["maíz", "harina de maíz", "sémola de maíz", "maíz dulce", "grits de maíz"],
      que: "Cereal sin gluten.",
      salud: "Fuente de energía. Refinado tiene índice glucémico alto; el integral aporta más fibra."
    },
    {
      id: "almidon", nombre: "Almidón / fécula", categoria: "Espesante", nivel: "neutral",
      alias: ["almidón", "almidón de maíz", "almidón de patata", "almidón de trigo", "fécula", "fécula de patata", "fécula de maíz", "maicena", "almidón de tapioca", "tapioca", "almidones"],
      que: "Carbohidrato extraído de cereales o tubérculos, usado para espesar.",
      salud: "Aporta calorías y se digiere rápidamente. Seguro. Si es de trigo puede contener gluten."
    },
    {
      id: "almidon-modificado", nombre: "Almidón modificado", e: ["E1404", "E1410", "E1412", "E1413", "E1414", "E1420", "E1422", "E1440", "E1442", "E1450", "E1451"], categoria: "Espesante", nivel: "neutral",
      alias: ["almidón modificado", "almidones modificados", "almidón modificado de maíz", "almidón modificado de patata", "almidón de maíz modificado", "fosfato de dialmidón", "almidón acetilado"],
      que: "Almidón tratado física o químicamente para que resista calor, congelación o acidez.",
      salud: "Considerado seguro por la EFSA. Su presencia suele indicar un producto ultraprocesado."
    },
    {
      id: "gluten", nombre: "Gluten", categoria: "Proteína", nivel: "neutral", alergeno: "gluten",
      alias: ["gluten", "gluten de trigo", "proteína de trigo"],
      que: "Proteína del trigo, cebada y centeno. Da elasticidad a las masas.",
      salud: "Seguro para la mayoría. Debe evitarse en celiaquía, alergia al trigo y sensibilidad al gluten no celíaca."
    },

    // ───────────── Proteínas, lácteos, huevo y alérgenos ─────────────
    {
      id: "leche", nombre: "Leche y derivados", categoria: "Lácteo", nivel: "neutral", alergeno: "leche",
      alias: ["leche", "leche desnatada", "leche entera", "leche en polvo", "leche desnatada en polvo", "leche entera en polvo", "suero de leche", "suero lácteo", "lactosuero", "suero de leche en polvo", "lactosa", "proteínas de la leche", "proteína de leche", "caseína", "caseinato", "caseinato sódico", "caseinato de sodio", "caseinato cálcico", "leche condensada", "queso", "yogur", "nata en polvo", "permeado de leche", "proteína de suero", "concentrado de proteína de suero", "suero"],
      que: "Leche o componentes derivados (proteínas, lactosa, suero).",
      salud: "Aporta proteína de calidad y calcio. Es un alérgeno de declaración obligatoria; la lactosa causa molestias a personas intolerantes."
    },
    {
      id: "huevo", nombre: "Huevo", categoria: "Proteína", nivel: "neutral", alergeno: "huevo",
      alias: ["huevo", "huevos", "huevo en polvo", "huevo líquido", "clara de huevo", "yema de huevo", "ovoproducto", "ovoproductos", "albúmina", "huevo pasteurizado", "lisozima"],
      que: "Huevo o derivados.",
      salud: "Proteína de alta calidad. Es un alérgeno de declaración obligatoria."
    },
    {
      id: "soja", nombre: "Soja", categoria: "Legumbre", nivel: "neutral", alergeno: "soja",
      alias: ["soja", "soya", "harina de soja", "proteína de soja", "proteína de soja aislada", "aislado de proteína de soja", "salsa de soja", "bebida de soja", "tofu"],
      que: "Legumbre o derivados de ella.",
      salud: "Proteína vegetal completa y con isoflavonas. Es un alérgeno de declaración obligatoria."
    },
    {
      id: "cacahuete", nombre: "Cacahuete", categoria: "Fruto seco", nivel: "bueno", alergeno: "cacahuete",
      alias: ["cacahuete", "cacahuetes", "maní", "mantequilla de cacahuete", "crema de cacahuete"],
      que: "Legumbre consumida como fruto seco.",
      salud: "Aporta proteína, fibra y grasas insaturadas. Es uno de los alérgenos más graves (puede causar anafilaxia)."
    },
    {
      id: "frutos-secos", nombre: "Frutos de cáscara", categoria: "Fruto seco", nivel: "bueno", alergeno: "frutos de cáscara",
      alias: ["almendra", "almendras", "avellana", "avellanas", "nuez", "nueces", "anacardo", "anacardos", "pistacho", "pistachos", "nuez de macadamia", "pecana", "nuez de brasil", "pasta de avellana", "pasta de almendra", "harina de almendra", "frutos secos", "frutos de cáscara"],
      que: "Frutos secos de cáscara.",
      salud: "Ricos en grasas saludables, fibra, vitamina E y minerales. Su consumo regular se asocia con menor riesgo cardiovascular. Son alérgenos de declaración obligatoria."
    },
    {
      id: "sesamo", nombre: "Sésamo", categoria: "Semilla", nivel: "bueno", alergeno: "sésamo",
      alias: ["sésamo", "semillas de sésamo", "ajonjolí", "tahini", "tahín"],
      que: "Semilla rica en grasas y calcio.",
      salud: "Nutritivo. Es un alérgeno de declaración obligatoria."
    },
    {
      id: "mostaza", nombre: "Mostaza", categoria: "Condimento", nivel: "neutral", alergeno: "mostaza",
      alias: ["mostaza", "semillas de mostaza", "harina de mostaza"],
      que: "Semilla o condimento elaborado con ella.",
      salud: "Sin efectos negativos en cantidades normales. Es un alérgeno de declaración obligatoria."
    },
    {
      id: "apio", nombre: "Apio", categoria: "Verdura", nivel: "bueno", alergeno: "apio",
      alias: ["apio", "semillas de apio", "apio nabo"],
      que: "Hortaliza usada como condimento.",
      salud: "Bajo en calorías. Es un alérgeno de declaración obligatoria."
    },
    {
      id: "pescado", nombre: "Pescado", categoria: "Proteína", nivel: "bueno", alergeno: "pescado",
      alias: ["pescado", "atún", "salmón", "sardina", "sardinas", "anchoa", "anchoas", "bacalao", "merluza", "caballa", "aceite de pescado", "gelatina de pescado", "surimi"],
      que: "Pescado o derivados.",
      salud: "Proteína de calidad; el pescado azul aporta omega-3 beneficioso para el corazón. Es un alérgeno de declaración obligatoria."
    },
    {
      id: "crustaceos", nombre: "Crustáceos / moluscos", categoria: "Proteína", nivel: "neutral", alergeno: "crustáceos y moluscos",
      alias: ["crustáceos", "gamba", "gambas", "langostino", "langostinos", "camarón", "camarones", "cangrejo", "moluscos", "mejillón", "mejillones", "calamar", "pulpo", "almeja", "almejas"],
      que: "Mariscos.",
      salud: "Proteína magra y minerales. Son alérgenos importantes de declaración obligatoria."
    },
    {
      id: "altramuz", nombre: "Altramuz", categoria: "Legumbre", nivel: "bueno", alergeno: "altramuces",
      alias: ["altramuz", "altramuces", "harina de altramuz", "lupino"],
      que: "Legumbre rica en proteína.",
      salud: "Nutritiva. Es un alérgeno de declaración obligatoria (reacción cruzada con cacahuete)."
    },
    {
      id: "carne", nombre: "Carne", categoria: "Proteína", nivel: "neutral",
      alias: ["carne de cerdo", "carne de pollo", "carne de vacuno", "carne de ternera", "carne de pavo", "pollo", "pavo", "cerdo", "ternera", "vacuno", "jamón", "magro de cerdo", "carne"],
      que: "Carne o piezas cárnicas.",
      salud: "Proteína de calidad, hierro y vitamina B12. La carne roja conviene moderarla; la procesada (embutidos) se clasifica por la IARC como cancerígena (grupo 1)."
    },
    {
      id: "carne-separada", nombre: "Carne separada mecánicamente", categoria: "Proteína", nivel: "moderar",
      alias: ["carne separada mecánicamente", "carne de ave separada mecánicamente", "csm", "carne recuperada mecánicamente"],
      que: "Pasta de carne obtenida presionando los huesos tras retirar la carne principal.",
      salud: "Menor calidad nutricional y más grasa; típica de salchichas y nuggets baratos."
    },
    {
      id: "proteina-hidrolizada", nombre: "Proteína vegetal hidrolizada", categoria: "Potenciador del sabor", nivel: "moderar",
      alias: ["proteína vegetal hidrolizada", "proteína hidrolizada", "proteínas hidrolizadas", "proteína de maíz hidrolizada", "proteína de soja hidrolizada"],
      que: "Proteína descompuesta químicamente para dar sabor 'umami'.",
      salud: "Contiene glutamato libre de forma natural; es una forma de potenciar el sabor sin declarar E621. Puede ir acompañada de mucha sal."
    },
    {
      id: "extracto-levadura", nombre: "Extracto de levadura", categoria: "Potenciador del sabor", nivel: "neutral",
      alias: ["extracto de levadura", "extractos de levadura", "levadura autolizada"],
      que: "Concentrado de levadura usado para dar sabor umami.",
      salud: "Contiene glutamato natural y vitaminas B. Seguro, aunque suele indicar productos salados y ultraprocesados."
    },
    {
      id: "levadura", nombre: "Levadura", categoria: "Fermento", nivel: "neutral",
      alias: ["levadura", "levadura de panadería", "levadura fresca", "levadura seca", "masa madre", "levadura nutricional"],
      que: "Hongo microscópico que fermenta la masa.",
      salud: "Seguro. La masa madre puede mejorar la digestibilidad del pan."
    },
    {
      id: "gelatina", nombre: "Gelatina", categoria: "Gelificante", nivel: "neutral",
      alias: ["gelatina", "gelatina de cerdo", "gelatina bovina", "colágeno", "colágeno hidrolizado"],
      que: "Proteína obtenida de huesos y piel de animales.",
      salud: "Segura. No apta para dietas vegetarianas o veganas; puede ser de cerdo (relevante en dietas halal/kosher)."
    },

    // ───────────── Alimentos naturales ─────────────
    {
      id: "agua", nombre: "Agua", categoria: "Base", nivel: "neutral",
      alias: ["agua", "agua mineral", "agua potable", "agua carbonatada", "agua con gas"],
      que: "Agua.", salud: "Sin efectos sobre la salud."
    },
    {
      id: "cacao", nombre: "Cacao", categoria: "Alimento", nivel: "bueno",
      alias: ["cacao", "cacao en polvo", "pasta de cacao", "cacao desgrasado", "cacao desgrasado en polvo", "masa de cacao", "licor de cacao", "cacao puro"],
      que: "Producto del grano de cacao.",
      salud: "Rico en flavanoles antioxidantes, fibra, magnesio y hierro. Los flavanoles del cacao ayudan a mantener la elasticidad de los vasos sanguíneos (alegación aprobada por la EFSA). Contiene teobromina y algo de cafeína."
    },
    {
      id: "fruta", nombre: "Fruta", categoria: "Fruta", nivel: "bueno",
      alias: ["fruta", "frutas", "manzana", "pera", "plátano", "banana", "fresa", "fresas", "frambuesa", "frambuesas", "arándano", "arándanos", "naranja", "limón", "piña", "melocotón", "mango", "uva", "uvas", "pasas", "uvas pasas", "dátil", "dátiles", "higo", "higos", "cereza", "cerezas", "albaricoque", "ciruela", "kiwi", "coco", "coco rallado", "frutos rojos", "pulpa de fruta", "puré de fruta", "fruta deshidratada"],
      que: "Fruta o preparado de fruta.",
      salud: "Aporta fibra, vitaminas y antioxidantes. Ojo: los zumos y concentrados de fruta cuentan como azúcares libres."
    },
    {
      id: "zumo-concentrado", nombre: "Zumo / concentrado de fruta", categoria: "Azúcar añadido", nivel: "moderar",
      alias: ["zumo concentrado", "concentrado de zumo", "zumo de fruta concentrado", "concentrado de fruta", "zumo de manzana concentrado", "zumo de uva concentrado", "jugo concentrado", "zumo de manzana", "zumo de uva", "zumo de naranja"],
      que: "Zumo de fruta al que se le quita agua; a menudo se usa para endulzar y poder decir 'sin azúcar añadido'.",
      salud: "La OMS lo considera azúcar libre: tiene un efecto similar al azúcar común. Pierde gran parte de la fibra de la fruta."
    },
    {
      id: "verduras", nombre: "Verduras y hortalizas", categoria: "Verdura", nivel: "bueno",
      alias: ["verduras", "hortalizas", "tomate", "tomates", "concentrado de tomate", "pasta de tomate", "puré de tomate", "tomate triturado", "cebolla", "cebolla en polvo", "ajo", "ajo en polvo", "pimiento", "pimientos", "zanahoria", "zanahorias", "espinaca", "espinacas", "calabacín", "berenjena", "patata", "patatas", "calabaza", "pepino", "puerro", "brócoli", "remolacha", "champiñón", "champiñones", "setas", "guisantes", "aceitunas"],
      que: "Verduras u hortalizas.",
      salud: "Aportan fibra, vitaminas, minerales y antioxidantes. Base de una dieta saludable."
    },
    {
      id: "legumbres", nombre: "Legumbres", categoria: "Legumbre", nivel: "bueno",
      alias: ["legumbres", "garbanzo", "garbanzos", "lenteja", "lentejas", "alubia", "alubias", "judías", "frijoles", "habas", "harina de garbanzo", "proteína de guisante", "harina de lenteja"],
      que: "Semillas de leguminosas.",
      salud: "Excelente fuente de proteína vegetal, fibra, hierro y folatos. Su consumo se asocia con mejor control de glucosa y colesterol."
    },
    {
      id: "semillas", nombre: "Semillas", categoria: "Semilla", nivel: "bueno",
      alias: ["semillas", "semillas de girasol", "pipas de girasol", "semillas de calabaza", "pipas de calabaza", "chía", "semillas de chía", "lino", "linaza", "semillas de lino", "quinoa", "quinua", "amaranto", "trigo sarraceno", "alforfón", "mijo"],
      que: "Semillas y pseudocereales.",
      salud: "Ricos en fibra, grasas saludables y minerales. Chía y lino aportan omega-3 vegetal."
    },
    {
      id: "especias", nombre: "Especias y hierbas", categoria: "Condimento", nivel: "bueno",
      alias: ["especias", "hierbas aromáticas", "pimienta", "pimienta negra", "canela", "orégano", "comino", "pimentón", "cúrcuma", "jengibre", "nuez moscada", "clavo", "perejil", "albahaca", "romero", "tomillo", "laurel", "vainilla", "vaina de vainilla", "curry", "cayena", "guindilla", "chile"],
      que: "Especias o hierbas aromáticas.",
      salud: "Aportan sabor sin calorías ni sal y contienen compuestos antioxidantes."
    },
    {
      id: "vinagre", nombre: "Vinagre", categoria: "Condimento", nivel: "neutral",
      alias: ["vinagre", "vinagre de vino", "vinagre de manzana", "vinagre de alcohol", "vinagre balsámico"],
      que: "Líquido ácido obtenido por fermentación.",
      salud: "Seguro. Actúa como conservante natural."
    },
    {
      id: "inulina", nombre: "Inulina / fibra prebiótica", categoria: "Fibra", nivel: "bueno",
      alias: ["inulina", "fructooligosacáridos", "fos", "oligofructosa", "fibra de achicoria", "raíz de achicoria", "galactooligosacáridos", "gos", "fibra soluble", "fibra", "fibra vegetal", "fibra de trigo", "fibra de cítricos", "dextrina resistente", "polidextrosa"],
      que: "Fibras que añaden textura y sirven de alimento a las bacterias intestinales.",
      salud: "Favorecen la microbiota y el tránsito intestinal. En cantidades altas pueden producir gases e hinchazón."
    },
    {
      id: "cafeina", nombre: "Cafeína", categoria: "Estimulante", nivel: "moderar",
      alias: ["cafeína", "café", "extracto de café", "guaraná", "extracto de guaraná", "extracto de té verde", "mate", "café soluble"],
      que: "Estimulante natural del café, té y guaraná; se añade a bebidas energéticas.",
      salud: "Hasta 400 mg/día es seguro para adultos (200 mg en embarazo). En exceso causa insomnio, ansiedad y taquicardia. No recomendada para niños."
    },
    {
      id: "taurina", nombre: "Taurina", categoria: "Aminoácido", nivel: "neutral",
      alias: ["taurina"],
      que: "Aminoácido presente en bebidas energéticas.",
      salud: "Considerada segura en las cantidades habituales de estas bebidas."
    },
    {
      id: "alcohol", nombre: "Alcohol", categoria: "Alcohol", nivel: "evitar",
      alias: ["alcohol", "alcohol etílico", "ron", "brandy", "licor", "vino", "cerveza", "whisky", "coñac"],
      que: "Etanol procedente de bebidas alcohólicas.",
      salud: "Es cancerígeno (IARC grupo 1) y no existe un nivel de consumo seguro según la OMS. En dulces y salsas la cantidad suele ser pequeña. Evitar en embarazo y niños."
    },
    {
      id: "aroma", nombre: "Aromas", categoria: "Aroma", nivel: "neutral",
      alias: ["aroma", "aromas", "aroma natural", "aromas naturales", "aroma natural de vainilla", "aromatizante", "saborizante", "saborizantes", "aroma idéntico al natural", "aroma artificial", "aroma de vainilla", "vainillina", "etilvainillina", "aroma de humo", "aromas de humo"],
      que: "Sustancias que dan o refuerzan el sabor. 'Natural' significa que procede de una fuente natural, no necesariamente del alimento indicado.",
      salud: "Están autorizados y evaluados. Su presencia suele indicar que el sabor no viene del ingrediente real (p. ej. 'aroma de fresa' en vez de fresa)."
    },

    // ───────────── Vitaminas y minerales ─────────────
    {
      id: "vitaminas", nombre: "Vitaminas añadidas", categoria: "Vitaminas", nivel: "bueno",
      alias: ["vitaminas", "vitamina a", "vitamina b1", "vitamina b2", "vitamina b3", "vitamina b6", "vitamina b12", "vitamina d", "vitamina d3", "vitamina k", "tiamina", "niacina", "ácido fólico", "folato", "biotina", "ácido pantoténico", "piridoxina", "cianocobalamina", "colecalciferol", "acetato de retinilo", "nicotinamida"],
      que: "Vitaminas añadidas para enriquecer el producto.",
      salud: "Ayudan a cubrir necesidades nutricionales. Aun así, que un producto esté enriquecido no lo convierte en saludable."
    },
    {
      id: "minerales", nombre: "Minerales añadidos", categoria: "Minerales", nivel: "bueno",
      alias: ["minerales", "hierro", "calcio", "zinc", "magnesio", "yodo", "fosfato cálcico", "carbonato cálcico", "carbonato de calcio", "fumarato ferroso", "sulfato ferroso", "pirofosfato férrico", "óxido de zinc", "yoduro potásico", "citrato de calcio"],
      que: "Minerales añadidos para enriquecer el producto.",
      salud: "Útiles para prevenir carencias (hierro, calcio, yodo). En exceso, el hierro puede causar molestias digestivas."
    },

    // ───────────── Aditivos: colorantes ─────────────
    {
      id: "curcumina", nombre: "Curcumina", e: ["E100"], categoria: "Colorante natural", nivel: "neutral",
      alias: ["curcumina"],
      que: "Colorante amarillo extraído de la cúrcuma.",
      salud: "Seguro. Tiene propiedades antioxidantes."
    },
    {
      id: "riboflavina", nombre: "Riboflavina", e: ["E101"], categoria: "Colorante / vitamina", nivel: "neutral",
      alias: ["riboflavina", "riboflavina-5-fosfato"],
      que: "Vitamina B2 usada como colorante amarillo.",
      salud: "Segura; es una vitamina."
    },
    {
      id: "colorantes-southampton", nombre: "Colorantes azoicos (tartrazina, amarillo ocaso, azorrubina, ponceau 4R, rojo allura, amarillo de quinoleína)", e: ["E102", "E104", "E110", "E122", "E124", "E129"], categoria: "Colorante artificial", nivel: "evitar",
      alias: ["tartrazina", "amarillo de quinoleína", "amarillo ocaso", "amarillo anaranjado s", "amarillo ocaso fcf", "azorrubina", "carmoisina", "ponceau 4r", "rojo cochinilla a", "rojo allura", "rojo allura ac"],
      que: "Colorantes sintéticos que dan colores llamativos a golosinas, refrescos y postres.",
      salud: "Un estudio de la Universidad de Southampton (2007) los relacionó con hiperactividad en niños; en la UE los productos que los contienen deben advertir: 'puede tener efectos negativos sobre la actividad y la atención de los niños'. La tartrazina puede provocar reacciones en personas sensibles a la aspirina."
    },
    {
      id: "cochinilla", nombre: "Carmín / cochinilla", e: ["E120"], categoria: "Colorante natural", nivel: "moderar",
      alias: ["carmín", "cochinilla", "ácido carmínico", "carmines"],
      que: "Colorante rojo obtenido de insectos (cochinilla).",
      salud: "Puede causar reacciones alérgicas (incluso graves) en personas sensibles. No apto para veganos ni vegetarianos."
    },
    {
      id: "eritrosina", nombre: "Eritrosina", e: ["E127"], categoria: "Colorante artificial", nivel: "evitar",
      alias: ["eritrosina"],
      que: "Colorante rojo sintético, en la UE sólo permitido en cerezas de cóctel.",
      salud: "Puede afectar a la función tiroidea. EE. UU. la prohibió en alimentos en 2025."
    },
    {
      id: "azules-sinteticos", nombre: "Colorantes azules/verdes sintéticos", e: ["E131", "E132", "E133", "E142", "E151", "E155"], categoria: "Colorante artificial", nivel: "moderar",
      alias: ["azul patente v", "indigotina", "carmín índigo", "azul brillante", "azul brillante fcf", "verde s", "negro brillante", "negro brillante bn", "marrón ht"],
      que: "Colorantes sintéticos usados en golosinas, bebidas y helados.",
      salud: "Autorizados en la UE, pero sin ningún valor nutricional. Algunos pueden causar reacciones de tipo alérgico en personas sensibles."
    },
    {
      id: "caramelo", nombre: "Colorante caramelo", e: ["E150", "E150a", "E150b", "E150c", "E150d"], categoria: "Colorante", nivel: "moderar",
      alias: ["caramelo", "colorante caramelo", "caramelo natural", "caramelo de sulfito amónico", "caramelo amónico", "caramelo cáustico"],
      que: "Colorante marrón obtenido calentando azúcares; muy usado en refrescos de cola y salsas.",
      salud: "El E150a es simple caramelo. Los tipos E150c y E150d (con amoniaco) pueden contener 4-MEI, sustancia clasificada como 'posiblemente cancerígena'; la EFSA considera seguros los niveles habituales."
    },
    {
      id: "dioxido-titanio", nombre: "Dióxido de titanio", e: ["E171"], categoria: "Colorante", nivel: "evitar",
      alias: ["dióxido de titanio"],
      que: "Pigmento blanco usado para blanquear chicles, grageas y glaseados.",
      salud: "Prohibido en la UE desde 2022: la EFSA no pudo descartar que dañe el ADN (genotoxicidad) en forma de nanopartículas. Si aparece, probablemente sea un producto importado."
    },
    {
      id: "colorantes-naturales", nombre: "Colorantes de origen vegetal", e: ["E140", "E141", "E153", "E160", "E160a", "E160b", "E160c", "E160d", "E160e", "E161b", "E162", "E163"], categoria: "Colorante natural", nivel: "neutral",
      alias: ["clorofila", "clorofilas", "complejos cúpricos de clorofila", "carbón vegetal", "carotenos", "betacaroteno", "beta-caroteno", "annatto", "achiote", "bixina", "norbixina", "extracto de pimentón", "paprika", "capsantina", "licopeno", "luteína", "rojo de remolacha", "betanina", "antocianinas", "antocianos", "concentrado de zanahoria negra", "extracto de espirulina", "espirulina", "concentrado de rábano"],
      que: "Colorantes obtenidos de plantas, algas o verduras.",
      salud: "Considerados seguros. El annatto (E160b) puede provocar reacciones en personas muy sensibles."
    },

    // ───────────── Aditivos: conservantes ─────────────
    {
      id: "sorbatos", nombre: "Ácido sórbico / sorbatos", e: ["E200", "E202", "E203"], categoria: "Conservante", nivel: "neutral",
      alias: ["ácido sórbico", "sorbato potásico", "sorbato de potasio", "sorbato cálcico", "sorbato"],
      que: "Conservante que impide el crecimiento de mohos y levaduras.",
      salud: "Uno de los conservantes mejor tolerados. Raramente causa irritación cutánea."
    },
    {
      id: "benzoatos", nombre: "Ácido benzoico / benzoatos", e: ["E210", "E211", "E212", "E213"], categoria: "Conservante", nivel: "moderar",
      alias: ["ácido benzoico", "benzoato sódico", "benzoato de sodio", "benzoato potásico", "benzoato de potasio", "benzoato cálcico", "benzoato"],
      que: "Conservante usado en refrescos, salsas y encurtidos.",
      salud: "Junto con vitamina C (ácido ascórbico) puede formar pequeñas cantidades de benceno, un cancerígeno. Puede agravar el asma o la urticaria en personas sensibles y se ha relacionado con hiperactividad cuando se combina con colorantes artificiales."
    },
    {
      id: "sulfitos", nombre: "Sulfitos", e: ["E220", "E221", "E222", "E223", "E224", "E225", "E226", "E227", "E228"], categoria: "Conservante", nivel: "moderar", alergeno: "sulfitos",
      alias: ["sulfitos", "anhídrido sulfuroso", "dióxido de azufre", "metabisulfito sódico", "metabisulfito potásico", "bisulfito sódico", "sulfito sódico", "disulfito sódico", "disulfito potásico", "metabisulfito", "bisulfito"],
      que: "Conservantes y antioxidantes usados en vino, frutas secas, embutidos y gambas.",
      salud: "Pueden desencadenar crisis de asma y reacciones alérgicas en personas sensibles; son alérgenos de declaración obligatoria. Destruyen la vitamina B1."
    },
    {
      id: "nitritos", nombre: "Nitritos y nitratos", e: ["E249", "E250", "E251", "E252"], categoria: "Conservante", nivel: "evitar",
      alias: ["nitrito sódico", "nitrito de sodio", "nitrito potásico", "nitrato sódico", "nitrato potásico", "nitrato de potasio", "nitrato de sodio", "nitritos", "nitratos", "nitrito", "nitrato", "sal de curado", "sal nitrificada"],
      que: "Conservantes de embutidos, jamón cocido y carnes curadas. Evitan el botulismo y dan el color rosado.",
      salud: "En el organismo y al cocinar a alta temperatura pueden formar nitrosaminas, cancerígenas. La OMS clasifica la carne procesada como cancerígena (grupo 1) para el cáncer colorrectal, en parte por estos aditivos. Conviene limitar el consumo de embutidos."
    },
    {
      id: "propionatos", nombre: "Ácido propiónico / propionatos", e: ["E280", "E281", "E282", "E283"], categoria: "Conservante", nivel: "neutral",
      alias: ["ácido propiónico", "propionato cálcico", "propionato de calcio", "propionato sódico", "propionato potásico"],
      que: "Conservante antimoho típico del pan de molde.",
      salud: "Considerado seguro. Algunos estudios preliminares lo relacionan con alteraciones en la regulación de la glucosa, pero no hay evidencia concluyente."
    },
    {
      id: "natamicina", nombre: "Natamicina", e: ["E235"], categoria: "Conservante", nivel: "neutral",
      alias: ["natamicina"],
      que: "Antifúngico aplicado en la corteza de quesos y embutidos.",
      salud: "Seguro en las cantidades usadas. Se recomienda no comer la corteza tratada."
    },
    {
      id: "acidos-organicos", nombre: "Ácido acético / láctico / málico / fumárico", e: ["E260", "E261", "E262", "E263", "E270", "E296", "E297", "E325", "E326", "E327", "E334", "E335", "E336", "E337", "E353", "E354"], categoria: "Acidulante", nivel: "neutral",
      alias: ["ácido acético", "acetato sódico", "diacetato sódico", "ácido láctico", "lactato sódico", "lactato de sodio", "lactato potásico", "lactato cálcico", "ácido málico", "ácido fumárico", "ácido tartárico", "tartrato", "lactatos", "acetatos", "acetato de sodio"],
      que: "Ácidos presentes de forma natural en alimentos; regulan la acidez y ayudan a conservar.",
      salud: "Seguros. En bebidas ácidas frecuentes pueden contribuir a la erosión del esmalte dental."
    },
    {
      id: "acido-citrico", nombre: "Ácido cítrico / citratos", e: ["E330", "E331", "E332", "E333"], categoria: "Acidulante", nivel: "neutral",
      alias: ["ácido cítrico", "citrato sódico", "citratos de sodio", "citrato de sodio", "citrato potásico", "citrato cálcico", "citratos", "citrato trisódico"],
      que: "Ácido natural de los cítricos, producido industrialmente por fermentación. Da sabor ácido y conserva.",
      salud: "Seguro. Muy frecuente en bebidas: en exceso puede dañar el esmalte dental."
    },

    // ───────────── Aditivos: antioxidantes ─────────────
    {
      id: "acido-ascorbico", nombre: "Ácido ascórbico (vitamina C)", e: ["E300", "E301", "E302", "E304"], categoria: "Antioxidante", nivel: "bueno",
      alias: ["ácido ascórbico", "ascorbato sódico", "ascorbato de sodio", "ascorbato cálcico", "palmitato de ascorbilo", "vitamina c", "ácido l-ascórbico", "ascorbato"],
      que: "Vitamina C usada para evitar que el alimento se oxide.",
      salud: "Segura y beneficiosa. En embutidos ayuda a reducir la formación de nitrosaminas."
    },
    {
      id: "acido-eritorbico", nombre: "Ácido eritórbico / eritorbato", e: ["E315", "E316"], categoria: "Antioxidante", nivel: "neutral",
      alias: ["ácido eritórbico", "eritorbato sódico", "eritorbato de sodio", "isoascorbato sódico"],
      que: "Forma similar a la vitamina C usada en carnes curadas.",
      salud: "Seguro; no tiene actividad vitamínica."
    },
    {
      id: "tocoferoles", nombre: "Tocoferoles (vitamina E)", e: ["E306", "E307", "E308", "E309"], categoria: "Antioxidante", nivel: "bueno",
      alias: ["tocoferoles", "tocoferol", "extracto rico en tocoferoles", "alfa-tocoferol", "vitamina e", "tocoferoles naturales", "extracto de romero"],
      que: "Vitamina E natural usada para que las grasas no se enrancien.",
      salud: "Seguros; son antioxidantes naturales."
    },
    {
      id: "bha-bht", nombre: "BHA / BHT / TBHQ", e: ["E319", "E320", "E321"], categoria: "Antioxidante sintético", nivel: "evitar",
      alias: ["butilhidroxianisol", "butilhidroxitolueno", "bha", "bht", "tbhq", "terbutilhidroquinona", "butilhidroquinona terciaria"],
      que: "Antioxidantes sintéticos que evitan el enranciamiento de aceites, snacks y cereales.",
      salud: "La IARC clasifica el BHA como 'posiblemente cancerígeno' (2B). El BHT y el TBHQ tienen estudios en animales con efectos sobre hígado, tiroides o sistema inmune. Mejor limitarlos."
    },
    {
      id: "galatos", nombre: "Galatos", e: ["E310", "E311", "E312"], categoria: "Antioxidante sintético", nivel: "moderar",
      alias: ["galato de propilo", "galato de octilo", "galato de dodecilo", "galatos"],
      que: "Antioxidantes sintéticos para grasas.",
      salud: "Pueden causar reacciones alérgicas cutáneas e irritación gástrica en personas sensibles."
    },
    {
      id: "edta", nombre: "EDTA", e: ["E385"], categoria: "Secuestrante", nivel: "moderar",
      alias: ["edta", "edta cálcico disódico", "etilendiaminotetraacetato cálcico disódico"],
      que: "Sustancia que atrapa metales para evitar que el producto cambie de color o sabor (mayonesas, conservas).",
      salud: "Autorizado en pequeñas cantidades. Puede reducir la absorción de minerales como el hierro o el zinc."
    },

    // ───────────── Aditivos: espesantes y gelificantes ─────────────
    {
      id: "pectina", nombre: "Pectina", e: ["E440"], categoria: "Gelificante", nivel: "bueno",
      alias: ["pectina", "pectinas", "pectina amidada"],
      que: "Fibra natural de las frutas; gelifica mermeladas.",
      salud: "Es fibra soluble: segura y beneficiosa para la digestión."
    },
    {
      id: "gomas-vegetales", nombre: "Gomas vegetales (xantana, guar, garrofín, arábiga…)", e: ["E410", "E412", "E413", "E414", "E415", "E416", "E417", "E418"], categoria: "Espesante", nivel: "neutral",
      alias: ["goma xantana", "goma xántica", "xantana", "goma guar", "guar", "goma garrofín", "goma de garrofín", "harina de semillas de algarrobo", "garrofín", "goma arábiga", "goma acacia", "goma tragacanto", "goma gellan", "goma gelano", "goma tara", "goma karaya"],
      que: "Fibras de plantas o fermentación que espesan y estabilizan.",
      salud: "Seguras. Son fibra soluble; en grandes cantidades pueden causar gases o hinchazón."
    },
    {
      id: "agar-alginatos", nombre: "Agar / alginatos", e: ["E400", "E401", "E402", "E403", "E404", "E405", "E406"], categoria: "Gelificante", nivel: "neutral",
      alias: ["agar", "agar-agar", "ácido algínico", "alginato sódico", "alginato de sodio", "alginato cálcico", "alginatos"],
      que: "Gelificantes extraídos de algas.",
      salud: "Seguros. Aportan fibra."
    },
    {
      id: "carragenano", nombre: "Carragenano", e: ["E407", "E407a"], categoria: "Espesante", nivel: "moderar",
      alias: ["carragenano", "carragenina", "carragenanos", "carragenatos", "alga euchema transformada", "algas eucheuma transformadas"],
      que: "Espesante extraído de algas rojas, usado en lácteos, bebidas vegetales y fiambres.",
      salud: "La EFSA lo considera seguro, pero no en preparados para lactantes. Estudios en animales sugieren que podría favorecer la inflamación intestinal; se aconseja precaución si hay enfermedad inflamatoria intestinal."
    },
    {
      id: "celulosas", nombre: "Celulosa y derivados", e: ["E460", "E461", "E463", "E464", "E465", "E466", "E468", "E469"], categoria: "Espesante", nivel: "neutral",
      alias: ["celulosa", "celulosa microcristalina", "celulosa en polvo", "metilcelulosa", "hidroxipropilmetilcelulosa", "hidroxipropilcelulosa", "carboximetilcelulosa", "carboximetilcelulosa sódica", "carmelosa", "cmc"],
      que: "Fibras de origen vegetal usadas como espesante o antiaglomerante.",
      salud: "Generalmente seguras. La carboximetilcelulosa (E466) ha mostrado en estudios con ratones y en un ensayo pequeño en humanos alteraciones de la microbiota intestinal."
    },

    // ───────────── Aditivos: emulgentes ─────────────
    {
      id: "lecitinas", nombre: "Lecitinas", e: ["E322"], categoria: "Emulgente", nivel: "neutral",
      alias: ["lecitina", "lecitinas", "lecitina de soja", "lecitina de girasol", "lecitina de colza", "lecitinas de soja", "lecitinas de girasol"],
      que: "Emulgente natural que ayuda a mezclar agua y grasa (chocolate, margarina).",
      salud: "Segura. Si procede de soja puede afectar a personas con alergia grave a la soja."
    },
    {
      id: "mono-diglicéridos", nombre: "Mono- y diglicéridos de ácidos grasos", e: ["E471", "E472", "E472a", "E472b", "E472c", "E472e", "E472f"], categoria: "Emulgente", nivel: "moderar",
      alias: ["mono y diglicéridos de ácidos grasos", "mono- y diglicéridos de ácidos grasos", "monoglicéridos y diglicéridos de ácidos grasos", "mono y diglicéridos", "monoglicéridos", "diglicéridos", "ésteres de mono y diglicéridos", "ésteres acéticos de mono y diglicéridos", "ésteres lácticos de mono y diglicéridos", "ésteres cítricos de mono y diglicéridos", "ésteres monoacetiltartárico y diacetiltartárico de mono y diglicéridos", "datem", "emulsionantes de ácidos grasos"],
      que: "Emulgentes muy comunes en pan de molde, bollería, helados y margarinas.",
      salud: "Autorizados. Un gran estudio francés (NutriNet-Santé, 2023) asoció su mayor consumo con más riesgo cardiovascular y de algunos cánceres; es un estudio observacional y se necesitan más datos. Pueden contener pequeñas cantidades de grasas trans."
    },
    {
      id: "polisorbatos", nombre: "Polisorbatos", e: ["E432", "E433", "E434", "E435", "E436"], categoria: "Emulgente", nivel: "moderar",
      alias: ["polisorbato", "polisorbatos", "polisorbato 80", "polisorbato 60", "polisorbato 20", "monooleato de polioxietilen sorbitano"],
      que: "Emulgentes sintéticos en helados, salsas y postres.",
      salud: "Autorizados. El polisorbato 80 ha mostrado en estudios con ratones alterar la microbiota y favorecer la inflamación intestinal."
    },
    {
      id: "esteres-sacarosa", nombre: "Ésteres de sacarosa y sorbitano", e: ["E473", "E474", "E475", "E477", "E481", "E482", "E491", "E492", "E493", "E494", "E495"], categoria: "Emulgente", nivel: "neutral",
      alias: ["sucroésteres", "ésteres de sacarosa de ácidos grasos", "estearoil-2-lactilato sódico", "estearoil lactilato sódico", "estearoil-2-lactilato cálcico", "monoestearato de sorbitano", "triestearato de sorbitano", "ésteres de poliglicerol"],
      que: "Emulgentes sintéticos que mejoran la textura del pan y la bollería.",
      salud: "Considerados seguros en las cantidades usadas."
    },
    {
      id: "pgpr", nombre: "Polirricinoleato de poliglicerol (PGPR)", e: ["E476"], categoria: "Emulgente", nivel: "neutral",
      alias: ["polirricinoleato de poliglicerol", "pgpr", "poliricinoleato de poliglicerol"],
      que: "Emulgente que permite usar menos manteca de cacao en el chocolate.",
      salud: "Seguro según la EFSA; su uso suele indicar un chocolate de menor calidad."
    },
    {
      id: "glicerol", nombre: "Glicerina / glicerol", e: ["E422"], categoria: "Humectante", nivel: "neutral",
      alias: ["glicerina", "glicerol"],
      que: "Mantiene la humedad en bollería y golosinas.",
      salud: "Seguro. En grandes cantidades puede tener efecto laxante."
    },

    // ───────────── Aditivos: fosfatos ─────────────
    {
      id: "acido-fosforico", nombre: "Ácido fosfórico", e: ["E338"], categoria: "Acidulante", nivel: "moderar",
      alias: ["ácido fosfórico", "acido ortofosfórico"],
      que: "Acidulante característico de los refrescos de cola.",
      salud: "El consumo habitual de colas se asocia con menor densidad ósea y erosión dental. El exceso de fósforo es perjudicial en enfermedad renal."
    },
    {
      id: "fosfatos", nombre: "Fosfatos y polifosfatos", e: ["E339", "E340", "E341", "E343", "E450", "E451", "E452"], categoria: "Estabilizante / gasificante", nivel: "moderar",
      alias: ["fosfatos", "fosfato", "fosfato sódico", "fosfatos de sodio", "fosfato potásico", "fosfatos de potasio", "fosfatos de calcio", "difosfatos", "difosfato", "trifosfatos", "trifosfato", "polifosfatos", "polifosfato", "difosfato disódico", "pirofosfato ácido de sodio", "tripolifosfato sódico", "fosfato monocálcico", "fosfato disódico", "fosfato trisódico"],
      que: "Sales usadas para retener agua en carnes y embutidos, como gasificantes en repostería y para fundir quesos.",
      salud: "El fósforo añadido como aditivo se absorbe casi por completo. Su exceso se relaciona con daño vascular y es especialmente perjudicial en enfermedad renal crónica. La EFSA fijó en 2019 un límite de ingesta diaria."
    },

    // ───────────── Aditivos: gasificantes, antiaglomerantes y otros ─────────────
    {
      id: "carbonatos", nombre: "Bicarbonato y carbonatos", e: ["E500", "E501", "E503", "E504", "E170"], categoria: "Gasificante", nivel: "neutral",
      alias: ["bicarbonato sódico", "bicarbonato de sodio", "carbonato sódico", "carbonatos de sodio", "carbonato potásico", "carbonatos de potasio", "bicarbonato amónico", "carbonatos de amonio", "carbonato amónico", "carbonato de magnesio", "carbonato magnésico", "bicarbonato", "gasificantes"],
      que: "Gasificantes que hacen subir masas de galletas y bizcochos.",
      salud: "Seguros. El bicarbonato sódico aporta algo de sodio."
    },
    {
      id: "dioxido-carbono", nombre: "Dióxido de carbono", e: ["E290"], categoria: "Gas", nivel: "neutral",
      alias: ["dióxido de carbono", "anhídrido carbónico", "gas carbónico"],
      que: "Gas que da las burbujas a las bebidas.",
      salud: "Seguro. Puede causar hinchazón en personas sensibles."
    },
    {
      id: "antiaglomerantes", nombre: "Antiaglomerantes (dióxido de silicio, silicatos)", e: ["E551", "E552", "E553", "E554", "E556", "E559", "E470", "E470a", "E470b"], categoria: "Antiaglomerante", nivel: "neutral",
      alias: ["dióxido de silicio", "sílice", "silicato cálcico", "silicato de calcio", "silicato de magnesio", "talco", "estearato de magnesio", "sales de magnesio de ácidos grasos"],
      que: "Evitan que los polvos (sal, especias, cacao soluble) formen grumos.",
      salud: "Considerados seguros; se absorben muy poco. La EFSA revisa el uso de nanopartículas de sílice."
    },
    {
      id: "aluminio", nombre: "Aditivos con aluminio", e: ["E173", "E520", "E521", "E522", "E523", "E541", "E554", "E555", "E556", "E559"], categoria: "Diversos", nivel: "moderar",
      alias: ["aluminio", "sulfato de aluminio", "fosfato ácido de sodio y aluminio", "silicato de aluminio", "silicato de sodio y aluminio", "aluminosilicato sódico"],
      que: "Aditivos que contienen aluminio (gasificantes, colorantes, antiaglomerantes).",
      salud: "El aluminio se acumula en el organismo y puede afectar al sistema nervioso y los huesos; en niños la ingesta puede superar la tolerable. La UE ha restringido varios de ellos."
    },
    {
      id: "potenciadores", nombre: "Glutamato monosódico", e: ["E620", "E621", "E622", "E623", "E624", "E625"], categoria: "Potenciador del sabor", nivel: "moderar",
      alias: ["glutamato monosódico", "glutamato de sodio", "glutamato", "ácido glutámico", "glutamato potásico", "msg", "l-glutamato monosódico"],
      que: "Potenciador del sabor umami presente en snacks, sopas instantáneas, salsas y comida preparada.",
      salud: "La EFSA (2017) lo considera seguro hasta 30 mg/kg/día, aunque una dieta con muchos procesados puede superarlo. Algunas personas refieren dolor de cabeza o rubor tras grandes dosis. Hace los alimentos más apetecibles y puede favorecer comer más."
    },
    {
      id: "ribonucleotidos", nombre: "Inosinato y guanilato (ribonucleótidos)", e: ["E626", "E627", "E628", "E629", "E630", "E631", "E632", "E633", "E634", "E635"], categoria: "Potenciador del sabor", nivel: "moderar",
      alias: ["guanilato disódico", "inosinato disódico", "ribonucleótidos disódicos", "5'-ribonucleótidos disódicos", "ribonucleótidos de sodio", "guanilato", "inosinato"],
      que: "Potenciadores que multiplican el efecto del glutamato.",
      salud: "Seguros para la mayoría. Deben evitarlos las personas con gota o ácido úrico alto (son purinas)."
    },
    {
      id: "agentes-recubrimiento", nombre: "Ceras y agentes de recubrimiento", e: ["E901", "E902", "E903", "E904", "E905", "E914"], categoria: "Agente de recubrimiento", nivel: "neutral",
      alias: ["cera de abejas", "cera carnauba", "cera de carnauba", "cera candelilla", "goma laca", "shellac", "cera microcristalina", "parafina"],
      que: "Dan brillo y protegen golosinas, grageas y la piel de frutas.",
      salud: "Seguras en las cantidades utilizadas. La goma laca y la cera de abejas no son veganas."
    },
    {
      id: "antiespumantes", nombre: "Dimetilpolisiloxano", e: ["E900"], categoria: "Antiespumante", nivel: "neutral",
      alias: ["dimetilpolisiloxano", "dimeticona", "polidimetilsiloxano"],
      que: "Silicona que evita la formación de espuma en aceites de fritura y bebidas.",
      salud: "Se absorbe muy poco; considerado seguro."
    },
    {
      id: "acidulantes-varios", nombre: "Hidróxidos y correctores de acidez", e: ["E524", "E525", "E526", "E527", "E528", "E529", "E575"], categoria: "Corrector de acidez", nivel: "neutral",
      alias: ["hidróxido sódico", "hidróxido de sodio", "hidróxido potásico", "hidróxido cálcico", "glucono-delta-lactona", "gluconodeltalactona", "óxido de magnesio", "cloruro cálcico", "cloruro de calcio", "cloruro de magnesio", "sulfato cálcico"],
      que: "Regulan la acidez o ayudan a coagular (tofu, quesos, aceitunas).",
      salud: "Seguros en las cantidades usadas."
    }
  ];

  // Palabras que indican la función del aditivo; no son ingredientes en sí.
  const PALABRAS_FUNCION = [
    "ingredientes", "ingrediente", "contiene", "colorante", "colorantes", "conservante", "conservantes",
    "conservador", "conservadores", "emulgente", "emulgentes", "emulsionante", "emulsionantes", "estabilizante",
    "estabilizantes", "estabilizador", "estabilizadores", "espesante", "espesantes", "gelificante", "gelificantes",
    "antioxidante", "antioxidantes", "acidulante", "acidulantes", "corrector de acidez", "correctores de acidez",
    "regulador de acidez", "reguladores de acidez", "regulador de la acidez", "gasificante", "gasificantes",
    "impulsor", "impulsores", "impulsor químico", "impulsores químicos", "leudante", "leudantes", "agente leudante",
    "edulcorante", "edulcorantes", "potenciador del sabor", "potenciadores del sabor", "resaltador de sabor",
    "humectante", "humectantes", "antiaglomerante", "antiaglomerantes", "agente de recubrimiento",
    "agentes de recubrimiento", "secuestrante", "secuestrantes", "antiespumante", "sales de fundido",
    "sales fundentes", "mejorante", "mejorantes", "agente de tratamiento de la harina", "aditivos", "aditivo",
    "incluye", "trazas", "puede contener", "puede contener trazas", "puede contener trazas de", "contiene trazas de",
    "elaborado en una fábrica que", "en proporción variable", "en proporciones variables", "variable",
    "otros", "y", "o", "de", "con", "sin", "min", "mín", "mínimo", "max", "máx", "aprox",
    "cobertura", "relleno", "masa", "base", "crema", "galleta", "chocolate con leche", "chocolate negro", "chocolate"
  ];

  const api = { INGREDIENTES, PALABRAS_FUNCION };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SaludDB = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
