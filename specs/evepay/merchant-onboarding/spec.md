# Onboarding de comercios (merchants)

> Fase 5 del [plan de EvePay](../../../docs/PLAN_DESARROLLO_EVEPAY.md).

## Problema

Para cobrar, un comercio debe estar dado de alta en EvePay y en la adquirencia
(Akua), con su KYC/KYB. EvePay crea el comercio, lo registra en el proveedor y sigue
su estado de aprobación (que llega por webhook `merchant.approved`).

## Usuarios / actores

- **Comercio / operación** que da de alta un comercio.
- **Akua** que aprueba tras KYC/KYB (evento `merchant.approved`).

## Resultado esperado

`POST /v1/merchants` crea el comercio en estado `pendiente`, lo registra en el
proveedor (guardando `provider_merchant_id`) y queda `en_revision`. Cuando Akua
aprueba, el webhook lo pasa a `aprobado`.

## Requisitos funcionales

- `POST /v1/merchants { legalName }` (Zod), acotado al tenant (RBAC).
- Estados KYC/KYB: `pendiente → en_revision → aprobado | rechazado`.
- Al crear: se llama `PaymentProvider.crearMerchant`; se guarda `provider_merchant_id`
  y el estado resultante (`en_revision`).
- Webhook `merchant.approved`: ubica el comercio por `provider_merchant_id`
  (operación de sistema, función `SECURITY DEFINER`) y lo pasa a `aprobado`.
- Todo acotado por tenant (RLS, §4). El comercio es el tenant de EvePay.

## No-objetivos

- Captura de documentos KYC/KYB (la hace Akua). Split payments / payouts.

## Casos borde

- `merchant.approved` de un `provider_merchant_id` desconocido → 2xx, sin efecto.
- Transición inválida (aprobar uno ya `rechazado`) → no se aplica.

## Criterios de aceptación (EARS)

1. **CUANDO** se crea un comercio con `legalName` válido, **EL** sistema **DEBERÁ** persistirlo con `provider_merchant_id` y estado `en_revision`, acotado a su tenant.
2. **CUANDO** el body es inválido (sin `legalName`), **EL** sistema **DEBERÁ** responder 400 sin crear nada.
3. **CUANDO** llega `merchant.approved` (firma válida) para un comercio `en_revision`, **EL** sistema **DEBERÁ** pasarlo a `aprobado`.
4. **CUANDO** `merchant.approved` referencia un `provider_merchant_id` inexistente, **EL** sistema **DEBERÁ** responder 2xx sin cambiar nada.

## Restricciones de la constitución

- §4: RLS por tenant; RBAC por endpoint; secretos fuera del repo.
- §7: el alta en la adquirencia va solo por la interfaz `PaymentProvider` (Akua detrás).
