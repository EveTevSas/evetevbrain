# Aislamiento multi-tenant con RLS

> Fase 0 del [plan de EvePay](../../docs/PLAN_DESARROLLO_EVEPAY.md). Cimiento
> no-reescribible (§1, §4).

## Problema

EvePay maneja dinero de varios comercios. Un comercio (tenant) **jamás** puede ver
ni tocar datos de otro. El aislamiento no puede depender de un `WHERE` en el código
(un olvido = fuga de datos entre comercios): se hace valer en la base con
**Row-Level Security**.

## Usuarios / actores

- **Comercio** = tenant de EvePay.
- **Sistema EvePay** que ejecuta consultas en nombre de un tenant.

## Resultado esperado

Toda tabla del schema `evepay` con datos de tenant lleva `tenant_id` y una política
RLS. El backend fija `SET LOCAL app.tenant_id` por transacción; las consultas solo
ven filas de ese tenant.

## Requisitos funcionales

- Schemas `identity`, `evepay`, `audit` (ver `supabase/migrations/0001_init_evepay.sql`).
- `tenant_id` en `merchants`, `payments`, `payment_idempotency`, `payment_audit`.
- RLS habilitado + política `tenant_isolation` usando `app_current_tenant()`.
- El backend abre transacción y hace `select set_config('app.tenant_id', <uuid>, true)`
  antes de cualquier consulta (adaptador Drizzle).
- La API conecta con un rol que **respeta** RLS (no owner, no BYPASSRLS).

## No-objetivos

- Autenticación (→ `specs/identidad-rbac`). Aquí solo el aislamiento de datos.

## Casos borde

- Sin `app.tenant_id` fijado → la política no matchea ninguna fila (no fuga).
- Consulta por id de un cobro de otro tenant → 0 filas.

## Criterios de aceptación (EARS)

1. **CUANDO** una transacción fija `app.tenant_id = A` y consulta `evepay.payments`, **EL** sistema **DEBERÁ** devolver únicamente filas cuyo `tenant_id = A`.
2. **CUANDO** un actor del tenant A pide por id un cobro del tenant B, **EL** sistema **DEBERÁ** responder como inexistente (0 filas), sin filtrar en código.
3. **CUANDO** se inserta una fila con `tenant_id` distinto al de `app.tenant_id`, **EL** sistema **DEBERÁ** rechazarla (política `with check`).

## Restricciones de la constitución

- §4: RLS obligatorio; test de aislamiento obligatorio.
- Verificación a nivel de aplicación: `apps/api` (repositorio in-memory replica el
  filtro por tenant). Verificación a nivel DB: bloque SQL en `supabase/README.md`.
