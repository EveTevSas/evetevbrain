# Tareas — Base documental de Fluxi

- [x] **T1 — Spec y plan** con criterios EARS y contrato de frontmatter.
- [x] **T2 — Corpus v1**: 29 documentos + los tres archivos de configuración,
      extraídos de las cuatro páginas públicas y del manual de marca. Cada afirmación
      con `fuente`.
- [x] **T3 — Manual de redacción** (`base/README.md`): el documento que se le
      entrega al cliente para que mantenga su propia base.
- [x] **T4 — Reglas de contenido** en `base/_reglas.json`: frases vetadas,
      competidores, patrones de tarifa y de promesa de fecha.
- [ ] **T5 — Validador** `src/ingesta/validar.ts` con las siete comprobaciones, y
      un test por cada criterio EARS de la spec.
- [ ] **T6 — Troceo y contextualización** `src/ingesta/trocear.ts` +
      `contextualizar.ts`, con huella SHA-256 por fragmento para no repagar
      embeddings.
- [ ] **T7 — Compilador** `scripts/compilar.ts`: base → `indice/indice.json` +
      `indice/vectores.bin` (int8, 512d).
- [ ] **T8 — Guardas de CI**: sincronía base ↔ índice, y etiqueta
      `revisión-de-contenido` según el diff.
- [ ] **T9 — Conjuntos de evaluación** (`eval/`): dorado, fuera de alcance y
      ataques. Se redactan mirando lo que la gente pregunta, no lo que la base
      contesta.

- [x] **T10 — `evepay/adquirencia.md`.** Desbloqueada el 19 de agosto de 2026:
      John confirmó que **Akua es lo vigente y la landing de EvePay está
      desactualizada**. El documento describe la arquitectura —un único backbone de
      adquirencia, sin agregadores intermedios, con su tokenización y su checkout—
      **sin nombrar al proveedor**, porque el nombre no está publicado en ninguna
      página de producto y el corpus solo lleva material público.

## Se abre fuera de esta spec

- [ ] **Corregir `apps/evepay/index.html`.** Publica hoy dos afirmaciones que la
      decisión vigente contradice: «Integración con Credibanco y Redeban
      (adquirencia directa)» y «Tokenización como Servicio (TaaS) con proveedores
      como VGS y Basis Theory». Va en PR aparte, con revisión de contenido: es
      copia pública sobre quién procesa los pagos.

## Definition of Done (además de §6)

- [ ] Los diez criterios EARS con test y en verde.
- [ ] Ningún documento afirma que EvePay está disponible.
- [ ] Ninguna cifra de tarifa aparece sin la palabra «referencia» y su derivación.
- [ ] `id` único comprobado en la compilación.
- [ ] Base e índice sincronizados en el mismo PR.
