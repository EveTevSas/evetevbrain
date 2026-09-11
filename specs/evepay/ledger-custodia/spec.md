# Ledger con custodia

> Fase 6 del [plan de EvePay](../../../docs/PLAN_DESARROLLO_EVEPAY.md). Aplica el
> modelo de fondos: ComboPay consigna todo el recaudo a la cuenta de EvePay y
> EvePay dispersa a cada comercio. Depende de [`comisiones`](../comisiones/).

## Problema

EvePay custodia dinero de terceros, y el ledger no lo refleja:

- El cobro aprobado se asienta **entero** como deuda con el comercio; ni la
  comisión de EvePay ni el costo del proveedor existen en el libro.
- La conciliación depende de `listarLiquidaciones`, que ComboPay no tiene. Con
  ComboPay activo **ningún cobro llega a conciliarse**, y el dinero nunca pasa de
  «en tránsito» a «en la cuenta de recaudo».
- El dinero en el banco va a una cuenta genérica `banco`, que no distingue la
  cuenta de recaudo (de terceros) de la plata de Evetev.
- Nada compara el libro con el saldo real del banco.

## Usuarios / actores

- **El núcleo**, que asienta al aprobarse un cobro.
- **Operación de Evetev**, que registra en la consola cada consignación de
  ComboPay y el saldo de la cuenta de recaudo.

## Resultado esperado

El libro dice de quién es cada peso: cuánto se le debe a cada comercio, cuánto
es comisión de EvePay, cuánto cuesta el proveedor, cuánto está en tránsito y
cuánto está en la cuenta de recaudo. Y una alarma avisa si el libro y el banco
no coinciden.

## Plan de cuentas

Todas por comercio (las líneas del ledger llevan `tenant_id`); los totales de
EvePay son la suma de todos los comercios.

| Cuenta                          | Naturaleza | Qué representa                                            |
| ------------------------------- | ---------- | --------------------------------------------------------- |
| `clearing:<proveedor>`          | activo     | Lo que el proveedor nos debe: cobrado y aún no consignado |
| `recaudo`                       | activo     | En la cuenta de recaudo de EvePay (dinero de terceros)    |
| `merchant_payable:<merchantId>` | pasivo     | Lo que se le debe al comercio                             |
| `comision:evepay`               | ingreso    | Comisión de EvePay por los cobros de ese comercio         |
| `iva_por_pagar`                 | pasivo     | IVA de la comisión, que EvePay le debe a la DIAN          |
| `costo_proveedor:<proveedor>`   | gasto      | Lo que el proveedor le cobra a EvePay por esos cobros     |
| `por_pagar:<proveedor>`         | pasivo     | Tarifa del proveedor facturada aparte y aún sin pagar     |

El margen de EvePay en un comercio es `comision:evepay − costo_proveedor`.
Reservadas para la Fase 7, sin uso todavía: `retenido:<merchantId>` y las de
dispersión. `banco` queda solo en asientos anteriores: el cuadre la suma a
`recaudo` como alias histórico, y no se reescribe nada.

## Requisitos funcionales

- **Cobro aprobado dividido.** Con monto M, comisión C (más su IVA) y costo del proveedor P
  (de las tarifas fijadas en el cobro), un solo asiento:

  | Cuenta                                                                                                           | Débito | Crédito     |
  | ---------------------------------------------------------------------------------------------------------------- | ------ | ----------- |
  | `clearing:<proveedor>`                                                                                           | M      |             |
  | `merchant_payable:<merchant>`                                                                                    |        | M − C − IVA |
  | `comision:evepay`                                                                                                |        | C           |
  | `iva_por_pagar`                                                                                                  |        | IVA de C    |
  | `costo_proveedor:<proveedor>`                                                                                    | P      |             |
  | `clearing:<proveedor>` si descuenta su tarifa en la consignación, o `por_pagar:<proveedor>` si la factura aparte |        | P           |

  Las líneas en 0 se omiten. Con el ejemplo de `comisiones` ($50.000, comisión
  $1.200 con IVA del 19 % = $228, costo $800 descontado en la consignación):
  EvePay le debe $48.572 al comercio, gana $1.200 de comisión, le debe $228 a la
  DIAN, gasta $800 de costo, y ComboPay nos debe $49.200, que es exactamente lo
  que va a consignar. El margen sigue siendo $400: el IVA no es de EvePay.

- **Solo con custodia.** Si el proveedor activo declara `custodia: false`, el
  núcleo se niega a asentar. Ese modelo (el proveedor liquida directo al
  comercio) necesita su propia spec y no puede caer en silencio en este.
- **Capacidades ampliadas.** `CapacidadesProvider` suma `custodia`,
  `dispersion` y `metodos`. ComboPay: custodia sí, dispersión no (hasta que
  confirmen una API), métodos PSE, tarjeta y efectivo.
- **Consignación asistida.** Operación registra lo que ve en el extracto
  (proveedor, referencia bancaria, fecha, monto) y marca los cobros aprobados
  que cubre. En una sola transacción de la base: cada cobro pasa a `conciliado`
  (auditado) y se asienta débito `recaudo` / crédito `clearing:<proveedor>` por
  lo que el proveedor debía de ese cobro. La consignación queda guardada,
  inmutable, con quién la registró.
- **La consignación debe cuadrar.** El monto consignado debe ser igual a lo que
  el libro dice que el proveedor debe por esos cobros: Σ (M − P) si descuenta su
  tarifa, Σ M si la factura aparte. Sale de las tarifas fijadas en cada cobro,
  así que no hay diferencias que «explicar»: si no cuadra, se rechaza entera.
