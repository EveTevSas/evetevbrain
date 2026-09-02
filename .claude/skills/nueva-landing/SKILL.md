---
name: nueva-landing
description: Crea una landing de producto nueva como ruta de evetev.com (carpeta en apps/website/), con el CSS compartido, el formulario de demo conectado y el tono de marca. Usar cuando se pida una landing, página de producto o página de captura nueva.
---

# Nueva landing de producto

Las landings **no son proyectos aparte**: son carpetas de `apps/website/` y la
carpeta es su ruta pública (`apps/website/mi-producto/` → `evetev.com/mi-producto`).
Se despliegan con el sitio; no hay nada que configurar en Vercel.

## Pasos

1. Crear `apps/website/<producto>/index.html` + `estilos.css`.
2. Enlazar lo compartido con **rutas absolutas** (funcionan igual con `/ruta` y
   `/ruta/`):

   ```html
   <link rel="stylesheet" href="/landings/base.css" />
   <link rel="stylesheet" href="/<producto>/estilos.css" />
   <script src="/landings/formularios.js" defer></script>
   ```

   `base.css` y `formularios.js` ya están copiados en `apps/website/landings/`
   desde `packages/brand/landing/` (los vigila el CI). No copiarlos de nuevo ni
   editarlos ahí: la fuente es `packages/brand/landing/`.

3. Formulario de demo — el contrato está comentado al inicio de
   `formularios.js`. El producto sale del atributo:

   ```html
   <form class="demo-form" data-demo="<producto>">…</form>
   ```

   **Ese `data-demo` debe existir en la lista blanca de
   `apps/website/api/contacto.js`** — agregarlo ahí en el mismo PR. Una clave
   que no esté se ignora en silencio y el correo llega sin rótulo. Lo mismo con
   cada campo: el endpoint solo imprime los `name=` de su tabla `CAMPOS`; un
   campo nuevo son siempre dos cambios (el marcado y esa tabla).

4. Marca: colores solo de los tokens (`/marca/` de la app o
   `packages/brand/assets/tokens/`); redacción según
   `packages/brand/assets/tono-de-voz.md` (carril producto). La mascota es Eve;
   la fauna es escenografía, nunca segunda mascota.

5. Verificar: `pnpm format && pnpm lint && pnpm landings:check`, abrir el HTML
   y probar el formulario, y revisar que la ruta funcione con y sin `/` final.
