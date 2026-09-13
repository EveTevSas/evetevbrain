# Tareas

- [x] Migración: enum de estado, tabla `asamblea_decisiones`, RPCs
      (`crear`/`actualizar`/`actualizar_estado`/`adjuntar_evidencia`/`eliminar`/`listar`), RLS.
- [x] Contratos Zod y tipos en `lib/contracts.ts`.
- [x] `store.ts` y rutas del API.
- [x] `AssemblyWorkspace`: estado y fetch de decisiones con los mismos guards ya usados.
- [x] `components/assembly-decisions.tsx`: alta, cambio de estado, evidencia, eliminar.
- [x] Retirar `AssemblyDecisionItem`/`dossier.decisions` sintéticos de `FollowUpStage`.
- [x] Pruebas pgTAP.
- [x] Pruebas unitarias.
- [x] `db:reset`, `db:lint`, `db:test`, `lint`, `typecheck`, `test`, `build` en verde.
- [x] Revisión adversarial (SQL/RLS, TypeScript/UI, producto/spec).
- [x] Validación visual en el navegador: crear un compromiso, avanzar su estado como
      consejo, adjuntar evidencia como admin, verlo como residente tras publicar el acta.
