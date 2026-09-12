# Plan — Ledger con custodia

## Contrato (`@evetev/shared`)

- `CapacidadesProvider` suma `custodia: boolean`, `dispersion: boolean` y
  `metodos: MetodoPago[]` (`"pse" | "tarjeta" | "efectivo" | "billetera" | "bre_b"`).
- ComboPay: `{ custodia: true, dispersion: false, metodos: ["pse", "tarjeta", "efectivo"] }`.
  El fake declara lo mismo, para que local se comporte como producción. Akua se
  declara según su contrato cuando se retome; hasta entonces `custodia: false`,
  que falla explícito en vez de asentar con un modelo que no conocemos.
- Los nombres de cuenta viven en un solo archivo (`cuentas.ts` del módulo
  ledger), no como textos sueltos en cada asiento.

## Asiento del cobro aprobado (`LedgerService`)

- `registrarCobroAprobado` lee el cobro con sus dos tarifas, obtiene C, su IVA y P con
  `desglosarCobro` (de `comisiones`) y arma las líneas; la contrapartida de P va
  a `clearing` o a `por_pagar` según `descuenta_en_consignacion`. Si
  `!provider.capacidades.custodia`, lanza `ModeloSinCustodiaError`.
- Sus llamadores actuales no cambian de firma: `WebhooksService` y
  `PagosAdminService.reverificar`.
- `registrarCobroConciliado` pasa a acreditar en `recaudo` en vez de `banco`
  (para la conciliación automática de los proveedores con liquidaciones).

## Persistencia (migración 0016)

- Trigger **diferido** (`constraint trigger … deferrable initially deferred`)
  sobre `ledger_lines`: al confirmar, cada asiento tocado debe tener
  Σ débitos = Σ créditos.
- `evepay.consignaciones`: `id`, `provider`, `referencia_bancaria`, `fecha`,
  `monto_minor > 0`, `nota`, `registrada_por`, `registrada_en`. Único
  `(provider, referencia_bancaria)`. Inmutable. Sin RLS por comercio: es un
  movimiento de la cuenta de Evetev que cruza comercios, y solo se toca desde
  funciones SECURITY DEFINER.
- `evepay.consignacion_cobros`: `consignacion_id`, `payment_id` **único**,
  `tenant_id`, `esperado_minor` (lo que el proveedor debía de ese cobro).
  Inmutable.
- `evepay.admin_registrar_consignacion(provider, referencia, fecha, monto, payment_ids[], actor)`:
  SECURITY DEFINER. Bloquea los cobros (`for update`) y calcula lo esperado de
  cada uno con su tarifa del proveedor fijada (M − P si descuenta, M si no).
  Valida los CA-5, 6 y 7, y en la misma transacción: inserta la consignación y
  sus cobros, pasa cada cobro de `aprobado` a `conciliado` con su fila en
  `payment_audit`, asienta un `cobro_conciliado` por cobro (débito `recaudo` /
  crédito `clearing:<proveedor>` por lo esperado) y deja el rastro en
  `audit.admin_actions`. Cualquier fallo revierte todo.
- El cálculo de P en SQL debe dar lo mismo que `calcularTarifa` en TypeScript:
  un test compara las dos implementaciones sobre los mismos montos.
- `evepay.saldos_recaudo`: `fecha`, `saldo_minor`, `registrado_por`,
  `registrado_en`, `nota`. Inmutable: una corrección es un registro nuevo.
- `evepay.admin_cuadre_custodia(fecha)`: saldo del libro en `recaudo` + `banco`
  (alias histórico) de todos los comercios, con `posted_at` hasta el final de
  esa fecha, contra el último saldo registrado para esa fecha.
- `evepay.admin_balance_comercio(tenant)`: por pagar, comisión, IVA, costo del
  proveedor, margen y en tránsito, con el signo de cada naturaleza.

## Consola

- Conciliación: «Registrar consignación» (cobros aprobados del proveedor para
  marcar, total esperado en vivo, solo confirma si cuadra) y «Registrar saldo
  del banco»; aviso de descuadre de custodia arriba de la página.
- Ficha del comercio: bloque Balance con el margen.

## Riesgos

- Registrar una consignación no se puede deshacer (es inmutable): la consola
  confirma mostrando la referencia, el monto y cuántos cobros de cuántos
  comercios incluye.
- La función que concilia cruza comercios y calcula P en SQL: sus tests corren
  contra la base local, no solo con adaptadores en memoria.