- **Saldo del banco y cuadre de custodia.** Operación registra el saldo de la
  cuenta de recaudo a una fecha, tomado del extracto. El sistema lo compara con
  el saldo del libro en `recaudo` a esa fecha, sumando todos los comercios. Si
  difieren, la consola lo muestra como **descuadre de custodia**.
- **Balance del comercio.** En la ficha: por pagar, comisión, IVA, costo del
  proveedor, margen y en tránsito, reconstruidos desde las líneas, cada cuenta
  con el signo de su naturaleza (hoy el servicio y la consola usan signos
  opuestos).
- **El balance se valida en la base.** Un asiento con Σ débitos ≠ Σ créditos se
  rechaza con un trigger diferido al confirmar la transacción, no solo en el
  servicio.

## No-objetivos

- Dispersión, retenciones y reservas (Fase 7).
- Pagar la tarifa que el proveedor factura aparte (`por_pagar`): sale de la
  operación de Evetev (Fase 7).
- Importar el extracto bancario de forma automática: se registra a mano.
- Retenciones sobre la comisión y el pago del IVA a la DIAN.
- El modelo sin custodia.
- Reescribir asientos anteriores: el ledger es inmutable.

## Casos borde

- Cobro anterior a esta fase (sin tarifas): C = 0, sin IVA y P = 0, como hasta ahora; su
  consignación espera el monto completo.
- Un cobro incluido en dos consignaciones: la segunda se rechaza entera.
- Consignación con un cobro de otro proveedor, o que no está `aprobado`: se
  rechaza entera.
- La misma referencia bancaria registrada dos veces: la segunda se rechaza.
- Cobros de varios comercios en una misma consignación: permitido, porque
  ComboPay consigna todo junto; cada asiento queda en el ledger de su comercio.
- Saldo del banco registrado antes de cualquier consignación: el cuadre compara
  contra cero y avisa si el banco ya tiene plata que el libro no conoce.

## Criterios de aceptación (EARS)

1. **CUANDO** un cobro de monto M, comisión C (con su IVA) y costo del proveedor P pasa a `aprobado`, **EL** sistema **DEBERÁ** asentar en un solo asiento débito `clearing:<proveedor>` M, crédito `merchant_payable:<merchant>` M − C − IVA, crédito `comision:evepay` C, crédito `iva_por_pagar` el IVA de C, débito `costo_proveedor:<proveedor>` P, y crédito P a `clearing:<proveedor>` o a `por_pagar:<proveedor>` según la tarifa del proveedor fijada en el cobro.
2. **CUANDO** C, su IVA o P valen 0, **EL** sistema **DEBERÁ** omitir sus líneas y el asiento **DEBERÁ** seguir balanceado.
3. **CUANDO** el proveedor activo declara `custodia: false`, **EL** sistema **DEBERÁ** negarse a asentar el cobro aprobado con un error explícito.
4. **CUANDO** se registra una consignación cuyo monto es igual a lo que el proveedor debe por los cobros aprobados que cubre, **EL** sistema **DEBERÁ**, en una sola transacción, pasar cada cobro a `conciliado`, asentar débito `recaudo` / crédito `clearing:<proveedor>` por lo que se debía de cada uno y guardar la consignación inmutable.
5. **CUANDO** el monto consignado difiere de lo que el proveedor debe por esos cobros (M − P si descuenta su tarifa, M si la factura aparte), **EL** sistema **DEBERÁ** rechazar la consignación sin conciliar ningún cobro.
6. **CUANDO** una consignación incluye un cobro que no está `aprobado`, que es de otro proveedor o que ya pertenece a otra consignación, **EL** sistema **DEBERÁ** rechazarla entera.
7. **CUANDO** se registra por segunda vez la misma referencia bancaria de un proveedor, **EL** sistema **DEBERÁ** rechazarla sin efectos.
8. **CUANDO** se registra el saldo de la cuenta de recaudo a una fecha y difiere del saldo del libro en `recaudo` a esa fecha, **EL** sistema **DEBERÁ** marcar un descuadre de custodia visible en la consola.
9. **CUANDO** se consulta el balance de un comercio, **EL** sistema **DEBERÁ** reconstruir por pagar, comisión, IVA, costo del proveedor, margen y en tránsito desde las líneas, con el signo de la naturaleza de cada cuenta.
10. **CUANDO** una transacción intenta confirmar un asiento con Σ débitos ≠ Σ créditos, **EL** sistema **DEBERÁ** rechazarla en la base aunque el servicio no lo haya detectado.

## Preguntas abiertas (a ComboPay)

- **¿Descuentan su tarifa de lo que consignan o la facturan aparte?** Ya no
  bloquea: se configura en la tarifa del proveedor desde la consola. Hay que
  saberlo para configurarla bien.
- **¿Con qué detalle consignan?** Si el extracto trae el número de factura de
  cada cobro, la consola puede proponer sola qué cobros cubre una consignación.

## Relación con specs anteriores

- Cambia el CA-1 de [`ledger-posting`](../ledger-posting/): el asiento del cobro
  aprobado ahora se divide.
- Con ComboPay, la conciliación de [`reconciliation`](../reconciliation/) pasa
  de automática a asistida. La automática sigue para proveedores que exponen
  liquidaciones (Akua).

## Restricciones de la constitución

- §2/§4: ledger inmutable, doble partida, centavos, todo auditado.
- Premisas de la consola: el dinero se valida en la base; todo lo que cruza
  comercios pasa por una función SECURITY DEFINER con nombre; nada que toque
  dinero se borra.
