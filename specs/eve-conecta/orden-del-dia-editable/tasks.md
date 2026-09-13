# Tareas

- [x] Migración: enums, tabla, índice único diferible, función de bloqueo, RPCs, RLS.
- [x] Contratos Zod y tipos en `lib/contracts.ts`.
- [x] `store.ts` y rutas del API (incluida la primera ruta `DELETE` del catch-all).
- [x] `AssemblyWorkspace`: estado y fetch del orden del día real, con los mismos guards
      de carrera/desmontaje que asistentes.
- [x] `PreparationStage`: lista editable con crear/editar/mover/eliminar y aviso de
      bloqueo.
- [x] `AssemblySupportPanel`: selector de punto del orden del día sobre datos reales.
- [x] Pruebas pgTAP (21 aserciones).
- [x] Pruebas unitarias de los schemas y de `parseAgendaThreshold` (22 tests).
- [x] `db:reset`, `db:lint`, `db:test` (120/120), `lint`, `typecheck`, `test` (87/87),
      `build` en verde.
- [x] Revisión adversarial (SQL/RLS, TypeScript/UI, producto/spec).
- [x] Validación visual en el navegador: crear, editar, mover, eliminar, bloqueo real
      tras enviar convocatoria.

## Correcciones tras revisión adversarial

- [x] Umbral: `parseFloat` no exigía que toda la cadena fuera numérica ("50.5.5" se
      guardaba como 50.5 sin aviso); extraído a `parseAgendaThreshold` con regex estricta
      y cubierto con tests.
- [x] Botones de mover sin guard contra doble clic durante un reorder en vuelo (podían
      pisar silenciosamente un movimiento anterior); ahora se deshabilitan mientras
      `busy` coincide con la clave de reorder de esa asamblea.
- [x] **Regresión propia de alta severidad**: el backend de creación de soportes seguía
      validando `agendaItemId` contra los 3 puntos sintéticos del dossier JSON en vez de
      la tabla real `asamblea_orden_dia`, rechazando con 400 cualquier vínculo a un punto
      real recién creado. Corregido para consultar la tabla real.
- [x] **Bug propio no detectado por la revisión, encontrado en la validación visual**:
      los RPCs de agenda intercambiaban campos/valores en español con el cliente en
      inglés (`decisionType`/`votingRule`/`status` vs `tipoDecision`/`reglaVotacion`/
      `estado` con valores como `economica`/`coeficiente`/`borrador`), rompiendo tanto la
      creación como la lectura. Corregido siguiendo el patrón ya establecido en
      `programar_asamblea_demo`: el cliente traduce inglés→español en la entrada, el RPC
      traduce español→inglés en la salida.
