# Tareas — Consola de administración de EvePay

Orden pensado para que cada fase deje algo usable. Cada tarea entra con sus
tests derivados de los CA que cita.

## Fase A — Fundación (sin esto no hay consola)

- [x] A1 — Scaffold `apps/evepay-admin`: Next.js + Supabase Auth (proyecto
      EvePay), login con el patrón de `packages/brand/patrones/login/`,
      layout con navegación de las 4 secciones, puerto 3004, `vercel.json`
      con `ignoreCommand`. (CA-1)
- [x] A2 — Guard de rol en la consola y en la API: proxy que exige
      `super_admin` en toda ruta (CA-2); job de CI para la app nueva
      (`scripts/ci-areas.sh` + workflow).
- [x] A3 — Migrar el acceso admin de `X-Admin-Secret` a JWT de Supabase con
      rol `super_admin` verificado en la API (CA-3; `supabase-jwt.ts` +
      `TenantMiddleware`). El header sigue aceptándose hasta F1.
- [x] A4 — Auditoría de acciones admin: `audit.admin_actions` inmutable con
      RLS sin políticas (solo se entra por funciones SECURITY DEFINER),
      `AdminAuditService.registrarEn(tx)` dentro de la transacción de cada
      acción, y `GET /v1/admin/auditoria` (CA-4, CA-5).
- [x] A5 — Script de aprovisionamiento de usuarios admin
      (`pnpm auth:provision-admin`, rol en app_metadata).

## Fase B — Comercios y onboarding

- [x] B1 — Listado de comercios con estado, KYC y prefijos de sus claves (CA-6).
- [x] B2 — Alta de comercio con las claves mostradas una sola vez (CA-7) y el
      paso manual señalado cuando el proveedor es agregador (CA-8). Requirió
      añadir `capacidades` al contrato `PaymentProvider`: preguntar antes de
      intentar, para no confundir "no lo ofrece" con "está caído".
- [x] B3 — Rotación de API key: revoca las anteriores y crea la nueva en una
      sola transacción, con la clave mostrada una vez (CA-9).
- [x] B4 — Activar/desactivar comercio (CA-10). El bloqueo de cobros nuevos se
      resolvió en `identity.validar_api_key`, que ahora exige que el tenant
      esté activo: es la única puerta por la que entra una API key, así que
      cubre también los endpoints futuros.

## Fase C — Proveedores

- [ ] C1 — `GET /v1/admin/providers`: activo, presencia de config y
      capacidades por proveedor (CA-11, CA-14 en el detalle de cobro).
- [ ] C2 — Prueba de salud real por proveedor (CA-12): fake = ok; combopay =
      GET autenticado barato; akua = token OAuth. Sin tocar dinero.
- [ ] C3 — Checklist de habilitación (CA-13), empezando por los pasos T6 de
      `provider-combopay`.
- [ ] C4 — UI de la sección con estado visual (activo / configurado / salud).

## Fase D — Pagos y cobros

- [ ] D1 — Listado cross-tenant con filtros y paginación: función SECURITY
      DEFINER + endpoint + UI (CA-15).
- [ ] D2 — Timeline del cobro: transiciones, eventos webhook (incluidos
      duplicados descartados) y asientos ligados (CA-16).
- [ ] D3 — Reverificación manual contra el proveedor, auditada y respetando la
      máquina de estados (CA-17, CA-18).

## Fase E — Conciliación y ledger

- [ ] E1 — Conciliación por tenant desde la consola + histórico de corridas
      (CA-19); estado "conciliación manual" cuando el proveedor no da
      settlements (CA-20).
- [ ] E2 — Vista de ledger con saldo reconstruido y alarma de descuadre
      (CA-21).

## Fase F — Cierre

- [ ] F1 — Retirar `X-Admin-Secret`, `ADMIN_SECRET` y la página embebida
      `admin-page.ts` (la consola ya cubre sus funciones). Actualizar
      `docs/DESPLIEGUE.md` y los README.
- [ ] F2 — Registrar la consola en `docs/DESPLIEGUE.md` (proyecto Vercel) y en
      el CLAUDE.md raíz (mapa de apps, puerto, criterio de deploy sano).

## Dependencias

- El PR `feat/provider-combopay` mergeado antes de C1–C3.
- Proyecto Supabase de EvePay con Auth habilitado antes de A1.
- La lista maestra de `docs/PLAN_DESARROLLO_EVEPAY.md` gana la fila
  `admin-console` (este spec).
