# Tareas — Generación anclada

- [x] **T1 — Interfaz `Motor`** con generación completa y por trozos.
- [x] **T2 — Cliente de Moonshot** sin SDK, con streaming SSE y uso de tokens.
- [x] **T3 — Plantilla**: prompt de sistema desde `_sistema.md`, fragmentos en el
      mensaje del usuario para que el caché acierte.
- [x] **T4 — Guardas de salida**: citas, cifras y enlaces.
- [x] **T5 — `atender`**: el turno completo, con degradación a la derivación.
- [x] **T6 — Tests con motor falso**, sin red y sin gastar tokens.
- [x] **T7 — `scripts/comparar`**: elección de modelo medida, no heredada.
- [x] **T8 — `scripts/senal`**: herramienta de calibración de la compuerta.
- [ ] **T9 — Endpoint HTTP** con streaming al navegador (fase 2, siguiente paso).
- [ ] **T10 — Guardas de abuso**: orígenes, cupos, presupuesto diario.
- [ ] **T11 — Registro de eventos** para el bucle de mejora.

## Definition of Done (además de §6)

- [x] Los cinco criterios EARS con test y en verde (60 tests).
- [x] `lint`, `typecheck` y `test` en verde.
- [x] Verificado contra el modelo real, no solo contra el falso.
- [x] La llave nunca toca el repositorio; `.env.example` sin valores.
