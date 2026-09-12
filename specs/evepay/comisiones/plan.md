# Plan — Comisiones

## Cálculo (`@evetev/shared`)

- `packages/shared/src/tarifa.ts`: `calcularTarifa(montoMinor, { bps, fijoMinor })`,
  para la tarifa del comercio y la del proveedor. Por dentro usa `BigInt`
  (monto × bps no siempre cabe exacto en un `number`) y devuelve `number`.
  Redondeo mitad arriba: `(monto × bps + 5 000) / 10 000` truncado, más el fijo.
- `desglosarCobro(monto, tarifaComercio, tarifaProveedor)` →
  `{ alComercio, comision, iva, costoProveedor, margen }`: lo que muestra la vista
  previa y lo que usa el asiento. Mismo patrón que `nit.ts`: una regla de
  dinero, un solo sitio.
- `validarTarifa` y su esquema Zod, compartidos.

## Persistencia (migración 0015)

- `evepay.tarifas_comercio`: `id`, `tenant_id`, `bps int check (bps between 0 and 10000)`,
  `fijo_minor bigint check (fijo_minor >= 0)`, `vigente_desde timestamptz default now()`,
  `iva_bps int not null check (iva_bps in (0, 1900))`, `creada_por`, `creada_en`.
  Inmutable (`audit_is_immutable()`), RLS por tenant.
- `evepay.tarifas_proveedor`: `id`, `provider`, `bps`, `fijo_minor`,
  `descuenta_en_consignacion boolean not null`, `vigente_desde`, `creada_por`,
  `creada_en`. Inmutable. Sin RLS por comercio (es de EvePay): se lee y se
  escribe solo por funciones SECURITY DEFINER.
- `payments.tarifa_id` y `payments.tarifa_proveedor_id`, las dos `null` en los
  cobros anteriores.
- Funciones: `tarifa_vigente(tenant)`, `tarifa_proveedor_vigente(provider)`,
  `admin_asignar_tarifa`, `admin_asignar_tarifa_proveedor` y sus historiales.
  Las de escritura dejan el rastro en `audit.admin_actions` dentro de la misma
  función.

## Núcleo

- `PagosService.crearCobro`, después de `exigirComercioAprobado` y antes de
  llamar al proveedor: resuelve las dos tarifas vigentes (409 si falta
  cualquiera), rechaza si comisión + IVA es ≥ monto (400) y guarda las dos
  referencias en el cobro.
- Repositorio de tarifas con adaptadores Drizzle e in-memory.

## API y consola

- `GET` y `PUT /v1/admin/merchants/:tenantId/tarifa`.
- `GET` y `PUT /v1/admin/providers/:provider/tarifa`.
  En los dos, `PUT` crea una versión nueva.
- Ficha del comercio: bloque «Comisión» con el desglose del cobro de referencia.
- Proveedores: bloque «Tarifa que nos cobra».

## Riesgos

- Una tarifa mal puesta afecta a todos los cobros nuevos al instante; la del
  proveedor, a todos los comercios a la vez. La edición confirma mostrando el
  antes y el después y, en la del proveedor, cuántos comercios quedarían con
  margen negativo en el cobro de referencia.
