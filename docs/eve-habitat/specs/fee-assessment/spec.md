# Liquidación de cuotas

## Objetivo

Generar obligaciones por periodo preservando el coeficiente y evitando duplicados.

## Requisitos EARS

1. **FEE-001** — CUANDO se repite la liquidación del mismo periodo y concepto, EL SISTEMA DEBERÁ omitir nuevas obligaciones.
2. **FEE-002** — CUANDO cambia un coeficiente después de liquidar, EL SISTEMA DEBERÁ conservar la versión usada.

## Invariantes

- Periodo, unidad y concepto son únicos.
- Monto y saldo usan unidad menor.
- Cada obligación conserva `coefficient_version`.

## Evidencia de aceptación

- Endpoint `/v1/habitat/assessments/run`.
- Constraint y columna versionada en PostgreSQL.
- Prueba FEE-001.
