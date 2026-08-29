# Aislamiento multi-tenant

## Objetivo

Impedir que una identidad lea, modifique o infiera recursos de otra copropiedad.

## Requisitos EARS

1. **TENANT-001** — CUANDO un JWT del tenant A consulta una tabla protegida, EL SISTEMA DEBERÁ devolver únicamente filas cuyo `tenant_id` sea A.
2. **TENANT-002** — CUANDO un usuario del tenant A intenta insertar o modificar una fila del tenant B, EL SISTEMA DEBERÁ rechazar la operación sin revelar el recurso.

## Invariantes

- Toda tabla de negocio incluye `tenant_id`.
- RLS está habilitado y forzado con política `default deny`.
- La API responde 404 ante cruces de tenant.

## Evidencia de aceptación

- Migración SQL con políticas RLS para 33 tablas.
- Pruebas pgTAP TENANT-001 a TENANT-005.
- Prueba de servicio TENANT-API-001.
