# Conciliación (settlement)

> Fase 4 del [plan de EvePay](../../../docs/PLAN_DESARROLLO_EVEPAY.md). Cimiento
> no-reescribible (§1): lo cobrado cuadra con lo registrado.

## Problema

EvePay aprobó cobros; Akua los **liquida** (settlement) y deposita. La conciliación
verifica que **lo cobrado cuadra con lo liquidado**: cruza los cobros `aprobado` con
las liquidaciones del proveedor en un rango, marca los que cuadran como `conciliado`
(asentándolo en el ledger) y **reporta las diferencias y huérfanos**.

## Usuarios / actores

- **Sistema EvePay** (job periódico) o **operación** que dispara la conciliación.

## Resultado esperado

Para un rango de fechas: cada cobro `aprobado` que tiene una liquidación con el mismo
monto pasa a `conciliado` y se asienta el movimiento de liquidación (cierra la cuenta
de compensación). Se reporta: conciliados, diferencias (monto distinto), huérfanos del
proveedor (liquidación sin cobro local) y no-conciliados (cobro sin liquidación aún).

## Requisitos funcionales

- `POST /v1/conciliacion/run` con `{ desde, hasta }` (Zod), acotado al tenant (RBAC).
- Fuente local: cobros en estado `aprobado` creados en el rango.
- Fuente del proveedor: `PaymentProvider.listarLiquidaciones(rango)`.
- Cruce por `provider_payment_id`:
  - cuadra (mismo monto) → transición `aprobado → conciliado` (auditada) + asiento
    `cobro_conciliado` (débito `banco`, crédito `akua_clearing`).
  - monto distinto → **diferencia** (no se concilia).
  - liquidación sin cobro local → **huérfano del proveedor**.
  - cobro `aprobado` sin liquidación → **no conciliado** (sigue pendiente).
- **Idempotente:** repetir la conciliación no re-concilia (los ya `conciliado` no
  vuelven a entrar) ni duplica asientos (único por `payment_id + kind`).
- Todo acotado por tenant (RLS, §4).

## No-objetivos

- Reversos por refund/disputa (Fase 6). Payouts a beneficiarios.

## Casos borde

- Cobro y liquidación con distinto monto → diferencia, sin transición.
- Liquidación de un pago que no conocemos → huérfano, sin efecto.
- Correr dos veces el mismo rango → mismos números, sin dobles asientos.

## Criterios de aceptación (EARS)

1. **CUANDO** un cobro `aprobado` cuadra con una liquidación del mismo monto, **EL** sistema **DEBERÁ** pasarlo a `conciliado`, asentar `cobro_conciliado` balanceado y contarlo en `conciliados`.
2. **CUANDO** una liquidación tiene un monto distinto al del cobro, **EL** sistema **DEBERÁ** reportarlo en `diferencias` y no conciliar el cobro.
3. **CUANDO** una liquidación no corresponde a ningún cobro local, **EL** sistema **DEBERÁ** contarla en `huerfanosProveedor` sin efecto.
4. **CUANDO** un cobro `aprobado` no tiene liquidación en el rango, **EL** sistema **DEBERÁ** contarlo en `noConciliados` y dejarlo `aprobado`.
5. **CUANDO** se corre la conciliación dos veces sobre el mismo rango, **EL** sistema **DEBERÁ** dar el mismo resultado sin re-conciliar ni duplicar asientos.

## Restricciones de la constitución

- §1: lo cobrado cuadra con lo registrado (conciliación desde el MVP).
- §2/§4: asientos en el ledger inmutable; aislamiento por tenant; montos en centavos.
- §7: las liquidaciones se obtienen solo por la interfaz `PaymentProvider` (Akua detrás).
