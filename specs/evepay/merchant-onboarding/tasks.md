# Tareas — Onboarding de comercios

- [ ] **T1 — Migración 0004** `provider_merchant_id` + función `merchant_by_provider`.
- [ ] **T2 — Contrato** `CrearMerchantInput`, `crearMerchant` en PaymentProvider (fake/akua).
- [ ] **T3 — MerchantsRepository** (puerto + in-memory + Drizzle) + wiring global.
- [ ] **T4 — MerchantsService + MerchantsController** (`POST /v1/merchants`).
- [ ] **T5 — Webhook** `merchant.approved` → `aprobado`.
- [ ] **T6 — Tests EARS** (crear→en_revision, body inválido→400, approved→aprobado, provider inexistente→no-op).
- [ ] **T7 — Validar** typecheck·lint·test·build.

## Definition of Done (además de §6)
- [ ] 4 criterios EARS con test, en verde.
- [ ] RLS por tenant; alta en proveedor detrás de la interfaz; secretos fuera del repo.
