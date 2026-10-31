# Beta de NutriLog: un link para cualquier celular (sin cuenta de Claude)

Al final de esta guía vas a tener un link como `https://nutrilog-servidor.TU-USUARIO.workers.dev`. Cualquiera lo abre desde su celular (iPhone o Android), sin instalar nada y sin cuenta de Claude, y lo puede agregar a la pantalla de inicio como una app.

**Costo:** Cloudflare es gratis. La lectura de fotos con Claude la pagás vos, unos US$ 0,04 por foto: **con US$ 5 alcanza para ~120 escaneos**, suficiente para una beta de 20 personas.

**Tiempo:** unos 20 minutos, una sola vez. Necesitás una computadora (Windows o Mac).

---

## 1. Instalar Node.js

Entrá a <https://nodejs.org>, descargá la versión **LTS** e instalala con las opciones que vienen por defecto.

## 2. Descargar el proyecto

1. Descargá este archivo: <https://github.com/joaquinerhart/App-Salud/archive/refs/heads/claude/food-ingredient-analyzer-gawzqq.zip>
2. Descomprimilo (clic derecho → «Extraer todo» en Windows, o doble clic en Mac).
3. Adentro hay una carpeta llamada **servidor**.

## 3. Crear la clave de Claude y cargar US$ 5

1. Entrá a <https://platform.claude.com> y creá una cuenta.
2. **Billing** → cargá **US$ 5** de crédito.
3. **Limits** → poné un **límite de gasto mensual** de US$ 5, así nunca gastás más.
4. **API Keys** → **Create Key** → copiala y guardala. Empieza con `sk-ant-` y solo se muestra una vez.

## 4. Crear una cuenta en Cloudflare

Entrá a <https://dash.cloudflare.com/sign-up> y creá una cuenta gratis.

## 5. Publicar

Abrí una terminal **dentro de la carpeta `servidor`**:
- **Windows:** abrí la carpeta `servidor` en el Explorador, hacé clic en la barra de dirección, escribí `cmd` y apretá Enter.
- **Mac:** clic derecho sobre la carpeta `servidor` → «Nuevo terminal en la carpeta». Si no aparece, abrí Terminal y escribí `cd ` (con espacio) y arrastrá la carpeta adentro.

Copiá y pegá estos comandos **de a uno**, apretando Enter después de cada uno:

```
npm install
```
```
npx wrangler login
```
(Se abre el navegador: tocá **Allow**.)
```
npm run deploy
```
(Al terminar muestra tu link: `https://nutrilog-servidor.TU-USUARIO.workers.dev`.)
```
npx wrangler secret put ANTHROPIC_API_KEY
```
(Pegá la clave de Claude del paso 3 y apretá Enter. No se ve mientras la pegás; es normal.)

## 6. Probar y compartir

1. Abrí tu link en el celular.
2. Escaneá un producto. La primera vez te pide aceptar que la foto se envíe a la IA.
3. Si al final del resultado **no** aparece «Se usó el lector del teléfono…», está leyendo con Claude. ✅
4. Mandá el link por WhatsApp a tus testers.

**Para agregarla a la pantalla de inicio:**
- **iPhone (Safari):** botón Compartir → «Agregar a pantalla de inicio».
- **Android (Chrome):** menú ⋮ → «Agregar a la pantalla principal».

## Si algo sale mal

| Mensaje | Qué hacer |
|---|---|
| `npm` no se reconoce | Cerrá la terminal, abrila de nuevo (después de instalar Node.js) |
| «el servidor de NutriLog no tiene configurada la clave de Claude» | Repetí el último comando (`wrangler secret put`) |
| «se alcanzó el límite de uso» | Se terminó el crédito de Claude o llegaste al límite de 15 escaneos por minuto |

## Para actualizar la beta

Cuando haya cambios: descargá el ZIP de nuevo y en la carpeta `servidor` corré `npm install` y `npm run deploy`. La clave de Claude ya queda guardada.

## Cuánto llevás gastado

En <https://platform.claude.com> → **Usage**.
