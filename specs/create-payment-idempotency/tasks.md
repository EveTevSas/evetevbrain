# Tareas — Crear cobro idempotente

Unidades implementables (mapean a ramas cortas, §3). Cada una con sus tests.

- [ ] **T1 — Esquema de datos.** Migración Drizzle: tablas `payments`,
  `payment_idempotency` (UNIQUE `tenant_id,idempotency_key`) y `payment_audit`
  (append-only) en schema `evepay`, con `tenant_id` y RLS.
- [ ] **T2 — Máquina de estados.** Tipo y transiciones válidas
  `creado→pendiente→aprobado|fallido→conciliado`; rechazar transiciones inválidas.
- [ ] **T3 — Auditoría.** Registrar cada transición (inmutable) en `payment_audit`.
- [ ] **T4 — `PagosService.crearCobro`.** Lógica de idempotencia (lookup por clave,
  hash de request, `409` en conflicto, insert transaccional) + llamada al provider.
- [ ] **T5 — `PagosController`.** `POST /v1/pagos`, header `Idempotency-Key`
  obligatorio, validación Zod, mapeo de errores (400/409).
- [ ] **T6 — `AkuaPaymentProvider` (sandbox).** Implementa `crearCobro` contra
  `POST /v1/payments` con `ak_test_` y reenvío de `Idempotency-Key`. (Fake ya existe.)
- [ ] **T7 — Tests (derivados de EARS).** Idempotencia (mismo/distinto body),
  falta de header, body inválido, concurrencia (unicidad DB), aislamiento por tenant.
- [ ] **T8 — Dogfooding.** `server/evepay-client.ts` de Eve-Habitat crea un cobro
  y guarda `cuota.evepay_cobro_id` (sin FK entre schemas).

## Definition of Done (además de §6 y del plan)

- [ ] Los 7 criterios EARS del `spec.md` tienen test y pasan.
- [ ] `lint`, `typecheck`, `test` en verde.
- [ ] Sin PAN en servidor/logs; secretos de Akua en el entorno, no en el repo.
- [ ] Cobro creado exitosamente en el sandbox de Akua.
