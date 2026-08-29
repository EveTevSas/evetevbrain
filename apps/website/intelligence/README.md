# Landing de Eve Intelligence — `evetev.com/intelligence`

Página pública de **Eve Intelligence**, la línea de IA empresarial. HTML y CSS
planos, sin compilación: es una carpeta más de `apps/website`, y el nombre de la
carpeta **es** la ruta.

```
apps/website/intelligence/
├── index.html     # la landing
└── estilos.css    # lo propio de esta landing
```

Lo compartido con las otras landings —`base.css` y `formularios.js`— no está
aquí: hay una sola copia en `apps/website/landings/`, generada desde
`packages/brand/landing/`. Se edita allí y se corre `pnpm landings:sync`; el CI
rechaza una copia desviada.

**Todos los enlaces a recursos son absolutos** (`/landings/base.css`,
`/intelligence/estilos.css`). Con rutas relativas la página se rompe según se
llegue a `/intelligence` o a `/intelligence/`.

## De subdominio a ruta

Esta landing vivía en `eveintelligence.evetev.com`, en un proyecto de Vercel
propio. Ahora es una ruta de `evetev.com`: un solo proyecto, un solo despliegue
por push y un solo dominio acumulando autoridad. El subdominio viejo queda
redirigiendo de forma permanente (ver `docs/DESPLIEGUE.md`).

## El asistente Fluxi

Esta página carga el widget de `apps/rag-assistant` desde
`fluxi.evetev.com/fluxi.js`. **El origen que lo pide tiene que estar permitido**
por ese servicio: `https://evetev.com` ya lo está —en la lista del código y en
`FLUXI_ORIGENES`—, así que la mudanza de subdominio a ruta no lo rompe. Si
alguna vez se sirve desde un dominio nuevo, hay que añadirlo allí: si no, el
navegador bloquea la petición y el asistente se degrada **sin que nada se ponga
rojo en el despliegue**. Ya pasó una vez, con esta misma landing.

## El formulario de demo

Hace `POST` a `/api/contacto`, en el mismo origen, y el correo llega con el
rótulo del producto. Un campo nuevo es siempre dos cambios: el marcado _y_ la
tabla `CAMPOS` de `apps/website/api/contacto.js`, que descarta en silencio lo
que no conoce.

## Correr en local

```bash
pnpm --filter @evetev/website dev
```

y abrir `http://localhost:3002/intelligence`.

## Estado

Lleva **`<meta name="robots" content="noindex">`** a propósito. **Hay que
quitarlo cuando la landing esté terminada.**
