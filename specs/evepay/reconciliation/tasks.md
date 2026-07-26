# Tareas — Conciliación

- [x] **T1 — Contrato.** `listarLiquidaciones` en `PaymentProvider` (fake/akua).
- [ ] **T2 — Repo.** `listarCobrosAprobados(tenantId, rango)` en ambos adaptadores.
- [ ] **T3 — Ledger.** `LedgerService.registrarCobroConciliado` (débito banco / crédito akua_clearing).
- [ ] **T4 — Servicio.** `ReconciliacionService.conciliar` (cruce + transición + asiento + reporte).
- [ ] **T5 — Endpoint.** `POST /v1/conciliacion/run` (Zod + RBAC + tenant). `PAYMENT_PROVIDER` global.
- [ ] **T6 — Tests (EARS 1-5).** cuadra→conciliado+ledger, diferencia, huérfano, no-conciliado, idempotencia.
- [ ] **T7 — Validar** typecheck·lint·test·build.

## Definition of Done (además de §6)

- [ ] 5 criterios EARS con test, en verde.
- [ ] Conciliar asienta en el ledger inmutable; idempotente; acotado por tenant.
