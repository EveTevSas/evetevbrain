# Plan — Conciliación

## Componentes

- `ReconciliacionService.conciliar(tenantId, rango)`:
  1. `repo.listarCobrosAprobados(tenantId, rango)` → cobros locales.
  2. `provider.listarLiquidaciones(rango)` → liquidaciones del proveedor.
  3. Cruce por `providerPaymentId`; por cada cobro: cuadra→conciliar, distinto→diferencia,
     sin liquidación→noConciliado. Liquidaciones sin cobro→huérfano.
  4. Conciliar = `repo.aplicarTransicion(aprobado→conciliado)` + `ledger.registrarCobroConciliado`.
  5. Devuelve `ReporteConciliacion`.
- `ConciliacionController` `POST /v1/conciliacion/run` (RBAC, tenant del contexto),
  body `{ desde, hasta }` (Zod `RangoFechasSchema`).
- `LedgerService.registrarCobroConciliado`: débito `banco`, crédito `akua_clearing`
  (cierra la compensación), kind `cobro_conciliado`, idempotente por pago.

## Repositorio (añadidos)

- `listarCobrosAprobados(tenantId, rango)` → `{ paymentId, providerPaymentId, montoMinor }[]`
  (estado `aprobado`, `created_at` en rango). En ambos adaptadores.

## Sin migración

Usa tablas existentes (`payments`, `ledger_*`). El estado `conciliado` ya es válido.

## Wiring

`PAYMENT_PROVIDER` pasa al módulo global (compartido por `pagos` y `conciliacion`).
`ConciliacionModule` importa `IdentidadModule` y `LedgerModule`.

## Idempotencia

`listarCobrosAprobados` solo trae `aprobado` (los `conciliado` no reingresan) y el
índice único `(tenant, payment, kind)` del ledger blinda el asiento.
