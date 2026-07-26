# Plan — Ledger inmutable

## Persistencia (migración 0003)

- `evepay.ledger_entries`: `id`, `tenant_id`, `payment_id` (null), `kind`, `memo`,
  `posted_at`. Índice único `(tenant_id, payment_id, kind)` → idempotencia.
- `evepay.ledger_lines`: `id`, `entry_id` (fk), `tenant_id`, `account`,
  `direction` ('debit'|'credit'), `amount_minor` (> 0).
- RLS por tenant en ambas. Triggers de inmutabilidad (no update/delete).

## Repositorio (LedgerRepository, en el módulo global)

- `postEntry({ tenantId, paymentId?, kind, memo, lines[] })`:
  - Valida balance (`Σ debit == Σ credit`) **antes** de insertar; si no, lanza.
  - Inserta asiento + líneas atómicamente. Si ya existe `(tenant, payment, kind)`
    → `{ posted: false }` (idempotente).
- `saldoCuenta(tenantId, account)` → `Σ credit − Σ debit`.
- `contarAsientosPorPago(tenantId, paymentId)` → para tests.

## LedgerService (módulo ledger)

- `registrarCobroAprobado(tenantId, paymentId)`:
  - Lee el cobro (`PagosRepository.buscarCobro`) para monto y merchant.
  - `postEntry` con `débito akua_clearing` + `crédito merchant_payable:<merchant>`.
- `saldo(tenantId, account)` → delega en el repo.

## Integración

- `WebhooksService`, tras aplicar la transición a `aprobado`, llama a
  `LedgerService.registrarCobroAprobado`. Como el webhook ya es idempotente por
  `event_id` y la transición `pendiente→aprobado` ocurre una sola vez, el asiento no
  se duplica; además el índice único `(tenant, payment, kind)` lo blinda.

## Restricciones

- Balance validado en la capa de dominio (repo) + test; líneas en centavos.
- Cuentas como texto (`akua_clearing`, `merchant_payable:<merchantId>`) — el plan de
  cuentas se refina en fases posteriores.
