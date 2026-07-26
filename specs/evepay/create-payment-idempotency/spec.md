# Crear cobro idempotente

> Fase 1 del [plan de EvePay](../../../docs/PLAN_DESARROLLO_EVEPAY.md). Cimiento
> no-reescribible (§1): idempotencia y auditoría de pagos.

## Problema

EvePay debe poder **crear un cobro** a nombre de un comercio y devolver una URL de
checkout, apoyándose en Akua como adquirente. El riesgo central: un reintento
(timeout de red, doble clic, reintento de workflow) **no puede cobrar dos veces**.
La idempotencia no es una optimización: es lo que hace confiable a la plataforma.

## Usuarios / actores

- **Comercio** (tenant de EvePay) que solicita el cobro — hoy, vía la vertical
  Eve-Habitat consumiendo la API por HTTP (dogfooding).
- **Sistema EvePay** que orquesta el cobro y lleva el estado.
- **Akua** (a través de `PaymentProvider`) que procesa el pago real.

## Resultado esperado

El comercio envía monto + referencia + `Idempotency-Key` y recibe un cobro con su
`id`, `estado` y `url_checkout`. Reintentar con la misma clave devuelve **el mismo
cobro**, sin crear otro ni llamar de nuevo a Akua.

## Requisitos funcionales

- `POST /v1/pagos` recibe `{ merchantId, montoMinor, moneda, referencia, descripcion? }`
  y el header `Idempotency-Key` (obligatorio).
- El body se valida con Zod en la frontera (`CrearCobroInputSchema`, `@evetev/shared`).
- Montos en **enteros/centavos** (`montoMinor`), nunca `float`.
- El cobro se persiste en el schema `evepay` con `tenant_id` (RLS) y su máquina de
  estados: `creado → pendiente → aprobado | fallido → conciliado`.
- La creación delega en `PaymentProvider.crearCobro(input, idempotencyKey)`; la
  clave se reenvía a Akua como `Idempotency-Key`.
- Cada transición de estado queda **auditada** (timestamp, actor, datos), inmutable.
- Nunca se recibe, guarda ni registra el PAN (usamos checkout/token de Akua).

## No-objetivos

- Confirmación del pago (llega por webhook `payment.succeeded` → ver
  `specs/evepay/provider-webhooks`).
- Asientos de ledger detallados (→ `specs/evepay/ledger-posting`).
- Refunds, disputas, split payments.

## Casos borde

- Reintento con la **misma** `Idempotency-Key` y **mismo** body → devuelve el cobro existente.
- Misma `Idempotency-Key` con body **distinto** → error `409` (conflicto), no crea nada.
- Falta el header `Idempotency-Key` → `400`.
- Body inválido (monto ≤ 0, moneda no soportada) → `400` con detalle Zod.
- Akua responde error/timeout → el cobro queda `fallido` o reintenta vía Inngest, sin duplicar.
- Dos requests concurrentes con la misma clave → solo uno crea; el otro obtiene el mismo resultado (unicidad a nivel DB).

## Criterios de aceptación (EARS)

1. **CUANDO** se recibe `POST /v1/pagos` con una `Idempotency-Key` nunca vista y un body válido, **EL** sistema **DEBERÁ** crear un cobro en estado `pendiente`, llamar a `PaymentProvider.crearCobro` una sola vez y devolver `{ id, estado, url_checkout }`.
2. **CUANDO** se recibe una solicitud con una `Idempotency-Key` ya vista y el **mismo** body, **EL** sistema **DEBERÁ** devolver el cobro existente sin crear uno nuevo ni volver a llamar a Akua.
3. **CUANDO** se recibe una `Idempotency-Key` ya vista con un body **distinto**, **EL** sistema **DEBERÁ** rechazar la operación con `409` y no modificar ningún cobro.
4. **CUANDO** la solicitud llega **sin** header `Idempotency-Key`, **EL** sistema **DEBERÁ** responder `400` sin crear cobro.
5. **CUANDO** el body no pasa la validación Zod, **EL** sistema **DEBERÁ** responder `400` con el detalle del error y no crear cobro.
6. **CUANDO** una transición de estado ocurre, **EL** sistema **DEBERÁ** registrar un asiento de auditoría inmutable (timestamp, actor, estado previo y nuevo).
7. **CUANDO** dos solicitudes con la misma `Idempotency-Key` llegan de forma concurrente, **EL** sistema **DEBERÁ** crear a lo sumo un cobro.

## Restricciones de la constitución

- Cimientos tocados: **idempotencia/auditoría** (§4) y **multi-tenancy** (§4, RLS por `tenant_id`).
- Pagos **solo** por la interfaz `PaymentProvider` (§4/§7); el núcleo no importa el SDK de Akua.
- Fuera de PCI: sin PAN en servidor ni logs (§4).
- Montos en enteros/centavos; sin `any` injustificado; validación Zod en frontera (§3).
