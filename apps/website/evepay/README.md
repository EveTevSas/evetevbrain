# Landing de EvePay — `evetev.com/evepay`

Página pública del producto **EvePay**, la pasarela de pagos. HTML y CSS planos,
sin compilación: es una carpeta más de `apps/website`, y el nombre de la carpeta
**es** la ruta.

```
apps/website/evepay/
├── index.html     # la landing
└── estilos.css    # lo propio de esta landing
```

Lo compartido con las otras landings —`base.css` y `formularios.js`— no está
aquí: hay una sola copia en `apps/website/landings/`, generada desde
`packages/brand/landing/`. Se edita allí y se corre `pnpm landings:sync`; el CI
rechaza una copia desviada. Lo exclusivo de EvePay va en `estilos.css`, que se
carga después y gana.

**Todos los enlaces a recursos son absolutos** (`/landings/base.css`,
`/evepay/estilos.css`). Con rutas relativas la página se rompe según se llegue a
`/evepay` o a `/evepay/`.

## De subdominio a ruta

Esta landing vivía en `evepay.evetev.com`, en un proyecto de Vercel propio.
Ahora es una ruta de `evetev.com`: un solo proyecto, un solo despliegue por push
y un solo dominio acumulando autoridad. El subdominio viejo queda redirigiendo
de forma permanente (ver `docs/DESPLIEGUE.md`).

## El formulario de demo

Hace `POST` a `/api/contacto` —la función serverless del sitio, ahora en el
mismo origen— y el correo llega a `contacto@evetev.com` con el asunto prefijado
**`EvePay · Demo:`** y una fila `Producto: EvePay`. El marcado solo declara el
producto:

```html
<form class="demo-form" data-demo="evepay"></form>
```

> **Un campo nuevo no basta con ponerlo aquí.** El endpoint solo limpia e
> imprime lo que está en su tabla `CAMPOS`; lo que no esté ahí se descarta sin
> avisar (respuesta `200`, correo sin el dato). Añadir un campo es tocar el
> marcado _y_ `apps/website/api/contacto.js`.

## Correr en local

```bash
pnpm --filter @evetev/website dev
```

y abrir `http://localhost:3002/evepay`.

## Estado

**Indexable.** El `noindex` con el que nació se quitó en #108: la página está lo
bastante terminada para aparecer, y esconderla también la esconde de las
respuestas de IA, que es donde más caro sale.
