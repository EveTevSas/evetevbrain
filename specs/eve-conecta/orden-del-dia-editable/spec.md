# Orden del día editable

## Propósito

Convertir el orden del día del expediente de asamblea, hoy tres puntos fijos generados
por código, en una lista real que la administración puede crear, editar, reordenar y
bloquear — prerrequisito de la votación real, que colgará cada voto de un punto
concreto.

## Marco de referencia

`docs/eve-habitat/FASE_2_BASICOS_Y_DIFERENCIADORES.md` §3.10 pide "convocatoria, agenda,
documentos previos"; `FASE_3_PLAN_DESARROLLO_EVE_HABITAT.md` §9.4 exige que la
convocatoria (y por tanto su agenda) forme parte de un expediente exportable. La
capacidad `document_repository` de `lib/assemblies.ts` ya vincula soportes a un punto del
orden del día (`agendaItemId`); esta spec les da un punto real al que apuntar.

## Datos de un punto del orden del día

- Título.
- Tipo de decisión: informativa, económica, no económica o mayoría calificada.
- Regla de votación: ninguna, por unidad, por coeficiente o coeficiente con mayoría
  calificada.
- Umbral (%), obligatorio salvo en puntos informativos.
- Estado: borrador o listo (el estado "votado" lo fijará el bloque de votación, no se
  puede establecer manualmente todavía).
- Posición en el orden del día.

## Reglas

1. Solo `super_admin` y `admin_conjunto` crean, editan, reordenan o eliminan puntos.
2. Un punto informativo no lleva regla de votación ni umbral; cualquier otro tipo de
   decisión exige ambos.
3. Una mayoría calificada exige un umbral superior al 50% (por definición, una mayoría
   calificada es más exigente que la mayoría simple).
4. El orden del día se **bloquea** — nadie edita, agrega ni elimina puntos — cuando:
   - la asamblea ya no está `programada` (pasó a en curso o cerrada), o
   - la asamblea es **extraordinaria** y ya se envió al menos una convocatoria por
     email (Ley 675 exige que una asamblea extraordinaria decida únicamente sobre lo
     anunciado en su convocatoria).
5. Todos los roles con acceso a la asamblea (administración, consejo, residente) pueden
   **consultar** el orden del día; solo administración lo edita.
6. Cada cambio queda en la auditoría inmutable.
7. No se codifican umbrales legales específicos por tipo de decisión (p. ej. "económica
   siempre 50%"): cada copropiedad los define en su reglamento. El sistema valida rangos
   y coherencia, no cifras impuestas.

## Fuera de alcance

- La votación misma (abrir/cerrar votos, tabular resultados): bloque siguiente.
- Vincular los soportes ya cargados a los puntos reales (hoy solo referencian ids
  sintéticos del dossier demo); se resuelve cuando el repositorio de soportes deje de
  vivir en el snapshot JSON.
