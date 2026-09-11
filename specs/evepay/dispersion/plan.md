# Plan — Dispersión

## Contrato (`@evetev/shared`)

- `cuentas.ts` suma `retenido: (merchantId) => "retenido:<merchantId>"` (pasivo,
  ya reservado en `ledger-custodia`).
- `PoliticaDispersionSchema` (`diasLiquidacion 0–30`, `reservaBps 0–5000`,
  `diasReserva 0–365`, `retenerPrimerCobro`), `EstadoLoteSchema`.
- `repartirReserva(montos[], reservaTotal)` en `dispersion.ts`: reparto
  proporcional en enteros, mitad arriba, el último absorbe el resto. Un solo
  cálculo para la API (asientos) y la consola (vista del lote).

## Persistencia (migración 0017)

- `evepay.politica_dispersion` (`tenant_id` pk, campos de la política,
  `actualizada_por/en`). RLS por tenant; escritura por
  `admin_guardar_politica_dispersion` (audita antes/después).
- `evepay.retenciones`: `id`, `tenant_id`, `tipo ('primer_cobro'|'reserva')`,
  `payment_id` (primer cobro), `lote_id` (reserva), `monto_minor > 0`,
  `liberar_desde date`, `motivo`, `creada_por/en`, `liberada_por/en`,
  `liberacion_motivo`, `pagada_en_lote uuid`. Solo cambia de `activa` a
  `liberada` y a `pagada` (trigger que solo permite esos UPDATE).
- `evepay.lotes_dispersion`: `id`, `tenant_id`, `estado`, `monto_minor` (lo
  que se transfiere), `reserva_minor`, cuenta destino (`banco`, `tipo_cuenta`,
  `numero_cuenta`, `titular_cuenta`, `titular_documento`), `preparado_por/en`,
  `aprobado_por/en`, `pagado_en`, `fecha_pago`, `referencia_pago`,
  `comprobante`, `fallido_en`, `fallo_motivo`. Índice único parcial: un lote
  `programado|aprobado` por tenant. Trigger: `pagado`/`fallido` inmutables;
  `check (aprobado_por is null or aprobado_por <> preparado_por)`.
- `evepay.lote_items`: `lote_id`, `tipo ('cobro'|'reserva_liberada')`,
  `payment_id`, `retencion_id`, `monto_minor` (alComercio o la reserva),
  `reserva_minor` (parte de reserva del cobro). Inmutable.
- Funciones SECURITY DEFINER: `admin_balance_dispersion(tenant)`,
  `admin_balances_dispersion()`, `admin_preparar_lote(tenant, actor)`,
  `admin_aprobar_lote(lote, actor)`, `admin_registrar_pago_lote(lote, fecha,
referencia, comprobante, actor)`, `admin_marcar_lote_fallido(lote, motivo,
actor)`, `admin_liberar_retencion(id, motivo, actor, es_super_admin)`,
  `admin_listar_lotes(estado, limite)`, `admin_lote(id)` (con items),
  `admin_listar_retenciones(tenant)`. `alComercio` de un cobro se calcula en
  SQL con `calcular_tarifa` (ya igual a TypeScript) y sus tarifas fijadas.
- `admin_balance_comercio` suma `retenido` y `dispersado`.

## API

- `DispersionAdminService` sobre las funciones (mismo patrón que
  `CustodiaAdminService`, errores de la base → HTTP).
- Endpoints admin: `GET dispersion/balances`, `GET/PUT
merchants/:id/dispersion` (política), `GET dispersion/lotes`, `GET
dispersion/lotes/:id`, `POST dispersion/lotes` (`ops`), `POST
dispersion/lotes/:id/aprobar` (`finanzas`), `POST dispersion/lotes/:id/pagar`
  (`finanzas`), `POST dispersion/lotes/:id/fallar` (`finanzas`), `GET
dispersion/retenciones`, `POST dispersion/retenciones/:id/liberar`.
- Roles por endpoint según `rbac-operativo`.

## Consola

- Sección **Dispersión**: tabla de balances por comercio (disponible,
  pendiente, retenido, en lote, cuenta certificada sí/no) con «Preparar lote»;
  lotes abiertos con «Aprobar» / «Registrar pago» / «Marcar fallido» según rol;
  histórico de lotes; retenciones activas con «Liberar».
- Ficha del comercio: bloque **Dispersión** con la política (editable) y el
  balance de dispersión.

## Riesgos

- Pagar desde el portal del banco y registrar mal el monto: la consola muestra
  el monto exacto a transferir y la cuenta; el registro no permite editar el
  monto (es el del lote), solo referencia, fecha y comprobante.
- Comercio con perfil sin certificación bancaria: no se puede dispersar; la
  tabla lo dice en rojo.
