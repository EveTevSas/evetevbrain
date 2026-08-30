# Programación de asambleas

## Objetivo

Permitir que administración y superadministración programen convocatorias de asamblea con información suficiente para iniciar su expediente verificable.

## Datos requeridos

- Nombre de la asamblea.
- Tipo: ordinaria, extraordinaria o informativa.
- Modalidad: presencial, virtual o híbrida.
- Fecha y hora futura.
- Lugar, enlace o combinación de ambos según la modalidad.
- Orden del día.

## Reglas

- Solo administración y superadministración pueden programar.
- Una asamblea virtual requiere un enlace HTTPS.
- La fecha y hora deben estar en el futuro.
- Una nueva asamblea inicia programada, con quórum y representación en cero.
- El registro se conserva en la tabla relacional, el escenario visible y la auditoría inmutable.
- Los miembros activos solo consultan asambleas de su copropiedad.
