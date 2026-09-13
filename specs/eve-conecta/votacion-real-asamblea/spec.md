# Votación real de asambleas

## Propósito

Convertir la etapa "En vivo" del expediente, hoy un resultado fijo generado por código,
en una votación real: cada punto del orden del día (ya editable desde el bloque anterior)
se abre, recibe votos por unidad y se cierra con un resultado calculado desde los votos y
el coeficiente congelado en la acreditación de cada unidad.

## Marco de referencia

`FASE_3_PLAN_DESARROLLO_EVE_HABITAT.md` §9.4: "cada voto conserva identidad autorizada,
pregunta, opciones, coeficiente aplicable y sello de tiempo"; "el sistema bloquea doble
representación y voto duplicado"; "correcciones se hacen por evento compensatorio, no
editando el voto original". Esta spec depende de
`specs/eve-conecta/orden-del-dia-editable` (el punto a votar) y de
`specs/eve-conecta/poderes-y-acreditacion-asamblea` (de dónde sale el coeficiente y quién
tiene voto).

## Quién registra el voto

Igual que la acreditación, el voto lo registra la **mesa de votación** (administración),
no cada residente por autoservicio desde el portal. Es el mismo modelo operativo ya
usado para acreditar asistentes, y evita depender de que cada apoderado tenga cuenta en
el portal. Autoservicio de votación queda fuera de este bloque.

## Reglas

1. Solo `super_admin`/`admin_conjunto` abren, cierran y registran votos.
2. Un punto solo se vota si su `reglaVotacion` no es "ninguna" (los informativos no se
   votan) y la asamblea está `en_curso`.
3. Una unidad vota como máximo una vez por punto mientras el voto está abierto — el
   mecanismo real es un índice único, igual que en acreditación.
4. Solo puede votar una unidad con acreditación activa de calidad `propietario` o
   `apoderado` en esa misma asamblea (residente con voz no vota, tiene voz, no voto).
5. El coeficiente que carga el voto es el que quedó congelado en la acreditación de esa
   unidad, no el coeficiente actual de la tabla `unidades`.
6. Corregir un voto es revocarlo (mientras la votación siga abierta) y volver a
   registrarlo — nunca se edita el voto original.
7. Cerrar una votación es definitivo: calcula y congela el resultado; no se puede volver
   a abrir un punto ya votado.
8. El umbral de aprobación se aplica sobre la base de votos "sí" y "no" (las
   abstenciones no cuentan en el denominador). Esta es una convención de conteo, no una
   cifra legal específica; cada copropiedad debe confirmarla con su reglamento antes de
   producción.
9. Cuando la capacidad `secret_ballots` está activa para la copropiedad, el detalle de
   qué unidad votó qué **no se muestra** en la interfaz (ni siquiera a administración) —
   solo el resultado agregado. El registro persiste igual para la auditoría, pero no se
   expone en las lecturas normales.
10. El resultado agregado (sí/no/abstención, aprobado o no) es visible para los cuatro
    roles con acceso a la asamblea; el detalle por unidad, cuando no es secreto, es
    visible solo para administración (misma sensibilidad que la acreditación).

## Fuera de alcance

- Autoservicio de votación por el residente desde su propio portal.
- Acta y firmas (bloque siguiente).
- Tope legal específico de umbral por tipo de decisión (ya documentado como pendiente en
  el bloque de orden del día).
- Votación secreta con anonimato criptográfico: "secreto" aquí significa que la
  interfaz no expone el detalle, no que el registro sea técnicamente imposible de
  auditar.
