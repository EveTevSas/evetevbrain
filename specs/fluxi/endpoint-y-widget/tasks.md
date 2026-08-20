# Tareas — Endpoint y widget

- [x] **T1 — Núcleo HTTP** (`src/api/nucleo.ts`) con rutas, CORS y guardas.
- [x] **T2 — Guardas**: origen, cuerpo, campo trampa, token de sesión, cupos.
- [x] **T3 — Transmisión por frases verificadas** (`frases-seguras.ts`).
- [x] **T4 — Adaptador de Vercel** (`api/index.ts`) + `vercel.json`.
- [x] **T5 — Servidor local** (`scripts/servir.ts`) sobre el mismo núcleo.
- [x] **T6 — Widget** (`public/fluxi.js`) con Shadow DOM, accesible y sin compilación.
- [x] **T7 — Banco de pruebas** (`public/demo.html`).
- [x] **T8 — Fuentes con nombre** en vez de identificadores en crudo.
- [x] **T9 — Tests** de guardas y núcleo (92 en total).
- [ ] **T10 — Proyecto de Vercel** para `apps/rag-assistant` y dominio
      `fluxi.evetev.com`. **No se puede hoy**: la cuenta llegó al tope de
      despliegues del plan Hobby.
- [ ] **T11 — Reemplazar el FAB de `apps/website`** por el widget. Va **después**
      de T10: hasta que el endpoint tenga dominio, el widget solo mostraría el
      enlace de contacto, que es peor que la burbuja de hoy.
- [ ] **T12 — Registro de eventos** y cupo duradero en almacén compartido.

## Definition of Done (además de §6)

- [x] Los seis criterios EARS con test y en verde.
- [x] `lint`, `typecheck` y `test` en verde (92 tests).
- [x] Verificado en el navegador: los cuatro caminos, a 1280 px y a 320 px, sin
      errores de consola y sin desborde horizontal.
- [x] Sin secretos en el repositorio.
