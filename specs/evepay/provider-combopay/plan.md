# Plan — Proveedor ComboPay

## Arquitectura

Todo cabe en el patrón existente; no se toca el contrato de `@evetev/shared`:

- `apps/api/src/modules/pagos/combopay-payment.provider.ts` — implementa
  `PaymentProvider` con `fetch`, espejo de `akua-payment.provider.ts`. Es el
  ÚNICO archivo que conoce la API de ComboPay.
- `apps/api/src/database/repositories.module.ts` — el factory de
  `PAYMENT_PROVIDER` gana el caso `combopay` (lee `COMBOPAY_API_TOKEN`,
  `COMBOPAY_BASE_URL`).
- `apps/api/src/modules/webhooks/` — el evento normalizado (`EventoWebhook`)
  gana el campo `provider` ("akua" | "combopay"); `estadoDestino` mapea también
  los `transaction_state` de ComboPay. El controller expone
  `POST /v1/webhooks/combopay/:secreto` verificando el secreto con comparación
  de tiempo constante contra `COMBOPAY_WEBHOOK_SECRET`.

## Restricciones

- **§4 — el núcleo no conoce al proveedor**: `pagos`, `ledger`, `conciliacion`
  y `merchants` no cambian. Solo cambia la capa de normalización de webhooks y
  el factory de inyección.
- **Idempotencia**: entrante, por evento (`registrarEventoIdempotente` con
  provider `combopay` y `eventId` = `ticket_id` ?? CUS). Saliente, el `invoice`
  personalizado hace que un reintento con la misma clave actualice la factura
  pendiente en vez de duplicarla.
- **Nunca fallar silencioso en dinero**: liquidaciones y alta de comercios
  lanzan error explícito (CA-8, CA-9) en vez de simular éxito.
- **Secretos**: `COMBOPAY_API_TOKEN` y `COMBOPAY_WEBHOOK_SECRET` solo en el
  gestor de la plataforma (Railway) y `.env` local; jamás en el repo.

## Decisiones

- **Secreto en la ruta del webhook** en vez de firma HMAC: ComboPay no firma
  sus hooks. La alternativa (filtrar por IP de origen) es frágil y no
  verificable en código. El secreto va en la URL que se registra en el
  dashboard de ComboPay, se genera con 32 bytes aleatorios y se rota desde ahí.
- **`invoice` = clave de idempotencia** y no la `referencia` del comercio: la
  referencia es del dominio del comercio y podría repetirse entre cobros
  legítimos distintos; la clave de idempotencia es única por intención de cobro,
  que es exactamente la semántica de "actualizar si sigue pendiente".
  TODO(sandbox): confirmar el comportamiento cuando la factura ya está pagada.
- **Solo COP**: la doc de la beta transa PSE/TC/efectivo en Colombia. Rechazar
  USD en la frontera del provider evita un cobro en moneda equivocada que
  ninguna validación posterior atraparía.
- **Un solo comercio ComboPay (agregador)**: los merchants de EvePay viven en
  nuestra base con RLS; el recaudo entra por la cuenta ComboPay de Evetev y el
  ledger reparte. Si ComboPay habilita sub-comercios por API, se revisa.
