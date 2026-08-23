# Tareas — Ledger inmutable

- [ ] **T1 — Migración 0003.** `ledger_entries` (único `tenant,payment,kind`) y
      `ledger_lines` (`amount_minor > 0`), RLS + triggers de inmutabilidad.
- [ ] **T2 — Schema Drizzle** de ambas tablas.
- [ ] **T3 — LedgerRepository** (puerto) + adaptadores in-memory y Drizzle:
      `postEntry` (valida balance, idempotente), `saldoCuenta`, `contarAsientosPorPago`.
- [ ] **T4 — LedgerService** `registrarCobroAprobado` (débito akua_clearing +
      crédito merchant_payable) + `saldo`. Wiring del repo en el módulo global.
- [ ] **T5 — Integración** en `WebhooksService`: al pasar a `aprobado`, asentar.
- [ ] **T6 — Tests (EARS 1-5)** balanceado, desbalanceado→rechazo, saldo reconstruido,
      idempotencia, y posteo automático al aprobar (webhook).
- [ ] **T7 — Validar** typecheck·lint·test·build.

## Definition of Done (además de §6)

- [ ] Los 5 criterios EARS con test y en verde.
- [ ] Asientos inmutables; montos en centavos; balance garantizado.
- [ ] Saldo reconstruido desde líneas (sin campo mutable).
