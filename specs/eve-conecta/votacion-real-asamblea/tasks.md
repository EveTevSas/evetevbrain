# Tareas

- [x] Migración: columnas nuevas en `asamblea_orden_dia`, enum, tabla de votos, índice
      único, RPCs, RLS.
- [x] Contratos Zod y tipos en `lib/contracts.ts`.
- [x] `store.ts` y rutas del API.
- [x] `AssemblyWorkspace`: estado y fetch de votaciones con los mismos guards ya usados.
- [x] `components/assembly-voting.tsx`: panel por punto en `LiveStage`.
- [x] Retirar `defaultVotes`/`dossier.votes` sintéticos de `LiveStage`.
- [x] Pruebas pgTAP.
- [x] Pruebas unitarias.
- [x] `db:reset`, `db:lint`, `db:test`, `lint`, `typecheck`, `test`, `build` en verde.
- [x] Revisión adversarial (SQL/RLS, TypeScript/UI, producto/spec).
- [x] Validación visual en el navegador: abrir, votar varias unidades, cerrar, ver
      resultado; probar el bloqueo de secreto.
