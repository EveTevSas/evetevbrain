# Tareas — Recuperación híbrida

- [x] **T1 — Normalización y tokenizador** español, con la eñe conservada.
- [x] **T2 — BM25** precompilado: construcción, búsqueda y cobertura léxica.
- [x] **T3 — RRF** con k = 60.
- [x] **T4 — Compuerta** con las dos señales crudas, y su corrección de diseño.
- [x] **T5 — Validador del corpus** con las siete comprobaciones y test por regla.
- [x] **T6 — Troceo** por sección, con partido por párrafo y solape de una frase.
- [x] **T7 — Compilador** `scripts/compilar.ts`, con `--comprobar` para la CI.
- [x] **T8 — Respuestas selladas y límites**, leídos de la base y no del código.
- [x] **T9 — `responder`**: los cuatro caminos, con test de cada uno.
- [x] **T10 — CLI `preguntar`** para calibrar sin gastar tokens.
- [ ] **T11 — Contextualización** de fragmentos en la ingesta. Necesita modelo.
- [ ] **T12 — Mitad densa**: `Vectorizador`, cuantización int8 y coseno. Necesita
      el proveedor de embeddings.
- [ ] **T13 — Guarda de CI**: `compilar --comprobar` en el pipeline.
- [ ] **T14 — Calibrar los umbrales** con el set dorado, cuando la base definitiva
      exista.

## Definition of Done (además de §6)

- [x] Los cinco criterios EARS con test y en verde (44 tests).
- [x] `lint`, `typecheck` y `test` en verde.
- [x] El índice compilado va en el repositorio y corresponde a la base.
- [ ] Umbrales calibrados con datos — **pendiente a propósito**: hoy son una
      conjetura razonada y está dicho en el código.
