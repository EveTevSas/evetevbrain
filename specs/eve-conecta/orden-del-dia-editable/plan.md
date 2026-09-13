# Plan técnico

## Datos

- Enums `conjuntos.tipo_decision_orden_dia`, `conjuntos.regla_votacion_orden_dia`,
  `conjuntos.estado_punto_orden_dia` (`borrador|listo`; "votado" se añadirá con la
  votación real).
- Tabla `conjuntos.asamblea_orden_dia`: `conjunto_id`, `asamblea_id`, `posicion`,
  `titulo`, `tipo_decision`, `regla_votacion`, `umbral_porcentaje`, `estado`,
  `creado_por_usuario_id`, `creado_en`, `actualizado_en`.
- Índice único `(asamblea_id, posicion)`, `deferrable initially deferred` para permitir
  reordenar varios puntos en una sola transacción sin colisiones intermedias.
- Constraints: título 5–200 caracteres; regla de votación coherente con el tipo de
  decisión; umbral obligatorio solo cuando hay regla de votación; umbral > 50 cuando el
  tipo es "calificada".

## Función de bloqueo

`conjuntos.orden_dia_bloqueado(p_conjunto_id, p_asamblea_id)` retorna si el orden del día
está bloqueado y por qué (estado de la asamblea, o extraordinaria con convocatoria ya
enviada — esto último se verifica contra `escenarios_demo.snapshot`, igual que el patrón
ya usado en `evidencia_caso_referenciada`). La usan las cuatro funciones mutadoras.

## Funciones (security definer)

- `agregar_punto_orden_dia_demo`, `actualizar_punto_orden_dia_demo`,
  `eliminar_punto_orden_dia_demo`, `reordenar_orden_dia_demo` (recibe el arreglo completo
  de ids en el orden deseado; valida que sea exactamente el conjunto de ids vigente,
  reescribe `posicion`).
- `listar_orden_dia_demo`: visible a los cuatro roles con membresía activa; incluye
  `locked`/`lockedReason` para que la interfaz decida si mostrar controles de edición.

## API y proveedor de datos

- Rutas nuevas: `GET/POST assemblies/:id/agenda`, `PATCH/DELETE
assemblies/:id/agenda/:itemId`, `PATCH assemblies/:id/agenda/reorder`. El catch-all no
  tenía método `DELETE`; se agrega siguiendo el mismo patrón de `handleError`.
- `lib/demo/store.ts`: `listAssemblyAgenda`, `createAgendaItem`, `updateAgendaItem`,
  `deleteAgendaItem`, `reorderAgenda`.
- `AssemblyWorkspace` adopta el mismo patrón que ya usa para asistentes: estado local,
  fetch al abrir la etapa de Preparación, refresco tras cada mutación, con los mismos
  guards de carrera y desmontaje (incluida la corrección de `mountedRef` bajo Strict
  Mode).

## Interfaz

- `PreparationStage` dentro de `assembly-management.tsx` deja de leer
  `assembly.dossier.agendaItems` (sintético) y usa la lista real; agrega botones crear,
  editar, mover arriba/abajo y eliminar cuando `canManage` y el orden del día no está
  bloqueado. Bloqueado: se explica el motivo, sin ocultar la lista.
- `AssemblySupportPanel` (assembly-supports.tsx) recibe la misma lista real para su
  selector "Punto del orden del día" en vez de `assembly.dossier.agendaItems`.
- Reordenar se hace con botones subir/bajar (sin librería de arrastrar-soltar) para no
  sumar una dependencia nueva.

## Pruebas

- pgTAP: solo administración muta; bloqueo por estado de asamblea; bloqueo por
  extraordinaria con convocatoria enviada; validación tipo/regla/umbral; mayoría
  calificada > 50; reordenar reescribe posiciones sin colisión; aislamiento entre
  conjuntos; lectura permitida a los cuatro roles.
- Vitest: validación de los schemas Zod (combinaciones tipo/regla/umbral).
