# Webhooks del proveedor (normalizados)

> Fase 2 del [plan de EvePay](../../../docs/PLAN_DESARROLLO_EVEPAY.md). Cimiento
> no-reescribible (§1, §4): auditoría; y el estado del cobro lo mueve la realidad,
> no un polling frágil.

## Problema

Cuando EvePay crea un cobro queda en `pendiente`. La confirmación (aprobado/fallido)
llega **por webhook** desde Akua. EvePay debe recibir ese evento, **verificar su
firma** (nadie puede falsificar una aprobación), procesarlo de forma **idempotente**
(Akua reintenta; un evento repetido no puede aplicar el efecto dos veces) y
**normalizarlo** a nuestra máquina de estados.

## Usuarios / actores

- **Akua** (proveedor) que emite eventos firmados.
- **Sistema EvePay** que los ingesta, verifica y aplica.

## Resultado esperado

`POST /v1/webhooks/akua` recibe el evento, valida la firma con el secreto del
proveedor, y —si es la primera vez que se ve ese evento— aplica la transición de
estado correspondiente al cobro, dejándola auditada. Responde 2xx para que Akua no
reintente; ante firma inválida responde 401.

## Requisitos funcionales

- Endpoint `POST /v1/webhooks/akua`. **No** lleva contexto de tenant del llamante
  (Akua no es un tenant): la autenticidad la da la **firma**, no el RBAC de tenant.
- Verificación de firma **HMAC-SHA256** del cuerpo crudo con `AKUA_WEBHOOK_SECRET`,
  comparación en tiempo constante. (El header/scheme exacto se fija con el sandbox.)
- Idempotencia por `event_id`: registrar cada evento; uno repetido no re-aplica.
- Normalización de tipos → transición. Los nombres son los **reales de Akua**,
  fijados al integrar el proveedor; este documento los daba genéricos
  (`payment.succeeded`) mientras se especificaba a ciegas, y esa diferencia dejó
  cuatro tests en rojo un mes sin que nadie lo viera:
  - `payment.purchase.succeeded` → `pendiente → aprobado`
  - `payment.purchase.failed`, `payment.purchase.rejected` → `pendiente → fallido`
  - `payment.purchase.pending`, `payment.refunded`, `dispute.created`, otros → se
    **reconocen** (2xx) pero no se procesan en esta fase (quedan para Fase 6).
- El cobro se ubica por `provider_payment_id`, que el evento trae en
  `data.payment.link.id` —el link de pago que se guardó al crear el cobro— y, si
  no hay link, en `data.payment.id`. Como el evento no trae
  tenant, la resolución del tenant del pago es una operación **de sistema** (función
  `SECURITY DEFINER`), y la actualización se hace ya acotada a ese tenant (RLS).
- Cada transición aplicada queda **auditada** (actor `webhook:akua`).

## No-objetivos

- Refunds/disputas (Fase 6). Conciliación (Fase 4).
- Reintentos/entrega saliente (eso es de Akua).

## Casos borde

- Firma inválida o ausente → 401, sin efecto.
- Evento ya visto (mismo `event_id`) → 2xx, sin re-aplicar (idempotente).
- Evento para un `provider_payment_id` inexistente → 2xx, registrado y sin efecto
  (no reventar; puede ser ruido).
- Transición inválida (p. ej. `purchase.succeeded` sobre un cobro ya `fallido`) → no se aplica;
  se registra.
- Tipo de evento desconocido → 2xx, ignorado.

## Criterios de aceptación (EARS)

1. **CUANDO** llega un `payment.purchase.succeeded` con firma válida para un cobro `pendiente` no visto antes, **EL** sistema **DEBERÁ** pasar el cobro a `aprobado`, auditar la transición y responder 2xx.
2. **CUANDO** llega un evento cuya firma no valida, **EL** sistema **DEBERÁ** responder 401 y no modificar ningún cobro.
3. **CUANDO** llega un evento con un `event_id` ya procesado, **EL** sistema **DEBERÁ** responder 2xx sin volver a aplicar el efecto.
4. **CUANDO** llega un `payment.purchase.failed` o `payment.purchase.rejected` con firma válida para un cobro `pendiente`, **EL** sistema **DEBERÁ** pasarlo a `fallido` y auditarlo.
5. **CUANDO** el evento referencia un `provider_payment_id` inexistente, **EL** sistema **DEBERÁ** responder 2xx sin error y sin cambiar ningún cobro.
6. **CUANDO** el tipo de evento no está soportado en esta fase, **EL** sistema **DEBERÁ** responder 2xx e ignorarlo (sin transición).

## Restricciones de la constitución

- §4: auditoría inmutable; firma obligatoria; secretos (`AKUA_WEBHOOK_SECRET`) fuera del repo.
- §4/§7: solo la capa de proveedor conoce el formato de Akua; el dominio recibe eventos normalizados.
- Idempotencia como en pagos: reintentos no duplican efecto.
