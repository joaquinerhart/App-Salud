# Cómo publicar NutriLog en la App Store

Guía paso a paso. Algunas cosas solo las podés hacer vos: pagar la cuenta de Apple, firmar la app y enviarla a revisión. Todo lo demás ya está preparado en el proyecto.

## Lo que ya está listo

- ✅ App de iPhone con Capacitor (carpeta `ios/`), solo para iPhone y en vertical.
- ✅ Ícono y pantalla de inicio (claro y oscuro).
- ✅ Textos de permiso de cámara y fotos en español.
- ✅ Manifiesto de privacidad (`PrivacyInfo.xcprivacy`) y declaración de cifrado.
- ✅ Pedido de consentimiento antes de enviar fotos a la IA (Apple lo exige).
- ✅ Pantalla «Cómo calculamos la nota» con fuentes (Apple lo pide a las apps con información de salud).
- ✅ Funciona sin internet con el lector del teléfono (menos preciso).
- ✅ Servidor para leer con Claude sin poner la clave dentro de la app (`servidor/`).
- ✅ Política de privacidad (`privacidad.html`) y página de soporte (`soporte.html`).
- ✅ Textos para la ficha de la tienda y 5 capturas (`app-store/`).

## Lo que tenés que hacer vos

### Paso 1. Cuenta de desarrollador de Apple (US$ 99 por año)

1. Entrá a <https://developer.apple.com/programs/enroll/> con tu Apple ID.
2. Inscribite como **Individual** (persona). Te pide verificar tu identidad desde la app «Apple Developer» del iPhone.
3. Pagás US$ 99. La aprobación tarda de unas horas a dos días.

> Si más adelante querés publicar como empresa, se necesita un número D-U-N-S. Para empezar, como persona alcanza.

### Paso 2. Completar tus datos de contacto

En `privacidad.html` y `soporte.html`, reemplazá `[TU-EMAIL-DE-CONTACTO]` por un email donde quieras recibir consultas. Puede ser uno nuevo, solo para la app.

### Paso 3. Publicar las páginas de privacidad y soporte

Apple pide que estén en internet:

1. En GitHub, en tu repositorio: **Settings → Pages**.
2. En «Branch» elegí la rama donde estén estos archivos y la carpeta `/ (root)`. Tocá **Save**.
3. A los pocos minutos quedan en:
   - <https://joaquinerhart.github.io/App-Salud/privacidad.html>
   - <https://joaquinerhart.github.io/App-Salud/soporte.html>

### Paso 4. Poner en marcha el servidor

Seguí `servidor/README.md`. Son unos 10 minutos: creás una cuenta gratis de Cloudflare, cargás tu clave de Claude y lo publicás. Al final pegás la dirección del servidor en `nutrilog.config.json`.

> Sin servidor la app funciona igual, pero solo con el lector del teléfono, que lee bastante peor las fotos reales.

### Paso 5. Crear la app en App Store Connect

1. Entrá a <https://appstoreconnect.apple.com> → **Apps** → **+** → **Nueva app**.
2. Plataforma: **iOS**. Nombre: **NutriLog**. Idioma principal: **Español (México)**. SKU: `nutrilog-ios-001`.
3. **Bundle ID**: primero hay que registrarlo en <https://developer.apple.com/account/resources/identifiers> → **+** → App IDs → App → Explicit: `com.nutrilog.app`.
   - Si ese nombre está ocupado, usá otro (por ejemplo `com.TU-NOMBRE.nutrilog`) y cambialo también en `capacitor.config.json`, en `codemagic.yaml` y en Xcode.
4. Si te dice que el nombre «NutriLog» ya está en uso, probá **NutriLog: Etiquetas sanas**. El nombre de la tienda tiene que ser único; el que aparece debajo del ícono en el teléfono sigue siendo «NutriLog».

### Paso 6. Compilar y subir la app

Para compilar una app de iPhone hace falta un Mac con Xcode. Hay dos caminos.

#### Opción A: con un Mac

