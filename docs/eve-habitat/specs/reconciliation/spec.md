# Conciliación

## Objetivo

Comparar pagos, proveedor y ledger para hacer visibles todas las diferencias.

## Requisitos EARS

1. **RECON-001** — CUANDO un pago aprobado tiene asiento correspondiente, EL SISTEMA DEBERÁ marcarlo conciliado.
2. **RECON-002** — CUANDO falta evidencia, EL SISTEMA DEBERÁ contabilizar una discrepancia en lugar de ocultarla.

## Invariantes

- Cada ejecución conserva resumen y fecha.
- Las discrepancias tienen estado y explicación.
- La ejecución manual y programada usa el mismo caso de uso.

## Evidencia de aceptación

- `ReconciliationService` y prueba RECON-001.
- Endpoint `/v1/reconciliation`.
- Workflow Inngest diario a las 02:15 America/Bogota.
