# Acta y cierre de asamblea

## Propósito

Convertir la etapa "Acta y cierre", hoy una tarjeta decorativa con versión/firmas/
publicación sintéticas derivadas solo de `assembly.status === "closed"`, en un acta real:
administración designa presidencia y secretaría entre los asistentes acreditados, redacta
un resumen, la firma (congelando su contenido) y la publica. El contenido reconstruible
(convocatoria, asistentes, coeficientes, poderes, resultado de cada votación) se lee en
vivo desde las tablas reales ya construidas en los tres bloques anteriores — el acta no
lo duplica, solo lo envuelve con la capa narrativa y el flujo de firma/publicación.

## Marco de referencia

`FASE_3_PLAN_DESARROLLO_EVE_HABITAT.md` §9.4: "convocatoria, entrega, poderes, resultados
y acta forman un expediente exportable". Depende de
`specs/eve-conecta/poderes-y-acreditacion-asamblea` (de ahí salen presidencia y
secretaría), `specs/eve-conecta/orden-del-dia-editable` y
`specs/eve-conecta/votacion-real-asamblea` (contenido reconstruible del acta).

## Brecha encontrada al arrancar este bloque

Ninguna función existente transiciona `conjuntos.asambleas.estado`: `programar_asamblea_demo`
solo fija el estado inicial `programada`, y nada en el código de aplicación lo mueve a
`en_curso` ni a `cerrada` — hasta ahora esos cambios solo se hicieron a mano con SQL directo
para poder probar los bloques de acreditación y votación. Firmar un acta exige que la
asamblea ya haya cerrado (regla 4), así que este bloque agrega las dos funciones de ciclo
de vida que faltaban (`iniciar_asamblea_demo`, `cerrar_asamblea_demo`) como prerrequisito
mínimo — sin ellas, ninguna asamblea real podría llegar nunca a "en curso" ni a "cerrada"
desde la interfaz.

## Quién gestiona el acta

Igual que acreditación y votación, el acta la gestiona **administración**
(`super_admin`/`admin_conjunto`), no cada residente. Los cuatro roles con acceso a la
asamblea pueden leerla una vez publicada; antes de publicarse, el borrador y la firma son
visibles solo para administración (mismo criterio de sensibilidad que el resto del
expediente antes de su cierre).

## Reglas

1. Solo `super_admin`/`admin_conjunto` inician la asamblea, la cierran, designan
   presidencia/secretaría, redactan el resumen, firman y publican el acta.
2. Iniciar una asamblea (`programada` → `en_curso`) no tiene más precondición que el
   estado actual. Cerrarla (`en_curso` → `cerrada`) exige que ningún punto del orden del
   día tenga una votación abierta (`votacion_abierta_en` sin `votacion_cerrada_en`) —
   cerrar la asamblea con una votación en curso perdería esos votos de la vista del acta.
3. El acta es un registro único por asamblea (una fila, no un historial de versiones):
   administración la crea/edita mientras esté en estado `borrador`, indicando presidencia,
   secretaría y un resumen narrativo.
4. Presidencia y secretaría deben ser dos personas distintas, cada una con una
   acreditación activa (no revocada) en esa misma asamblea. Cualquier calidad de
   acreditación es válida (propietario, apoderado, residente con voz o invitado) — este
   sistema no impone quién puede presidir, solo que quien presida haya asistido.
5. El acta solo puede firmarse cuando: la asamblea está `cerrada`, tiene presidencia y
   secretaría designadas, y el resumen no está vacío. Firmar es definitivo — no se vuelve
   a `borrador`; cualquier corrección posterior requiere una nueva asamblea o queda fuera
   de este flujo (igual que el cierre de una votación).
6. Firmar congela un número de versión (cuántas veces se guardó el borrador hasta ese
   punto) y una marca de tiempo (`firmadaEn`); ninguno de los dos vuelve a cambiar.
7. El acta solo puede publicarse después de firmada. Publicar fija `publicadaEn` y hace
   visible el acta a consejo y residentes; antes de publicarse, solo administración la ve.
8. El contenido reconstruible (asistentes, coeficientes, poderes, resultado de cada punto
   votado) nunca se copia dentro del acta: se consulta en vivo desde acreditaciones, orden
   del día y votos cada vez que se lee el acta. Si algo cambiara después de firmar (no
   debería, porque acreditación y votación ya están cerradas para una asamblea `cerrada`),
   el acta reflejaría ese cambio — un riesgo aceptado y documentado, no resuelto por este
   bloque.

## Fuera de alcance

- Firma digital/criptográfica: "firmar" aquí es una transición de estado administrada, no
  una firma electrónica verificable legalmente.
- Seguimiento de decisiones/compromisos con responsable y fecha (bloque siguiente,
  "decisiones").
- Exportar el acta a PDF u otro formato descargable.
- Plantillas o texto legal predefinido para el resumen; el campo es texto libre.
- Reabrir o corregir una asamblea ya cerrada (por ejemplo, para agregar una acreditación
  olvidada) — eso pertenece a un futuro flujo de "actas complementarias", no a este bloque.
