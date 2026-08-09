# @evetev/evepay

Landing del producto **EvePay** — `evepay.evetev.com`. HTML y CSS planos, sin
compilación, igual que `apps/website`.

> Ojo con el nombre: aquí solo vive la **página de producto**. El backend de
> pagos es `apps/api`. Esta carpeta no contiene lógica de EvePay.

```
apps/evepay/
├── index.html    # la landing
├── base.css      # GENERADO desde packages/brand/landing/base.css — no editar
├── estilos.css   # lo propio de esta landing
├── vercel.json   # estático puro: outputDirectory "."
└── package.json  # scripts no-op: formaliza la app en el workspace de pnpm
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

## El CSS no se edita aquí

`base.css` es una **copia generada** de `packages/brand/landing/base.css`, que
es la fuente única del armazón de todas las landings. Se edita allí:

```bash
pnpm css:sync     # replica la fuente en cada landing
```

El CI corre `pnpm css:check` y falla si alguna copia se desvió. Lo exclusivo de
EvePay va en `estilos.css`, que se carga después y gana.

## Correr en local

```bash
cd apps/evepay
pnpm dev          # http://localhost:3004
```

## Desplegar

Proyecto de Vercel aparte apuntando al mismo repositorio, con **Root Directory:
`apps/evepay`** y Framework Preset **Other**. No necesita variables de entorno:
no hay funciones ni secretos.

## Estado

Es el esqueleto de partida: encabezado, portada y pie con la marca aplicada, y
un aviso honesto de que el producto todavía no está en producción. Las secciones
se irán generando con Eve Studio y entrando por PR, revisando cada una en la
preview de Vercel.

Lleva **`<meta name="robots" content="noindex">`** a propósito. Una página a
medias posicionando por «EvePay» hace más daño que no aparecer. **Hay que
quitarlo cuando la landing esté terminada** — si no, el lanzamiento no se
indexa y nadie se acuerda del porqué.
