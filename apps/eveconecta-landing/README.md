# @evetev/eveconecta-landing

Landing del producto **EveConecta** — `eveconecta.evetev.com`. HTML y CSS
planos, sin compilación, igual que `apps/website` y `apps/evepay`.

> **No confundir con `apps/eveconecta`.** Ese es el portal de residentes: Next.js
> con Supabase, y vive en `conecta.evetev.com`. Aquí solo está la página pública
> de producto. Dos apps, dos dominios, dos proyectos de Vercel.

```
apps/eveconecta-landing/
├── index.html    # la landing
├── estilos.css   # tokens de respaldo + estilos
├── vercel.json   # estático puro: outputDirectory "."
└── package.json  # scripts no-op: formaliza la app en el workspace de pnpm
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

## Correr en local

```bash
cd apps/eveconecta-landing
pnpm dev          # http://localhost:3005
```

## Desplegar

Proyecto de Vercel aparte apuntando al mismo repositorio, con **Root Directory:
`apps/eveconecta-landing`** y Framework Preset **Other**. Sin variables de
entorno: no hay funciones ni secretos.

## Estado

Esqueleto de partida: encabezado, portada y pie con la marca aplicada, y el
mismo estado que declara la web corporativa —en construcción, y primer cliente
de la casa para probar EvePay con dinero real—. Que las dos páginas cuenten lo
mismo importa más que sonar mejor aquí.

Lleva **`<meta name="robots" content="noindex">`** a propósito. **Hay que
quitarlo cuando la landing esté terminada.**

## Deuda conocida: el CSS está duplicado

`estilos.css` es una copia del de `apps/evepay`. Con dos landings se tolera; el
README de `apps/website` ya deja escrito que mantener copias del mismo CSS fue
"el error más caro a futuro", y aquí solo se acepta porque son estáticos y no
hay paso de compilación que permita compartir un archivo entre apps.

**Con una tercera landing hay que extraerlo**, probablemente a `packages/brand`
con un pequeño script de copia en el build. Lo que de verdad no puede divergir
—tokens de color y tipografías— ya viene del CDN de marca en las tres.
