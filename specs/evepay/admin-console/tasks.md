# Tareas — Consola de administración de EvePay

Orden pensado para que cada fase deje algo usable. Cada tarea entra con sus
tests derivados de los CA que cita.

## Fase A — Fundación (sin esto no hay consola)

- [ ] A1 — Scaffold `apps/evepay-admin`: Next.js + Supabase Auth (proyecto
      EvePay), login con el patrón de `packages/brand/patrones/login/`,
      layout con navegación de las 4 secciones, puerto 3004, `vercel.json`
      con `ignoreCommand`. (CA-1)
- [ ] A2 — Guard de rol en la consola y en la API: middleware que exige
      `super_admin` en toda ruta (CA-2); job de CI para la app nueva
      (`scripts/ci-areas.sh` + workflow).
- [ ] A3 — Migrar `GET/POST /v1/admin/merchants` de `X-Admin-Secret` a
      `RolesGuard(super_admin)` con JWT (CA-3). El header sigue aceptándose
      hasta F1 (doble mecanismo transitorio, con fecha de retiro).
- [ ] A4 — Auditoría de acciones admin: tabla inmutable (quién/qué/cuándo),
      helper transversal, la acción falla si no audita (CA-4, CA-5).
- [ ] A5 — Script de aprovisionamiento de usuarios admin (patrón
      `auth:provision-user` de EveConecta).

## Fase B — Comercios y onboarding

- [ ] B1 — Listado de comercios (consume el endpoint existente; CA-6).
- [ ] B2 — Alta de comercio con las claves mostradas una sola vez (CA-7) y el
      paso manual del proveedor agregador señalado (CA-8).
- [ ] B3 — Rotación de API key: endpoint atómico + UI (CA-9).
- [ ] B4 — Desactivar comercio: endpoint + efecto en cobros nuevos + UI (CA-10).

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
