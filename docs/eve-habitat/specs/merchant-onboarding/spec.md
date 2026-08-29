# Onboarding de comercios

## Objetivo

Crear y activar comercios EvePay sin mezclar credenciales o configuración entre tenants.

## Requisitos EARS

1. **MERCHANT-001** — CUANDO se crea un comercio mock, EL SISTEMA DEBERÁ activarlo para pruebas locales.
2. **MERCHANT-002** — CUANDO se crea un comercio Wompi o Akua sin completar certificación, EL SISTEMA DEBERÁ conservarlo pendiente.

## Invariantes

- Un comercio pertenece a un solo tenant.
- Un pago solo usa un comercio activo del mismo tenant.
- Las credenciales nunca forman parte de la respuesta.

## Evidencia de aceptación

- `MerchantsService` y endpoints `/v1/merchants`.
- Validación del comercio en `PaymentsService`.
- Tabla `evepay.merchants` con RLS.
