# Plan — Onboarding de comercios

## Persistencia (migración 0004)

- `evepay.merchants` (ya existe): + columna `provider_merchant_id text`.
- Estados: `pendiente | en_revision | aprobado | rechazado`.
- Función `SECURITY DEFINER evepay.merchant_by_provider(text)` → `(merchant_id,
tenant_id, status)` para el webhook (resolución cross-tenant). Grant a `evepay_api`.

## Contrato (shared)

- `CrearMerchantInputSchema { legalName }`; `EstadoMerchant`; `ProviderMerchant
{ providerMerchantId, estado }`; `PaymentProvider.crearMerchant`.

## Repositorio (MerchantsRepository, global)

- `crearMerchant`, `buscarMerchant(tenantId, id)`,
  `resolverMerchantPorProvider(providerMerchantId)` (definer),
  `aplicarEstadoMerchant({tenantId, merchantId, estado})`.

## Servicio / endpoint

- `MerchantsService.registrar(tenantId, input)`: crea local (`pendiente`) →
  `provider.crearMerchant` → guarda `provider_merchant_id` y `en_revision`.
- `MerchantsService.aprobarPorProvider(providerMerchantId)`: resuelve y pasa a `aprobado`.
- `POST /v1/merchants` (Zod + RBAC + tenant).

## Webhook

`WebhooksService` maneja `merchant.approved` (además de `payment.*`): resuelve el
comercio por `provider_merchant_id` y llama `aprobarPorProvider`.
