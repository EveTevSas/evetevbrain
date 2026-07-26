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

Los dos formularios del sitio (contacto en `index.html` y postulación en
`nosotros.html`) hacen `POST /api/contacto`, y esa función envía el correo a
**contacto@evetev.com** con `reply_to` en la dirección de quien escribe, para
poder responderle dando a "Responder".

**Falta un paso manual para que envíen de verdad.** Hoy el código está completo,
pero sin proveedor configurado la función responde `503` y la página muestra
"Escríbenos directo a contacto@evetev.com" — degrada, no se rompe. Para
activarlo:

1. Crear una cuenta en **Resend** (o el proveedor que se decida; el §7 de la
   constitución dejaba esto abierto).
2. Verificar el **subdominio `send.evetev.com`** — no el dominio raíz —
   agregando en **name.com** los registros que indique el proveedor.
   > ⚠️ **No verificar `evetev.com` a secas.** El proveedor pide un registro MX
   > para los rebotes, y el raíz ya tiene el MX de **Google Workspace**
   > (`smtp.google.com`), que es donde se recibe `contacto@evetev.com`.
   > Ponerlos juntos puede dejar a la empresa sin recibir correo.
3. En el proyecto de Vercel de `apps/website` → *Settings → Environment
   Variables*, agregar `RESEND_API_KEY`. Opcionalmente `CONTACTO_DESTINO` y
   `CONTACTO_REMITENTE` (ver `.env.example`). **La llave nunca va al repo (§4).**
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
