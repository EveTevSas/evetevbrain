# Ledger inmutable (asientos de doble partida)

> Fase 3 del [plan de EvePay](../../../docs/PLAN_DESARROLLO_EVEPAY.md). Cimiento
> no-reescribible (§1, §2): la verdad contable de cada peso.
>
> **Actualizada por [`ledger-custodia`](../ledger-custodia/) (Fase 6):** el
> asiento del cobro aprobado ya no va entero al comercio, se divide entre
> comercio, comisión, IVA y costo del proveedor; la compensación se llama
> `clearing:<proveedor>` (no `akua_clearing`); y el saldo se lee con el signo
> de la naturaleza de cada cuenta. Los CA-1 y CA-3 de abajo quedan como
> estaban para el histórico, con su versión vigente al lado.

## Problema

EvePay necesita un **libro de movimientos inmutable**: cada peso que entra o sale
queda registrado como un asiento de **doble partida** (débitos = créditos), sin
edición ni borrado. El **saldo** de cualquier cuenta debe **reconstruirse desde los
movimientos**, nunca ser un campo que alguien actualiza (fuente de disputas).

## Usuarios / actores

- **Sistema EvePay** que asienta automáticamente al cambiar el estado de un cobro.
- **Operación/soporte** que consulta saldos (reconstruidos).

## Resultado esperado

Cuando un cobro pasa a `aprobado`, se asienta un movimiento **balanceado**: el dinero
queda en la cuenta de compensación del proveedor (activo) y se reconoce lo que EvePay
le debe al comercio (pasivo). El asiento es inmutable y el saldo por cuenta se calcula
sumando sus líneas.

## Requisitos funcionales

- Un **asiento** (`ledger_entries`) agrupa **líneas** (`ledger_lines`); cada línea
  es `debit` o `credit` con `amount_minor` (entero, centavos, > 0).
- **Invariante de balance:** en cada asiento, `Σ débitos == Σ créditos`. Un asiento
  desbalanceado se **rechaza** (no se persiste nada).
- **Inmutabilidad:** sin `UPDATE` ni `DELETE` sobre asientos ni líneas (trigger en DB).
- **Idempotencia:** un mismo hecho contable no se asienta dos veces
  (único por `tenant_id + payment_id + kind`).
- Asiento de `cobro_aprobado`: `débito akua_clearing` + `crédito merchant_payable:<merchantId>`, ambos por el monto del cobro.
  **Vigente (Fase 6):** débito `clearing:<proveedor>` por el monto, y créditos a
  `merchant_payable:<merchantId>` (monto − comisión − IVA), `comision:evepay`,
  `iva_por_pagar`, más el costo del proveedor contra `clearing` o `por_pagar`.
  Detalle en `ledger-custodia`. Un cobro sin tarifas (anterior a la Fase 6)
  sigue asentándose entero al comercio.
- **Saldo** de una cuenta = `Σ créditos − Σ débitos` de sus líneas (reconstruido).
  **Vigente (Fase 6):** con el signo de la naturaleza de la cuenta
  (`saldoNatural` de `@evetev/shared`): activos y gastos crecen con débitos,
  pasivos e ingresos con créditos. El plan de cuentas vive en
  `packages/shared/src/cuentas.ts`.
- Todo acotado por tenant (RLS, §4).

## No-objetivos

- Reversos por refund/disputa (Fase 6) y conciliación contra settlements (Fase 4).
- Estado de cuenta por unidad del conjunto (eso es de la vertical).

## Casos borde

- Asiento cuyas líneas no cuadran → error, nada se persiste.
- Asiento repetido para el mismo `payment_id + kind` → no se duplica.
- Cobro sin monto o inexistente → no se asienta.

## Criterios de aceptación (EARS)

1. **CUANDO** se asienta un `cobro_aprobado` de monto M, **EL** sistema **DEBERÁ** crear un asiento con `débito akua_clearing = M` y `crédito merchant_payable:<merchant> = M`. _Vigente desde la Fase 6: el CA-1 de `ledger-custodia` (asiento dividido con `clearing:<proveedor>`)._
2. **CUANDO** un asiento tiene `Σ débitos ≠ Σ créditos`, **EL** sistema **DEBERÁ** rechazarlo sin persistir ninguna línea. _Desde la Fase 6 lo garantiza también la base, con un trigger diferido al confirmar (CA-10 de `ledger-custodia`)._
3. **CUANDO** se consulta el saldo de una cuenta, **EL** sistema **DEBERÁ** calcularlo sumando sus líneas (`créditos − débitos`), no leer un campo almacenado. _Vigente desde la Fase 6: sumando sus líneas con el signo de su naturaleza._
4. **CUANDO** se intenta asentar dos veces el mismo `payment_id + kind`, **EL** sistema **DEBERÁ** asentarlo una sola vez (idempotente).
5. **CUANDO** un cobro pasa a `aprobado` (vía webhook), **EL** sistema **DEBERÁ** asentar automáticamente su `cobro_aprobado` balanceado.

## Restricciones de la constitución

- §2/§4: ledger inmutable; montos en centavos; auditable.
- Saldo reconstruible (no `saldo` mutable).
- Aislamiento por tenant (RLS).
