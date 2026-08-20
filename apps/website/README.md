# @evetev/website

**evetev.com** — sitio corporativo / marketing. Estático (HTML + CSS + assets),
se despliega en **Vercel** (§10).

```
index.html        # la landing
nosotros.html     # Nosotros · Equipo · Trabaja con nosotros
estilos.css       # hoja compartida por ambas páginas
formularios.js    # envío de los dos formularios
api/contacto.js   # función serverless que manda el correo
files/            # video de fondo e imagen de portada
```

## Formularios

`api/contacto.js` es el **único buzón de toda la marca**. Recibe cuatro
formularios y envía el correo a **contacto@evetev.com** con `reply_to` en la
dirección de quien escribe, para poder responderle dando a "Responder":

| Formulario         | Dónde vive                | Asunto que llega             |
| ------------------ | ------------------------- | ---------------------------- |
| Contacto           | `index.html`              | `Contacto: nombre — tamaño`  |
| Postulación        | `nosotros.html`           | `Postulación: nombre — área` |
| Demo de EvePay     | `apps/evepay`             | `EvePay · Demo: nombre`      |
| Demo de EveConecta | `apps/eveconecta-landing` | `EveConecta · Demo: nombre`  |

Los dos últimos son otros dominios y llegan aquí **por CORS**. Están en una
lista de orígenes al principio de la función, junto con las previews de Vercel
de esas landings y `localhost` para desarrollo. El producto no lo escribe el
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
viviría entonces en tres proyectos de Vercel — tres sitios donde rotarla y tres
donde olvidarla. Con este reparto las landings siguen siendo estáticas puras,
sin variables de entorno. El precio a pagar es que **añadir o cambiar el dominio
de una landing obliga a tocar la lista de orígenes**; si no, el navegador
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
