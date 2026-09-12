# Plan — Reembolsos, contracargos y antifraude de tarjeta

## Contrato (`@evetev/shared`)

- `EstadoCobroSchema` suma `reembolsado`. `CapacidadesProvider.reembolsos`.
  `PaymentProvider.reembolsar?(providerPaymentId, montoMinor)`.
- `repartirReembolso(R, desglose)` en `reembolsos.ts`: partes del comercio,
  comisión e IVA, proporcionales sobre M, mitad arriba, la del comercio absorbe
  el resto. Misma fórmula que `evepay.repartir_reembolso` (test de igualdad).
- `SenalesTarjeta` (`paisTarjeta`, `paisIp`, `intentos`, `scoreProveedor`,
  `tarjetaConContracargo`) dentro de `SenalesRiesgo.tarjeta` y tipos de regla
  `geo_mismatch`, `intentos_tarjeta`, `score_proveedor` en `riesgo.ts`.

## Persistencia (migración 0021)

- `evepay.reembolsos`, `evepay.contracargos` (con trigger de solo-avanza),
  `payments.status` admite `reembolsado`.
- `evepay.admin_registrar_reembolso(payment, monto, motivo, referencia,
fecha, actor, rol)`: valida, inserta, asienta `cobro_reembolsado` (crédito a
  `recaudo` si el cobro está conciliado, a `clearing:<prov>` si aprobado),
  transición a `reembolsado` si completa, `payment_audit`, `audit`.
- `admin_registrar_contracargo`, `admin_contracargo_evidencia`,
  `admin_resolver_contracargo(ganado|perdido)`; perdido llama al mismo reparto
  que el reembolso total por lo que quede.
- Deuda: `admin_balance_comercio.por_pagar` ya puede quedar negativo. En
  `admin_preparar_lote`, si `merchant_payable` del comercio es negativo
  (deuda D), el lote transfiere `max(0, Σ cobros − reserva + liberadas − D)` y
  guarda `deuda_minor`; el asiento del pago: los cobros se asientan igual
  (débito `merchant_payable` por cada `alComercio`) y el crédito a `recaudo` se
  reduce en D — la deuda se salda porque `merchant_payable` vuelve a cero con
  esos débitos. Un item `deuda` deja el rastro.
- `admin_listar_reembolsos(payment?)`, `admin_listar_contracargos(estado?)`.

## Núcleo y API

- `ReembolsosAdminService` sobre las funciones; endpoints
  `POST /v1/admin/pagos/:id/reembolsos` (finanzas), `GET`,
  `POST /v1/admin/pagos/:id/contracargos` (ops), `POST .../evidencia`,
  `POST .../resolver` (finanzas), `GET /v1/admin/contracargos`.
- `WebhooksService`: al aprobar, `RiesgoService.evaluarPostEvento(tenant,
payment, monto, senalesTarjeta)` → retener si dispara. Los proveedores
  normalizan señales cuando las tienen (fake: las acepta en el payload).
- Permisos: `reembolsos.registrar` (finanzas), `contracargos.gestionar`
  (ops y finanzas), `contracargos.resolver` (finanzas).

## Decisiones

- **Asistido primero**, igual que dispersión y consignación: el riel de
  reembolso por API es un `if (provider.capacidades.reembolsos)` futuro.
- **La deuda vive en el ledger** (payable negativo), no en una tabla aparte:
  una sola verdad, y el balance ya la muestra.
- **Riesgo de tarjeta post-evento**: no se puede rechazar lo que ya se
  autorizó en el checkout del proveedor; se retiene la salida del dinero.
