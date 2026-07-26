# Plan — Crear cobro idempotente

## Arquitectura

- **Frontera:** `PagosController` (`apps/api/src/modules/pagos`), `POST /v1/pagos`.
  Valida con `CrearCobroInputSchema` (Zod, `@evetev/shared`). Header `Idempotency-Key`
  obligatorio.
- **Caso de uso:** `PagosService.crearCobro(input, idempotencyKey)`:
  1. Buscar cobro por `(tenant_id, idempotency_key)`. Si existe con mismo hash de
     input → devolverlo. Si existe con input distinto → `409`.
  2. Si no existe → insertar cobro `pendiente` (transacción; unicidad en DB).
  3. Llamar `PaymentProvider.crearCobro` (fake en local/CI; Akua en real).
  4. Guardar `provider_payment_id` y `url_checkout`; registrar auditoría.
- **Persistencia (Drizzle, schema `evepay`):**
  - `payments`: `id`, `tenant_id`, `merchant_id`, `amount_minor`, `currency`,
    `reference`, `description`, `status`, `provider`, `provider_payment_id`,
    `checkout_url`, `created_at`, `updated_at`.
  - `payment_idempotency`: `tenant_id`, `idempotency_key`, `request_hash`,
    `payment_id` — **UNIQUE(tenant_id, idempotency_key)**.
  - `payment_audit`: append-only, `payment_id`, `from_status`, `to_status`,
    `actor`, `at`, `data`.
- **RLS:** todas con `tenant_id` y política que exige `app.tenant_id` (SET LOCAL).
- **Proveedor:** `PAYMENT_PROVIDER=fake|akua`. `AkuaPaymentProvider` reenvía la
  `Idempotency-Key` a `POST /v1/payments` de Akua.

## Restricciones

- La unicidad `(tenant_id, idempotency_key)` la garantiza la **DB**, no el código,
  para resolver la concurrencia (criterio EARS 7).
- Sin PAN en ninguna capa. `url_checkout` es de Akua.
- La confirmación (aprobado/fallido) NO se maneja aquí — llega por webhook.

## Riesgos / decisiones abiertas

- Contrato exacto de `POST /v1/payments` de Akua → se fija con las sandbox keys.
- ¿`request_hash` sobre qué campos? (excluir `descripcion`?). Decidir en tasks.
