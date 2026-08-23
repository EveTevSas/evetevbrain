# Tareas — Webhooks del proveedor

- [ ] **T1 — Migración 0002.** `evepay.webhook_events` (unique `event_id`, RLS) +
      función `SECURITY DEFINER` `evepay.tenant_of_payment(text)`; grant a `evepay_api`.
- [ ] **T2 — Repo compartido.** Mover `PAGOS_REPOSITORY` a un módulo global; añadir
      `resolverPagoPorProvider`, `registrarEventoIdempotente`, `aplicarTransicion` en el
      puerto y en ambos adaptadores (in-memory y Drizzle).
- [ ] **T3 — Verificador de firma.** `WebhookVerifier` + `AkuaWebhookVerifier`
      (HMAC-SHA256, timing-safe) + fake para tests.
- [ ] **T4 — Ingreso.** `rawBody: true` en main; `WebhooksController`
      `POST /v1/webhooks/akua` (401 si firma inválida).
- [ ] **T5 — Normalización.** `WebhooksService`: idempotencia por `event_id`, mapeo
      de tipos, resolución del pago, transición válida + auditoría.
- [ ] **T6 — Tests (EARS 1-6).** firma válida→aprobado, firma inválida→401,
      evento repetido→no-op, failed→fallido, pago inexistente→2xx, tipo desconocido→2xx.
- [ ] **T7 — Validar** typecheck·lint·test·build. Opcional: aplicar 0002 y probar
      contra Supabase (simular webhook → cobro pasa a aprobado).

## Definition of Done (además de §6)

- [ ] Los 6 criterios EARS con test y en verde.
- [ ] Firma verificada; `AKUA_WEBHOOK_SECRET` fuera del repo.
- [ ] Idempotencia por `event_id`; transiciones auditadas.
