# Tareas

- [x] Migración: enum, tabla, índice único, FKs, RLS, bucket y políticas de evidencia.
- [x] RPCs de acreditación y revocación con auditoría.
- [x] Extender `obtener_escenario_demo` para calcular quórum/representación reales.
- [x] Endpoint de lista de asistentes (solo administración).
- [x] `lib/assembly-proxies.ts` y wiring en `store.ts` / route del API.
- [x] Formulario y tabla de acreditación en `RegistrationStage`.
- [x] Pruebas pgTAP de las reglas de negocio y aislamiento (26 aserciones).
- [x] Pruebas unitarias de validación y agregados (13 tests).
- [x] `db:reset`, `db:lint`, `db:test` (99/99), `lint`, `typecheck`, `test` (67/67), `build` en verde.
- [x] Validación visual en local: acreditar, revocar, ver quórum actualizado en vivo.

## Correcciones tras revisión adversarial

- [x] `listar_asistentes_asamblea_demo` lanza 42501 explícito en vez de devolver `[]`.
- [x] Validación de `anonimizada_en` en las ramas propietario/residente_con_voz y en el
      representado del apoderado.
- [x] `propietario` exige `relacion = 'propietario'`; `residente_con_voz` acepta cualquier
      vínculo vigente pero nunca vota (ya no comparten el mismo chequeo laxo).
- [x] Auto-sincronización de `unidad`/`persona`/`representa` en el formulario cuando el
      padrón llega tarde o cambia (selects controlados desincronizados).
- [x] Mensaje explícito cuando una unidad no tiene propietario registrado en el padrón.
- [x] Carrera de refetch de asistentes: guard por id de solicitud + lectura de
      `onFetchAttendees` por ref para no reaccionar a cada mutación global de la app.
- [x] Regresión propia: `obtener_escenario_demo` ya no inyecta una clave `dossier` a
      medias en asambleas sembradas sin dossier previo (rompía el fallback de síntesis
      del cliente y crasheaba la página).
- [x] Bug de React Strict Mode: `mountedRef` se reinicia a `true` en cada montaje real,
      no solo se pone en `false` al desmontar (el doble-montaje de desarrollo lo dejaba
      permanentemente en `false`, congelando la lista de asistentes en "Cargando…").
