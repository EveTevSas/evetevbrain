# @evetev/evepay

Landing del producto **EvePay** — `evepay.evetev.com`. HTML y CSS planos, sin
compilación, igual que `apps/website`.

> Ojo con el nombre: aquí solo vive la **página de producto**. El backend de
> pagos es `apps/api`. Esta carpeta no contiene lógica de EvePay.

```
apps/evepay/
├── index.html       # la landing
├── base.css         # GENERADO desde packages/brand/landing/base.css — no editar
├── formularios.js   # GENERADO desde packages/brand/landing/formularios.js — no editar
├── estilos.css      # lo propio de esta landing
├── vercel.json      # estático puro: outputDirectory "."
└── package.json     # scripts no-op: formaliza la app en el workspace de pnpm
```

## Por qué es un proyecto aparte y no una página de `apps/website`

**El radio de daño.** La landing se va a construir con Eve Studio, y una
herramienta que genera código conviene tenerla acotada a una carpeta. Si la
landing viviera dentro de `apps/website`, cualquier equivocación alcanzaría al
sitio corporativo y a su función de contacto.

**Cadencias distintas.** Una landing de producto se toca cada semana; la web
corporativa, cada mes. Juntas, cada ajuste de un titular redespliega las dos.

**Es el patrón que ya sigue el monorepo.** EveConecta y Merchants ya son app +
subdominio + proyecto propio. Meter EvePay dentro de la web sería la excepción.

El coste es no compartir estilos con el sitio corporativo. Se asume porque los
tokens y las tipografías vienen del CDN de marca en las dos, que es lo que de
verdad no puede divergir.

## El formulario de demo

El formulario del cierre **manda el correo de verdad**: hace `POST` a
`https://evetev.com/api/contacto` —la función serverless de `apps/website`— y el
mensaje llega a `contacto@evetev.com` con el asunto prefijado **`EvePay · Demo:`**
y una fila `Producto: EvePay`, para que se distinga de un contacto del sitio
corporativo o de una demo de EveConecta sin abrir el correo.

**Por qué llama a otro dominio en vez de tener su función aquí:** la credencial
del proveedor de correo vive en un solo proyecto de Vercel. Duplicar la función
en esta landing significaría repetir la clave en otro proyecto —otro sitio donde
rotarla y donde olvidarla—. El coste es que `evepay.evetev.com` tiene que estar
en la lista de orígenes permitidos de esa función; está, junto con las previews
de este proyecto y `localhost` (ver `apps/website/api/contacto.js`).

Esta landing **sigue sin variables de entorno ni secretos**: solo HTML.

El envío lo hace `formularios.js`, compartido con las demás landings. El marcado
declara el producto y nada más:

```html
<form class="demo-form" data-demo="evepay"></form>
```

> **Un campo nuevo no basta con ponerlo aquí.** El endpoint solo limpia e
> imprime lo que está en su tabla `CAMPOS` (hoy, para esta landing: `empresa`, `telefono`, `volumen`, `cobro`, `plazo`,
> más nombre, correo y mensaje, que son comunes). Lo que mande el marcado y no
> esté en esa tabla **se descarta sin avisar**: la respuesta es `200` y el
> correo llega sin el dato. Añadir un campo es tocar el marcado _y_
> `apps/website/api/contacto.js`, en el mismo PR o en uno previo.

## El CSS y el JS no se editan aquí

`base.css` y `formularios.js` son **copias generadas** de
`packages/brand/landing/`, la fuente única de lo que comparten todas las
landings. Se editan allí:

```bash
pnpm landings:sync     # replica las fuentes en cada landing
```

El CI corre `pnpm landings:check` y falla si alguna copia se desvió. Lo exclusivo
de EvePay va en `estilos.css`, que se carga después y gana.

## Correr en local

```bash
cd apps/evepay
pnpm dev          # http://localhost:3004
```

## Desplegar

Proyecto de Vercel aparte apuntando al mismo repositorio, con **Root Directory:
`apps/evepay`** y Framework Preset **Other**. No necesita variables de entorno:
no hay funciones ni secretos —el formulario los toma prestados del proyecto de
`apps/website`, ver arriba—.

> Si algún día cambia el dominio de esta landing, hay que añadir el nuevo a la
> lista de orígenes de `apps/website/api/contacto.js`. Si no, el navegador
> bloquea el envío y el formulario deja de funcionar sin ruido en el despliegue.

## Estado

Es el esqueleto de partida: encabezado, portada y pie con la marca aplicada, y
un aviso honesto de que el producto todavía no está en producción. Las secciones
se irán generando con Eve Studio y entrando por PR, revisando cada una en la
preview de Vercel.

Lleva **`<meta name="robots" content="noindex">`** a propósito. Una página a
medias posicionando por «EvePay» hace más daño que no aparecer. **Hay que
quitarlo cuando la landing esté terminada** — si no, el lanzamiento no se
indexa y nadie se acuerda del porqué.
