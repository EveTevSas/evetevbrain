# Tareas

- [x] Migración: `iniciar_asamblea_demo`/`cerrar_asamblea_demo`, enum de estado del acta,
      tabla `asamblea_actas`, RPCs (`guardar`/`firmar`/`publicar`/`obtener`), RLS.
- [x] Contratos Zod y tipos en `lib/contracts.ts`.
- [x] `store.ts` y rutas del API.
- [x] `AssemblyWorkspace`: estado y fetch del acta con los mismos guards ya usados;
      controles de iniciar/cerrar asamblea en el encabezado del expediente.
- [x] `components/assembly-minutes.tsx`: formulario de presidencia/secretaría/resumen,
      firmar, publicar, y vista reconstruible de solo lectura tras publicar.
- [x] Retirar `assembly.dossier.minutes` sintético de `MinutesStage`.
- [x] Pruebas pgTAP.
- [x] Pruebas unitarias.
- [x] `db:reset`, `db:lint`, `db:test`, `lint`, `typecheck`, `test`, `build` en verde.
- [x] Revisión adversarial (SQL/RLS, TypeScript/UI, producto/spec).
- [x] Validación visual en el navegador: iniciar asamblea, cerrar, redactar acta, firmar,
      publicar, ver contenido reconstruible como residente.
