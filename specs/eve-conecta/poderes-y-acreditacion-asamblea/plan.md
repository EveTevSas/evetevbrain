# Plan técnico

## Datos

- Enum `conjuntos.calidad_asistente_asamblea`: `propietario | apoderado | residente_con_voz | invitado`.
- Tabla `conjuntos.asamblea_acreditaciones`: `conjunto_id`, `asamblea_id`, `unidad_id`
  (nullable, null solo para `invitado`), `persona_id`, `calidad`,
  `representa_persona_id` (solo `apoderado`), `coeficiente_aplicado` (congelado),
  `canal` (`presencial|virtual`), `soporte_path` (nullable), `acreditado_por_usuario_id`,
  `acreditado_en`, `revocado_en`, `revocado_por_usuario_id`.
- Índice único parcial `(asamblea_id, unidad_id) where revocado_en is null and unidad_id
is not null` — es el mecanismo real que impide la doble representación.
- FKs compuestas contra `asambleas(conjunto_id, id)`, `unidades(conjunto_id, id)` y
  `personas(conjunto_id, id)`.
- Bucket privado `eveconecta-assembly-proxies` (5 MB, PDF/JPG/PNG) para la evidencia
  opcional del poder, con el mismo patrón de políticas de `eveconecta-assembly-supports`.

## Funciones (security definer, mismo patrón que el resto de RPCs demo)

- `acreditar_asistente_asamblea_demo(...)`: valida rol, estado de la asamblea, vínculos
  vigentes según la calidad, inserta la acreditación y escribe auditoría.
- `revocar_acreditacion_asamblea_demo(asamblea_id, acreditacion_id)`: valida rol,
  marca `revocado_en`/`revocado_por_usuario_id`, libera la unidad para una nueva
  acreditación.

## Lectura

- `obtener_escenario_demo` se extiende: para cada asamblea del snapshot, recalcula
  `quorumPercent`, `representedUnits`, y dentro del `dossier`,
  `representedCoefficientPercent`, `validatedProxies` y `residentsWithoutVote` desde
  `asamblea_acreditaciones` en vez de la fórmula fija actual. Solo aplica a
  `super_admin`/`admin_conjunto` (los únicos con `select` directo del escenario); la
  proyección de `consejo`/`residente` no cambia su tratamiento de asambleas.
- Nuevo GET `assemblies/:id/attendees` (solo administración) con la lista de
  acreditaciones activas, enriquecida con nombre de persona y código de unidad — no
  viaja en el snapshot general para no inflar la carga de todos los roles.

## API y proveedor de datos

- `lib/demo/store.ts`: `accreditAssemblyAttendee`, `revokeAssemblyAccreditation`,
  `listAssemblyAttendees`.
- Rutas nuevas en el catch-all: `POST assemblies/:id/attendees`,
  `PATCH assemblies/:id/attendees/:id/revoke`, `GET assemblies/:id/attendees`.
- `lib/assembly-proxies.ts`: validación y construcción de ruta del archivo de
  evidencia, mismo patrón que `lib/assembly-supports.ts`.

## Interfaz

- `RegistrationStage` dentro de `assembly-management.tsx` deja de mostrar badges fijos:
  incorpora un formulario de acreditación (buscar unidad/persona del padrón, elegir
  calidad, si es apoderado elegir a quién representa, adjuntar evidencia opcional) y una
  tabla de acreditaciones activas con acción de revocar.
- Los `Stat` de representación/coeficientes/poderes en `RegistrationStage` y en el
  resumen de `AssemblyWorkspace` pasan a leer los valores ya reales del snapshot (sin
  cambios de forma, solo de origen del dato).

## Pruebas

- pgTAP: doble representación bloqueada, apoderado sin vínculo del representado
  rechazado, revocación libera el cupo, aislamiento entre conjuntos, políticas del
  nuevo bucket.
- Vitest: validación de archivo/ruta de evidencia, cómputo de agregados desde una lista
  de acreditaciones (función pura extraída para no probarlo solo vía SQL).
