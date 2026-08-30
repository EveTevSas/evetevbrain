# Landing de EveConecta — `evetev.com/conecta`

Página pública del producto **EveConecta**. HTML y CSS planos, sin compilación:
es una carpeta más de `apps/website`, y el nombre de la carpeta **es** la ruta.

> **No confundir con `apps/eveconecta`.** Ese es el portal de residentes:
> Next.js con Supabase, y vive en `conecta.evetev.com`. Aquí solo está la página
> pública de producto. Se parecen de nombre y no son lo mismo.

```
apps/website/conecta/
├── index.html            # la landing
├── estilos.css           # lo propio de esta landing
├── dashboard.mp4         # video del producto
└── dashboard-poster.webp # su póster
```

Lo compartido con las otras landings —`base.css` y `formularios.js`— no está
aquí: hay una sola copia en `apps/website/landings/`, generada desde
`packages/brand/landing/`. Se edita allí y se corre `pnpm landings:sync`; el CI
rechaza una copia desviada. Lo exclusivo de EveConecta va en `estilos.css`, que
se carga después y gana.

**Todos los enlaces a recursos son absolutos** (`/landings/base.css`,
`/conecta/dashboard.mp4`). Con rutas relativas la página se rompe según se
llegue a `/conecta` o a `/conecta/`.

## De subdominio a ruta

Esta landing vivía en `eveconecta.evetev.com`, en un proyecto de Vercel propio.
Ahora es una ruta de `evetev.com`: un solo proyecto, un solo despliegue por push
y un solo dominio acumulando autoridad. El subdominio viejo queda redirigiendo
de forma permanente (ver `docs/DESPLIEGUE.md`).

## El formulario de demo

El cierre de la página **manda el correo de verdad**: hace `POST` a
`/api/contacto` —la función serverless del sitio, ahora en el mismo origen— y el
mensaje llega a `contacto@evetev.com` con el asunto prefijado
**`EveConecta · Demo:`** y una fila `Producto: EveConecta`, para distinguirlo de
un contacto corporativo o de una demo de EvePay sin abrir el correo.

Antes de eso el cierre era un enlace a `evetev.com/#contacto`. Se cambió porque
mandar a la persona a otra página a repetir el contexto —de qué conjunto es,
cuántas unidades tiene— pierde la mitad por el camino; ahora se pregunta aquí,
donde ya decidió.

El envío lo hace `formularios.js`, compartido; el marcado declara el producto y
nada más:

```html
<form class="demo-form" data-demo="eveconecta"></form>
```

> **Un campo nuevo no basta con ponerlo aquí.** El endpoint solo limpia e
> imprime lo que está en su tabla `CAMPOS` (hoy, para esta landing: `conjunto`,
> `telefono`, `rol`, `unidades`, `ciudad`, `plazo`, más nombre, correo y
> mensaje, que son comunes). Lo que mande el marcado y no esté en esa tabla
> **se descarta sin avisar**: la respuesta es `200` y el correo llega sin el
> dato. Añadir un campo es tocar el marcado _y_ `apps/website/api/contacto.js`.

## Correr en local

```bash
pnpm --filter @evetev/website dev
```

y abrir `http://localhost:3002/conecta`. El sitio entero se sirve junto, que es
como se despliega.

## Estado

Esqueleto de partida: encabezado, portada y pie con la marca aplicada, y el
mismo estado que declara la web corporativa —en construcción, y primer cliente
de la casa para probar EvePay con dinero real—. Que las dos páginas cuenten lo
mismo importa más que sonar mejor aquí.

**Indexable.** El `noindex` con el que nació se quitó en #108.

La regla que conserva «Entrar al portal» en móvil vive en `base.css`, apoyada en
la clase `.portal`: cualquier landing con portal la necesitará igual.
