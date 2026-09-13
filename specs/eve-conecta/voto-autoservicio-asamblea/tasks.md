# Tareas

- [x] Migración: `asamblea_votos` con atribución dual (`registrado_por_usuario_id`
      nullable, `acreditacion_id` nuevo, `revocado_por_acreditacion_id` nuevo,
      constraints de origen); tabla `asamblea_acreditacion_tokens`; RPCs
      (`votar_autoservicio_asamblea_demo`/`votar_con_token_asamblea_demo`/
      `generar_enlace_voto_demo`/`revocar_enlace_voto_demo`); grants a `anon` donde
      corresponde; RLS.
- [x] Contratos Zod y tipos en `lib/contracts.ts`.
- [x] `store.ts` y rutas del API, incluida la ruta pública fuera de `/v1/habitat/`.
- [x] `AssemblyWorkspace`: resolver la acreditación propia del usuario autenticado con
      puntos abiertos pendientes de voto, con los mismos guards ya usados.
- [x] Aviso "Vota ahora" en `LiveStage`/`AssemblyVotingPanel` para el asistente
      autenticado, independiente del formulario de mesa.
- [x] Acción "Generar enlace de voto" (y revocar) en `RegistrationStage`, admin-only,
      con el token visible una sola vez.
- [x] `app/votar/[token]/page.tsx`: página pública nueva, sin sesión ni layout del
      portal, con confirmación del propio voto.
- [x] Pruebas pgTAP.
- [x] Pruebas unitarias.
- [x] `db:reset`, `db:lint`, `db:test`, `lint`, `typecheck`, `test`, `build` en verde.
- [x] Revisión adversarial (SQL/RLS, TypeScript/UI, producto/spec) — atención especial a
      la superficie pública nueva (ruta y RPC accesibles con `anon`).
- [x] Validación visual en el navegador en las tres modalidades: votar como asistente
      autenticado desde el portal, votar por enlace sin cuenta, y confirmar que un voto
      de mesa se reemplaza al llegar el del propio asistente.
