# Aprobación de gastos

## Objetivo

Impedir que un gasto sujeto a regla avance sin autoridad y aprobaciones suficientes.

## Requisitos EARS

1. **EXPENSE-001** — CUANDO un rol no autorizado intenta aprobar, EL SISTEMA DEBERÁ rechazar la acción.
2. **EXPENSE-002** — CUANDO se alcanza el número requerido, EL SISTEMA DEBERÁ cambiar el gasto a aprobado.

## Invariantes

- Aprobaciones no exceden el requisito.
- Aprobar no equivale a pagar.
- Cada aprobación genera auditoría.

## Evidencia de aceptación

- `HabitatService.approveExpense`.
- Endpoint y pantalla de presupuesto.
- Constraints de estado y conteo en PostgreSQL.