1. Instalá **Xcode** desde la Mac App Store y [Node.js](https://nodejs.org).
2. En la terminal, dentro de la carpeta del proyecto:
   ```bash
   npm install
   npm run ios      # arma la app y abre Xcode
   ```
3. En Xcode: elegí el proyecto **App** → pestaña **Signing & Capabilities** → **Team**: tu cuenta de desarrollador.
4. Para probarla en tu iPhone: conectalo por cable, elegilo arriba y tocá ▶︎.
5. Para subirla: menú **Product → Archive** → **Distribute App** → **App Store Connect** → **Upload**.

#### Opción B: sin Mac, con Codemagic

[Codemagic](https://codemagic.io) compila en Macs en la nube. Tiene 500 minutos gratis por mes, y cada compilación tarda unos 10 a 15.

1. En App Store Connect: **Usuarios y acceso → Integraciones → App Store Connect API → +**. Creá una clave con acceso **App Manager** y descargá el archivo `.p8`. Anotá el **Issuer ID** y el **Key ID**.
2. Creá una cuenta en Codemagic entrando con GitHub y agregá este repositorio.
3. En Codemagic: **Team settings → Integrations → Developer Portal → Connect**. Cargá la clave del punto 1 con el nombre exacto `NutriLog App Store Connect`.
4. En **Code signing identities**: generá un certificado de distribución y descargá el perfil para `com.nutrilog.app`. Codemagic lo hace con un par de clics.
5. Abrí la app en Codemagic y tocá **Start new build** con el flujo «NutriLog iOS → App Store». Ya está configurado en `codemagic.yaml`.
6. Si todo sale bien, la app aparece en **TestFlight** dentro de App Store Connect.

### Paso 7. Probar con TestFlight

1. Instalá la app **TestFlight** en tu iPhone.
2. En App Store Connect → tu app → **TestFlight** → agregate como probador interno.
3. Probá con productos reales: comidas, bebidas, sin internet, aceptando y rechazando el consentimiento.

### Paso 8. Completar la ficha y enviar a revisión

Todo el texto está en `app-store/ficha.md`, listo para copiar:

1. **Información de la app**: subtítulo, categorías, URL de privacidad.
2. **Precio y disponibilidad**: Gratis. Elegí los países (podés empezar por Argentina y Latinoamérica).
3. **Privacidad de la app**: las respuestas exactas están en la ficha.
4. **Clasificación por edad**: el cuestionario, todo en «Ninguno» (queda 4+).
5. **Versión 1.0**: capturas de `app-store/capturas/`, descripción, palabras clave, URL de soporte, la compilación que subiste y las notas para el revisor.
6. Tocá **Agregar para revisión** → **Enviar a revisión**.

La revisión suele tardar de 1 a 3 días. Si Apple pide cambios, te escribe en App Store Connect: mandame el mensaje y lo resolvemos.

## Por qué la rechazan más seguido, y cómo ya está cubierto

| Motivo (guía de Apple) | Cómo lo cubre NutriLog |
|---|---|
| 1.4.1 Información de salud sin respaldo | Pantalla (i) con método y fuentes, y aviso en cada pantalla |
| 2.1 La app no anda en la revisión | Botón «Ver un resultado de ejemplo» y opción de escribir los ingredientes. Además, tener el servidor andando |
| 4.2 Es «solo una web» | Cámara, funciona sin internet, historial local, contenido incluido en la app |
| 5.1.1 Privacidad | Política publicada, sin cuentas, manifiesto de privacidad |
| 5.1.2 Datos enviados a IA de terceros | Consentimiento explícito antes de la primera foto, que nombra a Anthropic |

## Costos

| Concepto | Costo |
|---|---|
| Cuenta de Apple | US$ 99 por año |
| Servidor (Cloudflare) | Gratis hasta 100.000 pedidos por día |
| Claude (lectura de fotos) | Unos US$ 0,04 por escaneo con el modelo actual. Podés poner un tope mensual |
| Codemagic (si no tenés Mac) | Gratis hasta 500 minutos por mes |

## Cada vez que quieras sacar una versión nueva

1. Hacé los cambios y probá con `npm test`.
2. Subí el número de versión en Xcode (pestaña **General**, «Version», por ejemplo 1.1). Con Codemagic, el número de compilación sube solo.
3. Compilá y subí igual que en el paso 6.
4. En App Store Connect, creá la versión nueva, escribí las novedades y enviala a revisión.
