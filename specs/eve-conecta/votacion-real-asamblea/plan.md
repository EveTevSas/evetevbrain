# Plan técnico

## Datos

- `conjuntos.asamblea_orden_dia` gana `votacion_abierta_en`, `votacion_cerrada_en`,
  `resultado jsonb` (congelado al cerrar). Gana también una constraint
  `unique (conjunto_id, id)` (necesaria para la FK compuesta de la nueva tabla, como ya
  tienen `asambleas`/`unidades`/`personas`).
- Enum `conjuntos.opcion_voto` (`si|no|abstencion`).
- Tabla `conjuntos.asamblea_votos`: `conjunto_id`, `asamblea_id`, `punto_orden_dia_id`,
  `unidad_id`, `opcion`, `coeficiente_aplicado` (congelado desde la acreditación),
  `registrado_por_usuario_id`, `registrado_en`, `revocado_en`, `revocado_por_usuario_id`.
- Índice único `(punto_orden_dia_id, unidad_id) where revocado_en is null` — bloquea el
  voto duplicado, mismo mecanismo que la acreditación.

## Funciones

- `abrir_votacion_punto_demo`: valida rol, asamblea `en_curso`, punto con regla de
  votación y no votado ya; fija `votacion_abierta_en`.
- `cerrar_votacion_punto_demo`: valida votación abierta; agrega desde `asamblea_votos`
  (suma de coeficiente y conteo de unidades por opción); calcula aprobado según la base
  que corresponda a la regla del punto (coeficiente para `coeficiente`/
  `coeficiente_calificado`, conteo de unidades para `unidad`); congela `resultado`; marca
  el punto `votado`.
- `votar_punto_orden_dia_demo`: valida rol, votación abierta, resuelve la unidad por
  código, exige una acreditación activa de calidad `propietario`/`apoderado` para esa
  unidad en esa asamblea, congela su coeficiente, inserta el voto.
- `revocar_voto_punto_demo`: valida rol y que la votación siga abierta; marca revocado.
- `listar_votaciones_asamblea_demo`: un ítem por punto con regla de votación, con estado
  (`not_started|open|closed`), el resultado agregado siempre, y el detalle por unidad
  solo si `funcionalidades_asamblea ->> 'secret_ballots'` es falso.

## API y proveedor de datos

- `POST/DELETE .../agenda/:itemId/votes`, `POST .../agenda/:itemId/voting/open`,
  `POST .../agenda/:itemId/voting/close`, `GET .../voting` (todas las votaciones de la
  asamblea en una sola llamada, mismo patrón que asistentes/agenda).
- `AssemblyWorkspace` agrega el mismo patrón de estado/efecto/guards de carrera que ya
  usan asistentes y agenda, disparando el fetch cuando la etapa activa es `live`.

## Interfaz

- Nuevo `components/assembly-voting.tsx`: un panel por punto votable dentro de
  `LiveStage`, con abrir/cerrar votación, formulario para registrar el voto de una
  unidad y, cuando no es secreta, la lista de unidades que ya votaron con acción de
  revocar.
- Se retiran `defaultVotes`/`assembly.dossier.votes` de `LiveStage`; el aviso de
  capacidad (`unit_voting`/`coefficient_voting`/`qualified_majorities`) se evalúa por
  punto según su `reglaVotacion` real, no sobre datos sintéticos.

## Pruebas

- pgTAP: solo admin abre/cierra/registra/revoca; bloqueo de doble voto; rechazo de voto
  sin acreditación de voto; rechazo de voto de residente_con_voz; cierre calcula
  correctamente sí/no/abstención sobre la base correcta según la regla; no se puede
  reabrir un punto votado; aislamiento entre conjuntos; ocultamiento del detalle por
  unidad cuando `secret_ballots` está activo.
- Vitest: helpers puros de cómputo de porcentaje/aprobación si se extraen, y los
  schemas Zod de emitir/abrir/cerrar voto.
