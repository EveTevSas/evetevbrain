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

## Bloqueado, a la espera de decisión

- [ ] **T10 — `evepay/adquirencia.md`.** La landing de EvePay dice Credibanco y
      Redeban con tokenización de VGS / Basis Theory; la constitución (§7, decisión 5)
      dice Akua como único proveedor. Son dos historias distintas y el corpus no
      nombra ninguna hasta que John diga cuál está vigente.

## Definition of Done (además de §6)

- [ ] Los diez criterios EARS con test y en verde.
- [ ] Ningún documento afirma que EvePay está disponible.
- [ ] Ninguna cifra de tarifa aparece sin la palabra «referencia» y su derivación.
- [ ] `id` único comprobado en la compilación.
- [ ] Base e índice sincronizados en el mismo PR.
