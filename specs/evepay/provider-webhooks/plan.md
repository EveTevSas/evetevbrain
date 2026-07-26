# Plan — Webhooks del proveedor

## Arquitectura

- **Ingreso:** `WebhooksController` (`apps/api/src/modules/webhooks`), `POST /v1/webhooks/akua`.
  Nest se configura con `rawBody: true`; la firma se verifica sobre el **cuerpo crudo**.
- **Verificación de firma:** `AkuaWebhookVerifier.verificar(rawBody, signature)` con
  HMAC-SHA256(`AKUA_WEBHOOK_SECRET`), comparación en tiempo constante. Detrás de una
  interfaz `WebhookVerifier` (fake en tests). Firma inválida → 401.
- **Normalización + aplicación:** `WebhooksService`:
  1. Parsear evento `{ id, type, data.payment_id }`.
  2. `registrarEventoIdempotente(eventId)` → si ya existe, terminar (2xx).
  3. Mapear `type` → estado destino; si no soportado, terminar (2xx).
  4. `resolverPagoPorProvider(providerPaymentId)` → tenant + estado actual; si no
     existe, terminar (2xx).
  5. Si la transición es válida (`payment-state.ts`), `aplicarTransicion` (update +
     auditoría) acotada al tenant.

## Persistencia (migración 0002)

- `evepay.webhook_events`: `event_id` (unique), `tenant_id`, `provider`, `type`, `at`.
  RLS por tenant. La unicidad de `event_id` da la idempotencia.
- `evepay.tenant_of_payment(p_provider_payment_id text)`: función **SECURITY DEFINER**
  que devuelve `(payment_id, tenant_id, status)` del cobro, para que el webhook
  (operación de sistema, sin tenant del llamante) resuelva el pago sin violar RLS.
  `grant execute` a `evepay_api`.

## Repositorio (puerto compartido)

Se añade al `PagosRepository` (ahora provisto en un módulo global para compartir la
misma instancia entre `pagos` y `webhooks`):

- `resolverPagoPorProvider(providerPaymentId)` → `{ paymentId, tenantId, estado } | null`
- `registrarEventoIdempotente(args)` → `true` si es nuevo, `false` si ya visto
- `aplicarTransicion({ tenantId, paymentId, desde, hacia, actor })`

## Restricciones

- El webhook no confía en headers de tenant; solo en la firma.
- La resolución cross-tenant es la única operación privilegiada (función definer);
  la escritura va acotada por `SET LOCAL app.tenant_id`.
- Nombres de header/campos de Akua: placeholder hasta el sandbox (`ak_test_`).
