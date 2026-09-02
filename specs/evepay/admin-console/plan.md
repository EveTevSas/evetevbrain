# Plan — Consola de administración de EvePay

## Arquitectura

```
apps/evepay-admin (Next.js, NUEVA)          apps/api (NestJS)
├── login (Supabase Auth de EvePay)         ├── /v1/admin/* ← RolesGuard(super_admin)
├── /comercios     ───── HTTP + JWT ──────► │    merchants: listar/crear/rotar/desactivar (base ya existe)
├── /proveedores   ───────────────────────► │    providers: estado/salud/checklist (NUEVO)
├── /pagos         ───────────────────────► │    pagos: listado cross-tenant + timeline + reverify (NUEVO)
└── /conciliacion  ───────────────────────► │    conciliación por tenant + ledger + saldo (NUEVO/extender)
```

- **`apps/evepay-admin`**: Next.js App Router, mismo stack que EveConecta
  (Supabase Auth con `@supabase/ssr`), UI con el patrón de marca
  (`packages/brand/patrones/login/` + tokens). Puerto local **3004**. No tiene
  base de datos propia: TODO pasa por la API de EvePay (dogfooding, §1.4). No
  toca Postgres directo.
- **Auth**: proyecto Supabase de **EvePay** (no el de la vertical). El rol
  `super_admin` viaja en el JWT y lo verifica `RolesGuard` en la API
  (identidad-rbac, Fase 0). Los usuarios se aprovisionan por script, como en
  EveConecta; sin registro público.
- **API**: los endpoints admin viven bajo `/v1/admin/*`, todos con
  `@Roles(Role.SUPER_ADMIN)`. Los dos existentes (`GET/POST /v1/admin/merchants`
  con `X-Admin-Secret`) migran al guard; el header y `ADMIN_SECRET` se retiran
  al final (tarea propia). La página embebida `admin-page.ts` se elimina cuando
  la consola cubra sus dos funciones.

## Endpoints (existentes → nuevos)

| Sección      | Endpoint                                        | Estado                                   |
| ------------ | ----------------------------------------------- | ---------------------------------------- |
| Comercios    | `GET /v1/admin/merchants`                       | existe (migrar auth)                     |
| Comercios    | `POST /v1/admin/merchants`                      | existe (migrar auth; CA-8 agregador)     |
| Comercios    | `POST /v1/admin/merchants/:id/api-keys/rotate`  | nuevo (CA-9)                             |
| Comercios    | `POST /v1/admin/merchants/:id/desactivar`       | nuevo (CA-10)                            |
| Proveedores  | `GET /v1/admin/providers`                       | nuevo (CA-11: activo, config, capac.)    |
| Proveedores  | `POST /v1/admin/providers/health`               | nuevo (CA-12: prueba real)               |
| Proveedores  | `GET /v1/admin/providers/checklist`             | nuevo (CA-13)                            |
| Pagos        | `GET /v1/admin/pagos` (filtros + paginación)    | nuevo (CA-15)                            |
| Pagos        | `GET /v1/admin/pagos/:tenantId/:id/timeline`    | nuevo (CA-16: auditoría+webhooks+ledger) |
| Pagos        | `POST /v1/admin/pagos/:tenantId/:id/reverify`   | nuevo (CA-17/18)                         |
| Conciliación | `POST /v1/admin/conciliacion/:tenantId/run`     | extender `/v1/conciliacion/run` (CA-19)  |
| Conciliación | `GET /v1/admin/conciliacion/:tenantId/reportes` | nuevo (CA-19: histórico de corridas)     |
| Ledger       | `GET /v1/admin/ledger/:tenantId`                | nuevo (CA-21: asientos + saldo)          |
| Auditoría    | (transversal) registro por acción de escritura  | nuevo (CA-4/5)                           |

Listados cross-tenant: mismo mecanismo que `identity.admin_listar_comercios()`
— funciones `SECURITY DEFINER` explícitas por consulta, nunca un rol que salte
RLS (§4).

## Restricciones

- **§4**: la consola jamás ve secretos de proveedores — la API reporta
  presencia (configurado sí/no) y resultado de salud. Los valores viven en
  Railway.
- **API keys de comercio**: la clave completa existe solo en la respuesta del
  alta/rotación (en la DB solo hash SHA-256). La UI la muestra una vez con
  copia manual y aviso de no-recuperable (comportamiento ya pactado).
- **Multi-tenant**: cada lectura cross-tenant pasa por función SECURITY
  DEFINER dedicada; los tests de aislamiento de Fase 0 siguen siendo la vara.
- **Auditoría primero** (CA-5): la acción falla si no se puede auditar.
- **No sobre-ingeniar** (§1): sin librería de componentes nueva; estilos con
  los tokens de brand como en EveConecta/EveLedger.

## Decisiones

- **App aparte y no página embebida**: elegida por la fundadora (2-sep-2026).
  La página embebida ya costaba 392 líneas de HTML en un `.ts` para dos
  funciones; roles y cuatro secciones no caben en ese formato.
- **Supabase Auth y no X-Admin-Secret**: un secreto compartido no distingue
  personas → sin auditoría real (CA-4) ni revocación individual. El RBAC de
  Fase 0 ya existe; usarlo es menos código que mantener dos mecanismos.
- **La consola consume la API, sin DB propia**: mantiene una sola frontera de
  datos y fuerza a que todo lo administrable exista como endpoint auditado.
- **Deploy**: proyecto Vercel nuevo (Root Directory `apps/evepay-admin`) con el
  `ignoreCommand` estándar; sin dominio de marca hasta que la consola se use a
  diario (patrón EveLedger). La API sigue su camino a Railway.

## Riesgos

- La API aún no está desplegada (Railway pendiente): la consola nace apuntando
  a la API local/preview. No bloquea el desarrollo (mismo caso que EveConecta
  con `NEXT_PUBLIC_API_URL`).
- El PR de ComboPay (`feat/provider-combopay`) debe mergearse antes de la
  sección de proveedores (CA-11/13 lo referencian).
