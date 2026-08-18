# @evetev/eveconecta-landing

Landing del producto **EveConecta** — `eveconecta.evetev.com`. HTML y CSS
planos, sin compilación, igual que `apps/website` y `apps/evepay`.

> **No confundir con `apps/eveconecta`.** Ese es el portal de residentes: Next.js
> con Supabase, y vive en `conecta.evetev.com`. Aquí solo está la página pública
> de producto. Dos apps, dos dominios, dos proyectos de Vercel.

```
apps/eveconecta-landing/
├── index.html       # la landing
├── base.css         # GENERADO desde packages/brand/landing/base.css — no editar
├── formularios.js   # GENERADO desde packages/brand/landing/formularios.js — no editar
├── estilos.css      # lo propio de esta landing
├── vercel.json      # estático puro: outputDirectory "."
└── package.json     # scripts no-op: formaliza la app en el workspace de pnpm
```

## Los dos dominios

| Dominio | Qué sirve | App |
|---|---|---|
| `eveconecta.evetev.com` | landing pública | esta |
| `conecta.evetev.com` | portal de residentes (redirige a `/login`) | `apps/eveconecta` |

Se parecen, y es un riesgo asumido a conciencia. El reparto natural sería el
contrario —dominio corto y memorable para lo público, portal detrás de un
subdominio— pero `conecta.evetev.com` ya está en producción con residentes
reales, y cambiarlo obliga a tocar las URLs de retorno de la autenticación de
Supabase y a romper los enlaces que la gente ya tenga guardados.

**Si algún día se decide invertirlo, no hay que tocar código:** se intercambian
los dominios entre los dos proyectos de Vercel y se añade una redirección
permanente. Por eso no vale la pena hacerlo hoy.

## El formulario de demo

El cierre de la página **manda el correo de verdad**: hace `POST` a
`https://evetev.com/api/contacto` —la función serverless de `apps/website`— y el
mensaje llega a `contacto@evetev.com` con el asunto prefijado
**`EveConecta · Demo:`** y una fila `Producto: EveConecta`, para que se distinga
de un contacto del sitio corporativo o de una demo de EvePay sin abrir el correo.

Antes de eso el cierre era un enlace a `evetev.com/#contacto`. Se cambió porque
mandar a la persona a otro dominio a repetir el contexto —de qué conjunto es,
cuántas unidades tiene— pierde la mitad por el camino; ahora se pregunta aquí,
donde ya decidió.

**Por qué llama a otro dominio en vez de tener su función aquí:** la credencial
del proveedor de correo vive en un solo proyecto de Vercel. Duplicar la función
en esta landing significaría repetir la clave en otro proyecto —otro sitio donde
rotarla y donde olvidarla—. El coste es que `eveconecta.evetev.com` tiene que
estar en la lista de orígenes permitidos de esa función; está, junto con las
previews de este proyecto y `localhost` (ver `apps/website/api/contacto.js`).

Esta landing **sigue sin variables de entorno ni secretos**: solo HTML. El envío
lo hace `formularios.js`, compartido con las demás landings; el marcado declara
el producto y nada más:

```html
<form class="demo-form" data-demo="eveconecta">
```

> **Un campo nuevo no basta con ponerlo aquí.** El endpoint solo limpia e
> imprime lo que está en su tabla `CAMPOS` (hoy, para esta landing: `conjunto`, `telefono`, `rol`, `unidades`, `ciudad`, `plazo`,
> más nombre, correo y mensaje, que son comunes). Lo que mande el marcado y no
> esté en esa tabla **se descarta sin avisar**: la respuesta es `200` y el
> correo llega sin el dato. Añadir un campo es tocar el marcado *y*
> `apps/website/api/contacto.js`, en el mismo PR o en uno previo.

## Correr en local

```bash
cd apps/eveconecta-landing
pnpm dev          # http://localhost:3005
```

## Desplegar

Proyecto de Vercel aparte apuntando al mismo repositorio, con **Root Directory:
`apps/eveconecta-landing`** y Framework Preset **Other**. Sin variables de
entorno: no hay funciones ni secretos —el formulario los toma prestados del
proyecto de `apps/website`, ver arriba—.

> Si algún día cambia el dominio de esta landing, hay que añadir el nuevo a la
> lista de orígenes de `apps/website/api/contacto.js`. Si no, el navegador
> bloquea el envío y el formulario deja de funcionar sin ruido en el despliegue.

## Estado

Esqueleto de partida: encabezado, portada y pie con la marca aplicada, y el
mismo estado que declara la web corporativa —en construcción, y primer cliente
de la casa para probar EvePay con dinero real—. Que las dos páginas cuenten lo
mismo importa más que sonar mejor aquí.

Lleva **`<meta name="robots" content="noindex">`** a propósito. **Hay que
quitarlo cuando la landing esté terminada.**

## El CSS y el JS no se editan aquí

`base.css` y `formularios.js` son **copias generadas** de
`packages/brand/landing/`, la fuente única de lo que comparten todas las
landings. Se editan allí y se replican:

```bash
pnpm landings:sync
```

El CI corre `pnpm landings:check` y falla si alguna copia se desvió, así que la
duplicación no puede volver a colarse. Lo exclusivo de EveConecta va en
`estilos.css`, que se carga después y gana.

La regla que conserva «Entrar al portal» en móvil vive en `base.css`, apoyada
en la clase `.portal`: cualquier landing con portal la necesitará igual.
