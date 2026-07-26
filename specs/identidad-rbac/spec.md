# Identidad y RBAC

> Fase 0 del [plan de EvePay](../../docs/PLAN_DESARROLLO_EVEPAY.md). Cimiento (§4).

## Problema

Cada endpoint de EvePay debe saber **quién** llama (tenant + actor) y **con qué
rol**, y rechazar lo no autorizado. El contexto de tenant además alimenta el
aislamiento (RLS, ver [[multi-tenancy-rls]]).

## Usuarios / actores

- `super_admin` (Evetev): operación multi-comercio.
- `admin_comercio`: administra su propio comercio (tenant).

## Resultado esperado

En cada request se establece un contexto `{ tenantId, actor, role }`. Los endpoints
declaran los roles permitidos; sin tenant válido responden 401 y con rol no
autorizado 403.

## Requisitos funcionales

- `TenantMiddleware` establece el contexto por request (hoy desde cabeceras
  `X-Tenant-Id`/`X-Actor`/`X-Role` como puente; el reemplazo es el **JWT de
  Supabase** — follow-up).
- `@Roles(...)` declara roles por endpoint; `RolesGuard` los verifica.
- El `tenantId` debe ser un uuid válido.

## No-objetivos

- Emisión/validación real del JWT de Supabase (follow-up de Fase 0).
- Gestión de usuarios/roles en base de datos (más adelante).

## Casos borde

- Falta `tenantId` o no es uuid → 401.
- Rol ausente o no incluido en los permitidos → 403.
- Endpoint sin `@Roles` → solo exige tenant válido.

## Criterios de aceptación (EARS)

1. **CUANDO** llega un request sin `tenantId` válido a un endpoint protegido, **EL** sistema **DEBERÁ** responder 401.
2. **CUANDO** el actor tiene un rol que no está en los permitidos del endpoint, **EL** sistema **DEBERÁ** responder 403.
3. **CUANDO** el actor tiene un rol permitido y tenant válido, **EL** sistema **DEBERÁ** permitir la ejecución.

## Restricciones de la constitución

- §4: cada endpoint declara su rol; contexto de tenant para RLS.
- Sin PII en logs; el `actor` en auditoría es un id, no datos personales.
