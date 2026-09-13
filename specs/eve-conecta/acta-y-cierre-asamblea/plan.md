# Plan técnico

## Ciclo de vida de la asamblea (prerrequisito)

- `iniciar_asamblea_demo(p_conjunto_id, p_asamblea_id)`: valida rol y
  `estado = 'programada'`; fija `estado = 'en_curso'`.
- `cerrar_asamblea_demo(p_conjunto_id, p_asamblea_id)`: valida rol y `estado = 'en_curso'`;
  rechaza si existe un punto de `asamblea_orden_dia` con `votacion_abierta_en is not null
  and votacion_cerrada_en is null`; fija `estado = 'cerrada'`.
- Ambas registran evento de auditoría, igual que el resto de mutaciones del expediente.

## Datos del acta

- Tabla `conjuntos.asamblea_actas`: `id`, `conjunto_id`, `asamblea_id` (única — un acta
  por asamblea), `presidente_persona_id`, `secretario_persona_id`, `resumen` (text),
  `version` (integer, empieza en 1, se incrementa en cada guardado mientras es
  `borrador`), `estado` (enum `borrador|firmada|publicada`), `firmada_en`,
  `publicada_en`, `creado_por_usuario_id`, `creado_en`, `actualizado_en`.
- FKs compuestas: `(conjunto_id, asamblea_id)` → `asambleas`; `(conjunto_id,
  presidente_persona_id)` y `(conjunto_id, secretario_persona_id)` → `personas`.
- Constraint: `presidente_persona_id <> secretario_persona_id`.
- RLS: `select` para los cuatro roles solo cuando `estado = 'publicada'`, o para
  `super_admin`/`admin_conjunto` en cualquier estado (igual sensibilidad que el resto del
  expediente antes de publicarse).

## Funciones (security definer)

- `guardar_acta_asamblea_demo(p_conjunto_id, p_asamblea_id, p_presidente_persona_id,
  p_secretario_persona_id, p_resumen)`: upsert; exige rol admin, asamblea existente y no
  `programada`, presidencia/secretaría con acreditación activa y distintas entre sí,
  resumen no vacío; rechaza si el acta ya está `firmada`/`publicada` (55000); incrementa
  `version` en cada guardado.
- `firmar_acta_asamblea_demo(p_conjunto_id, p_asamblea_id)`: exige acta en `borrador`,
  asamblea `cerrada`; fija `estado = 'firmada'`, `firmada_en = now()`.
- `publicar_acta_asamblea_demo(p_conjunto_id, p_asamblea_id)`: exige acta `firmada`; fija
  `estado = 'publicada'`, `publicada_en = now()`.
- `obtener_acta_asamblea_demo(p_conjunto_id, p_asamblea_id)`: retorna el acta (o `null` si
  no existe) más el contenido reconstruible leído en vivo — asistentes desde
  `asamblea_acreditaciones`, puntos y su resultado desde `asamblea_orden_dia`/
  `asamblea_votos` (mismo cálculo de agregación que `listar_votaciones_asamblea_demo`,
  pero de solo lectura aquí). Antes de `publicada`, exige rol admin; publicada, visible a
  los cuatro roles.

## API y proveedor de datos

- Rutas nuevas: `POST assemblies/:id/start`, `POST assemblies/:id/close`, `GET/PUT
  assemblies/:id/minutes`, `POST assemblies/:id/minutes/sign`, `POST
  assemblies/:id/minutes/publish`.
- `lib/demo/store.ts`: `startAssembly`, `closeAssembly`, `fetchAssemblyMinutes`,
  `saveAssemblyMinutes`, `signAssemblyMinutes`, `publishAssemblyMinutes`.
- `AssemblyWorkspace` agrega el mismo patrón de estado/efecto/guards de carrera ya usado
  para agenda y votación, disparando el fetch de acta cuando la etapa activa es `minutes`.

## Interfaz

- Controles de inicio/cierre de asamblea: un botón en el encabezado del expediente
  (visible para `canManage`), gateado por el estado actual (`programada` → "Iniciar
  asamblea"; `en_curso` → "Cerrar asamblea"; con confirmación antes de cerrar, igual que
  cerrar una votación).
- `MinutesStage` deja de leer `assembly.dossier.minutes` (sintético) y usa el acta real:
  formulario de presidencia/secretaría (selector sobre los asistentes acreditados
  vigentes) y resumen mientras `borrador`; botones "Firmar acta" y "Publicar acta" según
  el estado; una vez publicada, muestra el contenido reconstruible de solo lectura
  (asistentes, coeficientes, poderes, resultado de cada punto votado).
- Antes de existir un acta o mientras la asamblea sigue `programada`, se explica la
  precondición en vez de mostrar un formulario vacío.

## Pruebas

- pgTAP: ciclo de vida de la asamblea (iniciar/cerrar, bloqueo de cierre con votación
  abierta); solo admin muta el acta; presidencia/secretaría deben tener acreditación
  activa y ser distintas; guardar rechazado si ya está firmada; firmar exige asamblea
  cerrada y campos completos; publicar exige firmada; lectura antes de publicar
  restringida a admin; aislamiento entre conjuntos.
- Vitest: validación del schema Zod de guardar acta (resumen no vacío, ids de personas
  con formato válido).
