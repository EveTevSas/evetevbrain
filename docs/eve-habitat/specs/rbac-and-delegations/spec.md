# Roles y delegaciones

## Objetivo

Aplicar permisos por rol y representar delegaciones acotadas por propósito, unidad y vigencia.

## Requisitos EARS

1. **RBAC-001** — CUANDO un rol sin permiso intenta aprobar un gasto, EL SISTEMA DEBERÁ rechazar la acción.
2. **RBAC-002** — CUANDO una delegación está vencida o revocada, EL SISTEMA DEBERÁ ignorarla.

## Invariantes

- Los roles son conjuntos versionables de permisos.
- Las delegaciones tienen inicio, fin, propósito y revocación.
- Las acciones sensibles conservan actor y tenant.

## Evidencia de aceptación

- Contrato de contexto de tenant y rol.
- Matriz de autorización en gastos.
- Tabla `identity.delegations` con vigencia y RLS.
