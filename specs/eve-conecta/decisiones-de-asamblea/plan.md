# Plan técnico

## Datos

- Enum `conjuntos.estado_decision_asamblea` (`pendiente|en_progreso|completada`).
- Tabla `conjuntos.asamblea_decisiones`: `id`, `conjunto_id`, `asamblea_id`,
  `punto_orden_dia_id` (nullable — el punto del orden del día del que se origina, si
  aplica), `titulo`, `responsable_persona_id`, `fecha_limite` (date), `estado`,
  `evidencia_nota` (nullable), `completada_en`, `creado_por_usuario_id`, `creado_en`,
  `actualizado_en`.
- FKs compuestas: `(conjunto_id, asamblea_id)` → `asambleas`; `(conjunto_id,
  punto_orden_dia_id)` → `asamblea_orden_dia` (nullable); `(conjunto_id,
  responsable_persona_id)` → `personas`.
- Constraint: `titulo` 5–200 caracteres; `completada_en` no nulo si y solo si
  `estado = 'completada'` (mismo patrón que `asamblea_actas_firma_segun_estado`).
- RLS: `select` para los cuatro roles solo cuando el acta de esa asamblea está
  `publicada`; para `super_admin`/`admin_conjunto` en cualquier momento (misma regla que
  `asamblea_actas`, expresada contra la tabla del acta).

## Funciones (security definer)

- `crear_decision_asamblea_demo(p_conjunto_id, p_asamblea_id, p_punto_orden_dia_id,
  p_titulo, p_responsable_persona_id, p_fecha_limite)`: exige rol admin, asamblea
  `cerrada`, acta en `firmada` o `publicada`, responsable existente en `personas` de este
  conjunto, y (si se envía) que el punto pertenezca a esta asamblea.
- `actualizar_decision_asamblea_demo(...)`: exige rol admin y `estado <> 'completada'`
  (con `for update` y recomprobación en el `WHERE`, siguiendo el patrón ya establecido en
  `guardar_acta_asamblea_demo` para esta misma clase de condición de carrera).
- `actualizar_estado_decision_demo(p_conjunto_id, p_asamblea_id, p_decision_id,
  p_nuevo_estado)`: exige rol admin o consejo; rechaza si el estado actual ya es
  `completada`; fija `completada_en = now()` solo al entrar a `completada`.
- `adjuntar_evidencia_decision_demo(p_conjunto_id, p_asamblea_id, p_decision_id,
  p_evidencia_nota)`: exige rol admin; permitido en cualquier estado, incluida
  `completada`.
- `eliminar_decision_demo(p_conjunto_id, p_asamblea_id, p_decision_id)`: exige rol admin;
  rechaza si `estado = 'completada'`.
- `listar_decisiones_asamblea_demo(p_conjunto_id, p_asamblea_id)`: para admin, siempre;
  para consejo/residente, solo si el acta de esa asamblea está `publicada` (mismo criterio
  que `obtener_acta_asamblea_demo`). Devuelve `{decisions, attendees}`: las decisiones con
  nombre del responsable y título del punto de origen ya resueltos, y —solo para
  admin— la lista de asistentes acreditados de la asamblea (misma consulta que
  `listar_asistentes_asamblea_demo`), para poblar el selector de responsable al crear una
  decisión.

## API y proveedor de datos

- Rutas nuevas: `GET/POST assemblies/:id/decisions`, `PATCH/DELETE
  assemblies/:id/decisions/:decisionId`, `PATCH assemblies/:id/decisions/:decisionId/status`,
  `PATCH assemblies/:id/decisions/:decisionId/evidence`.
- `lib/demo/store.ts`: `listAssemblyDecisions`, `createAssemblyDecision`,
  `updateAssemblyDecision`, `updateAssemblyDecisionStatus`, `attachDecisionEvidence`,
  `deleteAssemblyDecision`.
- `AssemblyWorkspace` agrega el mismo patrón de estado/efecto/guards de carrera ya usado
  para agenda/votación/acta, disparando el fetch cuando la etapa activa es `follow_up`.

## Interfaz

- `components/assembly-decisions.tsx` nuevo: formulario de alta (punto de origen opcional,
  responsable seleccionado entre las `personas` del conjunto, título, fecha límite) visible
  solo a `canManage`; lista de compromisos con selector de estado (habilitado para admin y
  consejo, deshabilitado y oculto el resto de controles si ya está completada); campo de
  evidencia editable solo por administración; botón eliminar solo para administración y
  solo mientras no está completada.
- `FollowUpStage` deja de leer `assembly.dossier.decisions` (sintético) y usa la lista
  real; antes de que exista alguna decisión o mientras el acta no está firmada, se explica
  la precondición en vez de un formulario vacío.
- Se retira `AssemblyDecisionItem`/`decisions` de `AssemblyDossier` y `createAssemblyDossier`.

## Pruebas

- pgTAP: crear exige asamblea cerrada y acta firmada/publicada; responsable debe existir
  en el conjunto; el punto de origen (si se envía) debe pertenecer a la asamblea; solo
  admin crea/edita/elimina/adjunta evidencia; admin y consejo cambian el estado; una
  decisión completada no admite edición, eliminación ni otro cambio de estado, pero sí
  evidencia; lectura restringida a admin antes de publicar el acta, abierta a los cuatro
  roles después; aislamiento entre conjuntos.
- Vitest: validación de los schemas Zod nuevos (longitud de título, formato de fecha,
  enum de estado).
