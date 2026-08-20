# Tareas — Crear cobro idempotente

Unidades implementables (mapean a ramas cortas, §3). Cada una con sus tests.
Estado tras Fase 0+1 (validado con typecheck · lint · test · nest build en verde):

- [x] **T1 — Esquema de datos.** Tablas `payments`, `payment_idempotency`
      (UNIQUE `tenant_id,idempotency_key`) y `payment_audit` (append-only, trigger de
      inmutabilidad) en schema `evepay`, con `tenant_id` y RLS. En Drizzle
      (`apps/api/src/database/schema.ts`) y SQL (`supabase/migrations/0001_init_evepay.sql`).
- [x] **T2 — Máquina de estados.** `payment-state.ts`: transiciones válidas
      `creado→pendiente→aprobado|fallido→conciliado`.
- [x] **T3 — Auditoría.** Registro inmutable de la transición inicial en cada creación.
- [x] **T4 — `PagosService.crearCobro`.** Idempotencia (lookup por clave, hash de
      request, `409` en conflicto, resolución de carrera) + llamada al provider.
- [x] **T5 — `PagosController`.** `POST /v1/pagos`, header `Idempotency-Key`
      obligatorio, validación Zod, RBAC (`@Roles`), mapeo de errores 400/409.
- [~] **T6 — `AkuaPaymentProvider`.** Esqueleto implementado (`akua-payment.provider.ts`)
  con reenvío de `Idempotency-Key`. **Pendiente:** correr contra el sandbox real y
  fijar los nombres de campos al obtener las `ak_test_` keys.
- [x] **T7 — Tests (derivados de EARS).** 7 criterios EARS + aislamiento por tenant
  - RBAC. `apps/api`: 12 tests en verde (service 6, controller 3, guard 3).
- [ ] **T8 — Dogfooding.** `server/evepay-client.ts` de EveConecta crea un cobro
      real y guarda `cuota.evepay_cobro_id`. Pendiente (necesita la API desplegada).

## Definition of Done (además de §6 y del plan)

- [x] Los 7 criterios EARS del `spec.md` tienen test y pasan.
- [x] `lint`, `typecheck`, `test` en verde.
- [x] Sin PAN en servidor/logs; secretos de Akua fuera del repo.
- [ ] Cobro creado exitosamente en el sandbox de Akua. (Pendiente de `ak_test_` keys.)
