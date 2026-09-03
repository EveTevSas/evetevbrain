# Onboarding de comercios (merchants)

> Fase 5 del [plan de EvePay](../../../docs/PLAN_DESARROLLO_EVEPAY.md).

## Problema

Para cobrar, un comercio debe estar dado de alta en EvePay **y** en la
adquirencia. EvePay crea el comercio, lo registra en el proveedor cuando este
lo permite, y sigue su estado de aprobación.

**Revisado el 2-sep-2026 por el cambio a ComboPay.** La versión anterior daba
por hecho el modelo de Akua: alta por API y aprobación por webhook. Con un
proveedor **agregador** —EvePay cobra con la cuenta de Evetev— no hay ninguna
de las dos cosas: el alta se hace a mano en su panel y nadie avisa. Sin una
salida manual, el comercio se quedaba `en_revision` para siempre.

## Usuarios / actores

- **Operación de Evetev** que da de alta el comercio y decide su aprobación
  cuando el proveedor no la comunica.
- **El proveedor**, que aprueba tras KYC/KYB y lo comunica por webhook — solo
  si sus `capacidades.altaDeComercios` es `true` (Akua sí; ComboPay no).

## Resultado esperado

`POST /v1/merchants` crea el comercio y lo deja `en_revision`. Si el proveedor
da de alta por API, se registra allá y se guarda su `provider_merchant_id`; si
no, se devuelve el paso manual pendiente y ese campo queda nulo.

De `en_revision` a `aprobado` se llega por webhook del proveedor, o a mano
desde la consola. **Un comercio solo cobra si está `aprobado`.**

## Requisitos funcionales

- `POST /v1/merchants { legalName }` (Zod), acotado al tenant (RBAC).
- Estados KYC/KYB: `pendiente → en_revision → aprobado | rechazado`.
- Al crear: se consulta `capacidades.altaDeComercios`. Si es `true`, se llama
  `PaymentProvider.crearMerchant` y se guarda `provider_merchant_id`. Si es
  `false`, el comercio se crea igual en EvePay y se devuelve el paso manual.
- Webhook `merchant.approved`: ubica el comercio por `provider_merchant_id`
  (operación de sistema, función `SECURITY DEFINER`) y lo pasa a `aprobado`.
- `POST /v1/admin/merchants/:tenantId/kyc` (super_admin, auditado): aprueba o
  rechaza a mano. Es el único camino con un proveedor agregador.
- **Crear un cobro exige que el comercio esté `aprobado`**; en cualquier otro
  estado se rechaza con 409 antes de llamar al proveedor.
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
5. **CUANDO** el proveedor activo no da de alta comercios por API, **EL** sistema **DEBERÁ** crear el comercio en EvePay igualmente y devolver el paso manual pendiente, sin llamar al proveedor.
6. **CUANDO** un `super_admin` aprueba o rechaza el KYC, **EL** sistema **DEBERÁ** aplicar el estado y auditar quién, desde qué estado y hacia cuál.
7. **CUANDO** se intenta crear un cobro para un comercio que no está `aprobado`, **EL** sistema **DEBERÁ** rechazarlo con 409 sin llamar al proveedor ni dejar rastro de cobro.
8. **CUANDO** el `merchantId` del cobro no pertenece al tenant que llama, **EL** sistema **DEBERÁ** rechazarlo con 409.

## Restricciones de la constitución

- §4: RLS por tenant; RBAC por endpoint; secretos fuera del repo.
- §7: el alta en la adquirencia va solo por la interfaz `PaymentProvider`.

## Por qué el rechazo es reversible

Un `super_admin` puede mover el estado en cualquier dirección, incluso deshacer
un rechazo. Que rechazar fuera definitivo convertiría un clic equivocado en
tener que recrear el comercio, perdiendo su historial y sus claves. Lo que
protege aquí no es la irreversibilidad, es la auditoría.
