# @evetev/website

**evetev.com** — sitio corporativo / marketing. Estático (HTML + CSS + assets),
se despliega en **Vercel** (§10).

```
index.html        # la portada
nosotros.html     # Nosotros · Equipo · Trabaja con nosotros
estilos.css       # hoja compartida por ambas páginas
formularios.js    # envío de los dos formularios corporativos
api/contacto.js   # función serverless que manda el correo
files/            # video de fondo e imagen de portada

evepay/           # → evetev.com/evepay        landing de EvePay
conecta/          # → evetev.com/conecta       landing de EveConecta
intelligence/     # → evetev.com/intelligence  landing de Eve Intelligence
landings/         # base.css + formularios.js que comparten las tres
```

## Las landings de producto son rutas de aquí

Antes cada landing era un proyecto de Vercel con su propio subdominio
(`evepay.`, `eveconecta.`, `eveintelligence.evetev.com`). Ahora son carpetas de
este sitio y se sirven en `/evepay`, `/conecta` e `/intelligence`: un solo
proyecto, un solo despliegue por push y un solo dominio acumulando autoridad,
en vez de cuatro sitios repartiéndosela. Los subdominios viejos quedan como
redirección permanente (§10).

Ojo con el parecido: `conecta.evetev.com` **no** es esta ruta, es el portal de
residentes (`apps/eveconecta`), que sigue siendo otra aplicación.

Dos reglas al editarlas:

- **Rutas absolutas** para CSS, JS y media (`/landings/base.css`,
  `/conecta/dashboard.mp4`). Con rutas relativas la página se rompe según se
  llegue a `/conecta` o a `/conecta/`, que es exactamente el fallo que nadie ve
  al probar en local.
- `landings/base.css` y `landings/formularios.js` **son copias generadas**
  desde `packages/brand/landing/`. Se editan allí y se corre `pnpm
landings:sync`; el CI rechaza una copia desviada.

## Formularios

`api/contacto.js` es el **único buzón de toda la marca**. Recibe cuatro
formularios y envía el correo a **contacto@evetev.com** con `reply_to` en la
dirección de quien escribe, para poder responderle dando a "Responder":

| Formulario         | Dónde vive      | Asunto que llega             |
| ------------------ | --------------- | ---------------------------- |
| Contacto           | `index.html`    | `Contacto: nombre — tamaño`  |
| Postulación        | `nosotros.html` | `Postulación: nombre — área` |
| Demo de EvePay     | `evepay/`       | `EvePay · Demo: nombre`      |
| Demo de EveConecta | `conecta/`      | `EveConecta · Demo: nombre`  |

Los dos últimos ya **no** son cross-origin: desde que las landings son rutas de
este sitio llaman a `/api/contacto` en el mismo dominio. La lista de orígenes
del principio de la función sigue ahí para las previews de Vercel, `localhost`
y los subdominios viejos mientras redirijan. El producto no lo escribe el
cliente: manda una clave (`evepay`, `eveconecta`) que la función traduce contra
su propia lista blanca, así que un origen curioso no puede hacer que llegue un
correo firmado por cualquier cosa. Además del prefijo del asunto, el cuerpo
lleva una fila `Producto:` y otra `Enviado desde:` con el host real.

**Añadir un campo a un formulario es tocar DOS repositorios de decisiones.** La
tabla `CAMPOS` de la función es la única lista blanca: dice, por formulario, qué
claves se limpian y con qué rótulo se imprimen. Un campo que el marcado mande y
no esté en la tabla **se descarta en silencio** — respuesta `200`, sin error y
sin log. Pasó ya una vez: una landing añadió un teléfono obligatorio y el correo
llegaba sin él. Por eso la tabla es una sola y no dos listas paralelas; antes
había una para limpiar y otra para pintar, y podían no coincidir.

**Por qué una sola función y no una por landing:** la clave del proveedor
viviría si no en varios proyectos de Vercel — varios sitios donde rotarla y
varios donde olvidarla. Con las landings dentro de este proyecto eso deja de ser
un reparto y pasa a ser lo natural: mismo origen, misma función, una sola clave.
Lo que hay que seguir recordando es que **un dominio nuevo que apunte a este
endpoint desde fuera obliga a tocar la lista de orígenes**; si no, el navegador
bloquea el envío y el formulario deja de funcionar sin que el despliegue avise.

**Ya está activo en producción**: el proveedor está configurado y la clave
puesta en Vercel. Si faltara —clave sin poner, proyecto nuevo—, la función
responde `503` y la página muestra "Escríbenos directo a contacto@evetev.com":
degrada, no se rompe.

Lo que hubo que hacer, y que hay que repetir si se rehace el proyecto o se
cambia de proveedor:

1. Crear una cuenta en **Resend** (o el proveedor que se decida; el §7 de la
   constitución dejaba esto abierto).
2. Verificar el **subdominio `send.evetev.com`** — no el dominio raíz —
   agregando en **name.com** los registros que indique el proveedor.
   > ⚠️ **No verificar `evetev.com` a secas.** El proveedor pide un registro MX
   > para los rebotes, y el raíz ya tiene el MX de **Google Workspace**
   > (`smtp.google.com`), que es donde se recibe `contacto@evetev.com`.
   > Ponerlos juntos puede dejar a la empresa sin recibir correo.
3. En el proyecto de Vercel de `apps/website` → _Settings → Environment
   Variables_, agregar `RESEND_API_KEY`. Opcionalmente `CONTACTO_DESTINO` y
   `CONTACTO_REMITENTE`. **La llave nunca va al repo (§4).** Va solo en este
   proyecto: las landings no la necesitan, llaman a esta función.
4. Volver a desplegar para que la función tome la variable.

Cambiar de proveedor es tocar solo la función `enviarCorreo` de
`api/contacto.js`; el resto del archivo no lo conoce.

**Antispam:** cada formulario lleva un campo trampa oculto. Si llega lleno, la
función responde `200` y no envía nada, para no darle al bot la señal de que fue
detectado.

## Marca

El sitio sigue `packages/brand/assets/evetev_brand_styles.md` (v1.0):

- **Activos de marca SIEMPRE desde el CDN** (regla T1):
  `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/...` — isotipos, unidades,
  favicon y mascota. No se guardan copias locales ni se dibujan a mano.
- **Tokens**: se importan de `…/tokens/colores.css` con respaldo local en `:root`.
- **Coral `#EE3D22`**: exclusivo del CTA global del nav (único por vista, C2).
  El resto de acciones usa `.btn-sec` (mezclado `#144A96`) o `.btn-ghost`.
- Tipografías: Baloo 2 (titulares/cifras), Inter (UI), JetBrains Mono (código).

`files/` solo conserva lo que no es activo de marca: el video
`evepay-background.mp4` y su poster `portada-red.jpg`.

## Correr en local

```bash
pnpm --filter @evetev/website dev   # http://localhost:3002
```

> Requiere conexión a internet para el CDN de marca (jsDelivr) y Google Fonts.
