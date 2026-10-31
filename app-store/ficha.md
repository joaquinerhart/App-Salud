# Ficha de NutriLog para App Store Connect

Textos listos para copiar y pegar en App Store Connect. Entre paréntesis, el límite de caracteres de Apple.

## Datos de la app

| Campo | Valor |
|---|---|
| Nombre (30) | **NutriLog**. Si está ocupado: **NutriLog: Etiquetas sanas** |
| Subtítulo (30) | ¿Es sano? Escaneá la etiqueta |
| Bundle ID | `com.nutrilog.app` (cambialo si querés, ver la guía) |
| SKU | `nutrilog-ios-001` |
| Idioma principal | Español (México). Apple no tiene «Español (Argentina)»; el de México es el que se usa en Latinoamérica |
| Categoría principal | Comida y bebida |
| Categoría secundaria | Salud y forma física |
| Precio | Gratis |
| Clasificación por edad | 4+ (en el cuestionario, respondé «Ninguno» en todo. Ver la nota abajo) |
| URL de soporte | https://joaquinerhart.github.io/App-Salud/soporte.html |
| URL de política de privacidad | https://joaquinerhart.github.io/App-Salud/privacidad.html |
| Copyright | 2026 [Tu nombre] |

## Texto promocional (170)

Sacale una foto a la lista de ingredientes y en segundos sabé si un alimento es recomendable para tu salud, con una nota del 0 al 10 y los motivos.

## Descripción (4000)

¿Es sano lo que vas a comer? NutriLog te lo dice con una foto.

Sacale una foto a la lista de ingredientes de cualquier alimento envasado y NutriLog la lee por vos: te da una nota del 0 al 10 y te dice si es Recomendado, Poco recomendado o No recomendado, con los motivos explicados en palabras simples.

QUÉ TE MUESTRA
• Una nota del 0 al 10 y un veredicto claro.
• Los motivos, con sellos negros como los del etiquetado frontal: azúcares ocultos, grasas poco saludables, exceso de sal, aditivos y ultraprocesados.
• Los alérgenos que contiene, y los que «puede contener».
• Qué es cada ingrediente y cómo afecta a tu salud, incluidos los aditivos con código INS o E.

HECHA PARA LAS ETIQUETAS DE ARGENTINA
Entiende los códigos INS del Mercosur, el vocabulario local (maní, mandioca, dulce de leche, leudantes químicos…) y las leyendas como «Sin TACC» o «Ley 25.630».

LECTURA PRECISA
Lee fotos reales, aunque estén un poco borrosas o la letra sea chica. Si un ingrediente no está en su base de datos, lo investiga y lo recuerda para la próxima vez.

TU HISTORIAL, EN TU TELÉFONO
Tus últimos productos quedan guardados solo en tu dispositivo. Sin cuentas, sin publicidad y sin rastreo.

CÓMO SE CALCULA LA NOTA
Se basa en las evaluaciones de la Organización Mundial de la Salud (OMS), la Autoridad Europea de Seguridad Alimentaria (EFSA) y la Agencia Internacional de Investigación sobre el Cáncer (IARC). Dentro de la app vas a encontrar el método completo y las fuentes.

IMPORTANTE
NutriLog es una herramienta orientativa y no reemplaza el consejo de un médico o nutricionista. Si tenés alergias, revisá siempre la etiqueta original.

## Palabras clave (100)

```
ingredientes,etiqueta,aditivos,saludable,nutricion,alimentos,ultraprocesado,sellos,escaner,azucar
```
(97 caracteres. Apple ignora los acentos en la búsqueda, y el nombre y el subtítulo ya cuentan como palabras clave, así que no hace falta repetirlos.)

## Novedades de esta versión (para la 1.0)

Primera versión de NutriLog.

## Capturas de pantalla

En `app-store/capturas/` están las 5 capturas de 1290 × 2796 px, el tamaño de iPhone de 6,9" que pide Apple. Subilas en ese orden. Como la app es solo para iPhone, no hacen falta capturas de iPad.

## Privacidad de la app (las «etiquetas nutricionales» de privacidad)

En App Store Connect → tu app → Privacidad de la app → «Empezar»:

1. **¿Recopilás datos de esta app?** → **Sí**.
2. Tipo de dato: **Fotos o videos** (dentro de «Contenido del usuario»). No marques nada más.
3. Para «Fotos o videos»:
   - Uso: **Funcionalidad de la app**.
   - ¿Está vinculado a la identidad del usuario? → **No**.
   - ¿Se usa para rastreo? → **No**.

(Las fotos se envían al servidor para leerlas y no se guardan. Apple igual considera que se «recopilan» porque salen del teléfono.)

## Información para la revisión de Apple

**Iniciar sesión:** no hace falta. La app no tiene cuentas (desmarcá «Se requiere iniciar sesión»).

**Notas para el revisor** (copiar tal cual, en inglés):

> NutriLog reads the ingredient list on a food package photo and rates the product from 0 to 10.
>
> How to test: tap "Escanear ingredientes", take a photo of any food ingredient list (or tap "Desde la galería"). The first time, the app asks for consent to send the photo to an AI service (Claude by Anthropic) to read the text; tap "Aceptar y continuar". You can also tap "Escribirlos" and paste: "Ingredientes: harina de trigo, azúcar, aceite de palma, sal, emulsionante (INS 471)". You can also tap "Ver un resultado de ejemplo" without a photo.
>
> Health information: the rating is informational only. The methodology and sources (WHO, EFSA, IARC, Argentina's Law 27.642) are shown in the app by tapping the (i) button in the top-right corner. A disclaimer is shown on every screen. The app does not provide diagnosis or treatment.
>
> Privacy: no account, no ads, no tracking. Photos are sent to our server only after the user's explicit consent, used only to read the text with Anthropic's Claude API, and not stored. History is stored only on the device.

## Nota sobre la clasificación por edad

La app da información sobre alimentos, no información médica ni de tratamientos. Por eso, en el cuestionario corresponde «Ninguno» en «Información médica o de tratamiento». Si Apple pide otra cosa, la cambiás y listo: no afecta a la revisión.
