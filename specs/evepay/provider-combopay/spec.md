# Proveedor de pagos ComboPay (seleccionable por configuración)

## Qué y por qué

EvePay habla con la adquirencia solo a través de la interfaz `PaymentProvider`
(§4). Hoy existen dos implementaciones: `FakePaymentProvider` (local/CI) y
`AkuaPaymentProvider`. La negociación con Akua cambió y el proveedor de pagos
pasa a ser **ComboPay** (combopay.co), así que hace falta una tercera
implementación seleccionable con `PAYMENT_PROVIDER=combopay`, sin tocar el
núcleo: pagos, ledger, conciliación y webhooks siguen sin conocer al proveedor.

La API de ComboPay (Recaudos beta) difiere de Akua en cuatro cosas que definen
el diseño:

1. **Auth**: Bearer token estático emitido en su dashboard (no OAuth2).
2. **Modelo**: cada token pertenece a UN comercio de ComboPay. EvePay opera como
   agregador con la cuenta ComboPay de Evetev; los merchants de EvePay **no** se
   replican en ComboPay (no existe alta de comercios por API).
3. **Idempotencia**: no hay header de idempotencia. El campo `invoice` permite
   número de factura propio: si se reenvía y la factura sigue pendiente, ComboPay
   **actualiza** en vez de duplicar. Se usa la clave de idempotencia de EvePay
   como `invoice`.
4. **Webhooks**: la notificación hook no viene firmada; su doc solo pide
   restringir el origen. La autenticidad se resuelve con un secreto en la ruta
   del endpoint, generado por nosotros.

Referencia de la API usada (doc pública beta, verificada el 2-sep-2026):

- Base: `https://api-gateway.combopay.co` (header `Authorization: Bearer <token>`)
- `POST /api/invoice-company-customer` — crea factura + enlace de pago.
  Campos: `value` (entero COP, valor face), `description`, `invoice` (opcional,
  personalizado), `url_data_return`, `recurrent`, datos del pagador opcionales.
  Respuesta: `id`, `invoice`, `value`, `payment_link` (URL), `status`
  (0 = pendiente, 1 = pagada, 2 = en proceso PSE).
- `GET /api/invoice/{invoice_id}/status` — estado transaccional:
  `transaction_state` ∈ {`payment_approved`, `payment_fail`, `payment_pending`},
  `transaction_value`, `unique_transaction_code` (CUS), `bank_process_date`.
- Hook: POST JSON a la URL configurada con `id` (id de factura),
  `transaction_state` (`payment_approved` | `payment_fail`), `ticket_id`,
  `unique_transaction_code`, `transaction_value`; campos nulos se omiten.
- No hay endpoint de liquidaciones (settlements) en la beta de recaudos.

## Criterios de aceptación (EARS)

- CA-1: CUANDO `PAYMENT_PROVIDER=combopay`, EL sistema DEBERÁ instanciar
  `ComboPayPaymentProvider` con `COMBOPAY_API_TOKEN` y `COMBOPAY_BASE_URL`
  (default producción), sin que ningún otro módulo cambie.
- CA-2: CUANDO se crea un cobro en COP, EL sistema DEBERÁ enviar
  `POST /api/invoice-company-customer` con `value` = `montoMinor`, `invoice` =
  clave de idempotencia y el Bearer token, y DEBERÁ devolver `providerPaymentId`
  = `id` de la factura y `checkoutUrl` = `payment_link`.
- CA-3: CUANDO se crea un cobro en una moneda distinta de COP, EL sistema
  DEBERÁ rechazarlo con un error explícito antes de llamar a ComboPay
  (la beta de recaudos solo transa COP).
- CA-4: CUANDO se consulta el estado de una factura, EL sistema DEBERÁ mapear
  `payment_approved` → `aprobado`, `payment_fail` → `fallido` y cualquier otro
  valor (incluido `payment_pending` o ausencia de transacción) → `pendiente`.
- CA-5: CUANDO llega un hook a `/v1/webhooks/combopay/:secreto` con el secreto
  correcto, EL sistema DEBERÁ normalizarlo al evento interno y aplicar la misma
  máquina de estados, idempotencia por evento y asientos de ledger que un
  webhook de Akua.
- CA-6: CUANDO llega un hook con secreto incorrecto o sin configurar, EL
  sistema DEBERÁ responder 401 sin procesar nada.
- CA-7: CUANDO un hook ya procesado se reenvía (ComboPay permite reenvíos desde
  su dashboard), EL sistema NO DEBERÁ duplicar transiciones ni asientos
  (idempotencia por `ticket_id`/CUS).
- CA-8: CUANDO se piden liquidaciones con ComboPay activo, EL sistema DEBERÁ
  fallar con un error explícito que remita al dashboard de ComboPay — nunca
  devolver una lista vacía que produzca un reporte de conciliación falso.
- CA-9: CUANDO se intenta dar de alta un comercio en la adquirencia con
  ComboPay activo, EL sistema DEBERÁ fallar con un error explícito (el alta en
  ComboPay es manual, en su dashboard).

## Fuera de alcance

- Retiros/cashout (API `withdrawals` de ComboPay).
- Marca blanca (typePaymentMethod, bankCode, voucher propio): se usa el checkout
  hosteado de ComboPay, igual que con Akua nunca tocamos el PAN (§4).
- Conciliación automática contra ComboPay: queda manual hasta que expongan
  settlements por API (o se implemente sobre su búsqueda de facturas).
- Pagos recurrentes (`recurrent=1`).
