# Ledger inmutable (asientos de doble partida)

> Fase 3 del [plan de EvePay](../../../docs/PLAN_DESARROLLO_EVEPAY.md). Cimiento
> no-reescribible (§1, §2): la verdad contable de cada peso.

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
- **Saldo** de una cuenta = `Σ créditos − Σ débitos` de sus líneas (reconstruido).
- Todo acotado por tenant (RLS, §4).

## No-objetivos

- Reversos por refund/disputa (Fase 6) y conciliación contra settlements (Fase 4).
- Estado de cuenta por unidad del conjunto (eso es de la vertical).

## Casos borde

- Asiento cuyas líneas no cuadran → error, nada se persiste.
- Asiento repetido para el mismo `payment_id + kind` → no se duplica.
- Cobro sin monto o inexistente → no se asienta.

## Criterios de aceptación (EARS)

1. **CUANDO** se asienta un `cobro_aprobado` de monto M, **EL** sistema **DEBERÁ** crear un asiento con `débito akua_clearing = M` y `crédito merchant_payable:<merchant> = M`.
2. **CUANDO** un asiento tiene `Σ débitos ≠ Σ créditos`, **EL** sistema **DEBERÁ** rechazarlo sin persistir ninguna línea.
3. **CUANDO** se consulta el saldo de una cuenta, **EL** sistema **DEBERÁ** calcularlo sumando sus líneas (`créditos − débitos`), no leer un campo almacenado.
4. **CUANDO** se intenta asentar dos veces el mismo `payment_id + kind`, **EL** sistema **DEBERÁ** asentarlo una sola vez (idempotente).
5. **CUANDO** un cobro pasa a `aprobado` (vía webhook), **EL** sistema **DEBERÁ** asentar automáticamente su `cobro_aprobado` balanceado.

## Restricciones de la constitución

- §2/§4: ledger inmutable; montos en centavos; auditable.
- Saldo reconstruible (no `saldo` mutable).
- Aislamiento por tenant (RLS).
