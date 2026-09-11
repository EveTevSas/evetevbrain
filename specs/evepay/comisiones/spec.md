# Comisiones: lo que cobramos y lo que nos cobran

> Fase 6 del [plan de EvePay](../../../docs/PLAN_DESARROLLO_EVEPAY.md), junto con
> [`ledger-custodia`](../ledger-custodia/). Toca dinero: spec obligatoria (§9).

## Problema

EvePay le cobra a cada comercio por transacción, y el proveedor le cobra a
EvePay por transacción. La diferencia es el margen de EvePay. Hoy el código no
calcula ninguna de las dos: el ledger asienta el 100 % de cada cobro como deuda
con el comercio, y ni la comisión ni el costo del proveedor existen en el libro.

## Modelo (decisión del 11-sep-2026)

- **Cada comercio tiene su tarifa**: la que EvePay le cobra.
- **El proveedor le cobra a EvePay siempre lo mismo**, sin importar el comercio.
- **EvePay absorbe la tarifa del proveedor**: sale de su comisión; al comercio
  no se le descuenta nada más que su propia tarifa.
- **Las dos se administran desde la consola.**
- **El IVA de la comisión se configura en la tarifa del comercio**: 0 % o 19 %,
  desde el principio. Se suma a la comisión y EvePay lo recauda para la DIAN: no
  es margen.

Ejemplo: ComboPay le cobra a EvePay $800 por transacción y EvePay le cobra al
comercio $1.200. En un cobro de $50.000 el comercio recibe $48.800, EvePay se
queda con $1.200 y le paga $800 a ComboPay: gana $400.
Con IVA del 19 % sobre la comisión ($228), el comercio recibe $48.572 y el
margen sigue siendo $400: el IVA se le debe a la DIAN.

## Usuarios / actores

- **Operación de Evetev** (`super_admin`), que define la tarifa de cada comercio
  y la de cada proveedor.
- **El núcleo**, que fija las dos tarifas a cada cobro y las usa al asentarlo.

## Resultado esperado

Cada comercio y cada proveedor tienen una tarifa vigente, con historial. Cada
cobro queda marcado con las versiones con que se creó, así que su comisión, su
costo y el margen de EvePay se calculan siempre igual, en la API y en la consola.

## Requisitos funcionales

### Tarifa del comercio

- `evepay.tarifas_comercio`: porcentaje en puntos básicos (`bps`, 0–10 000;
  290 = 2,90 %), fijo en centavos (≥ 0) y fecha de vigencia. Cambiarla **agrega
  una versión**; las anteriores no se editan ni se borran. Es el contrato con el
  comercio.
- **Sin tarifa no se cobra**, igual que sin KYC aprobado.
- **IVA de la comisión.** Cada versión de la tarifa lleva `iva_bps`, que solo
  puede ser 0 (0 %) o 1 900 (19 %), validado en la base. Se calcula sobre la
  comisión con la misma función y se descuenta junto con ella:
  `al comercio = monto − comisión − IVA`.
- Si la comisión más su IVA es mayor o igual al monto, el cobro se rechaza: el
  comercio recibiría cero o menos.

### Tarifa del proveedor

- `evepay.tarifas_proveedor`: una por proveedor (no por comercio), con el mismo
  formato (`bps` + fijo), versionada e inmutable como la del comercio.
- Declara además si el proveedor **descuenta su tarifa de lo que consigna** o la
  **factura aparte**. De eso depende contra qué cuenta se asienta el costo y
  cuánto debe traer cada consignación (ver `ledger-custodia`).
- **Sin tarifa del proveedor no se cobra**: sin ella EvePay no conoce su costo,
  y una consignación con descuento nunca cuadraría.

### Comunes

- **Las tarifas viajan con el cobro.** Al crearlo se guardan en él las dos
  versiones vigentes (`payments.tarifa_id` y `payments.tarifa_proveedor_id`).
  Cambiar una tarifa después no altera los cobros ya creados.
- **Un solo cálculo.** `calcularTarifa(montoMinor, { bps, fijoMinor })` vive en
  `@evetev/shared`, en enteros:
  `redondeo_mitad_arriba(monto × bps / 10 000) + fijo`. Sirve para las dos
  tarifas; la API la usa al asentar y la consola en la vista previa.
- **Auditoría.** Cada cambio de cualquiera de las dos queda en
  `audit.admin_actions` con la versión anterior y la nueva.

### Consola

- **Ficha del comercio:** tarifa vigente, historial y «Cambiar tarifa», con la
  vista previa de un cobro de referencia: cuánto recibe el comercio, cuánto
  cobra EvePay, su IVA, cuánto cuesta el proveedor y cuál es el margen. El
  formulario trae el IVA como selector: **0 % o 19 %**, sin otras opciones.
- **Proveedores:** la tarifa que cobra cada proveedor, su historial, si la
  descuenta de la consignación y «Cambiar tarifa».
- Si la vista previa da **margen negativo**, la consola lo advierte («con esta
  tarifa pierdes $300 en cada cobro de $50.000») pero deja guardar: un piloto
  sin comisión es una decisión válida.

## No-objetivos

- Retenciones sobre la comisión (ver preguntas abiertas).
- El IVA que el proveedor le cobre a EvePay sobre su tarifa (descontable): con
  el contador.
- La suscripción mensual del comercio: se factura aparte, no sale de los cobros.
- Planes reutilizables («Plan Pyme»): con pocos comercios, una tarifa por
  comercio basta.
- Tarifas por método de pago, de cualquiera de los dos lados. Con ComboPay el
  pagador elige el método dentro del checkout, después de creado el cobro, y hoy
  ComboPay cobra lo mismo por cualquier método. Si eso cambia, el costo pasa a
  fijarse al aprobar en vez de al crear, y esta spec se revisa.
- Pagarle al proveedor la tarifa que factura aparte: sale de la operación de
  Evetev, no de la cuenta de recaudo (Fase 7).

## Casos borde

- Cobros creados antes de esta fase (sin tarifas): comisión y costo 0, todo al
  comercio, como se asentaban. Nada se recalcula hacia atrás.
- Una tarifa cambia entre la creación y la aprobación de un cobro: vale la del
  momento de crearlo.
- Tarifa del comercio de 0 % y $0 (piloto): permitida; el margen queda negativo
  por el costo del proveedor, con la advertencia.
- IVA en 0 %: el asiento no lleva línea de IVA.
- Redondeo: 2,90 % de $1.005 (100 500 centavos) = 2 914,5 centavos → 2 915.

## Criterios de aceptación (EARS)

1. **CUANDO** se asigna una tarifa a un comercio o a un proveedor, **EL** sistema **DEBERÁ** guardarla como versión nueva sin modificar las anteriores y registrar en auditoría la anterior y la nueva.
2. **CUANDO** se intenta modificar o borrar una versión de tarifa, **EL** sistema **DEBERÁ** rechazarlo en la base.
3. **CUANDO** un comercio sin tarifa vigente intenta crear un cobro, **EL** sistema **DEBERÁ** rechazarlo con 409 sin llamar al proveedor.
4. **CUANDO** el proveedor activo no tiene tarifa vigente, **EL** sistema **DEBERÁ** rechazar la creación de cobros con 409 sin llamarlo.
5. **CUANDO** se crea un cobro, **EL** sistema **DEBERÁ** guardar en él las versiones vigentes de las dos tarifas, y un cambio posterior de cualquiera **NO DEBERÁ** alterar su comisión ni su costo.
6. **CUANDO** se calcula una tarifa sobre un monto M con (bps, fijo), **EL** sistema **DEBERÁ** obtener `redondeo_mitad_arriba(M × bps / 10 000) + fijo` usando solo enteros.
7. **CUANDO** la comisión del comercio más su IVA es mayor o igual al monto del cobro, **EL** sistema **DEBERÁ** rechazar el cobro con 400 sin llamar al proveedor.
8. **CUANDO** una tarifa trae un porcentaje fuera de 0–10 000 bps o un fijo negativo, **EL** sistema **DEBERÁ** rechazarla con 400.
9. **CUANDO** la consola muestra una vista previa, **EL** sistema **DEBERÁ** calcularla con la misma función de `@evetev/shared` que usa la API.
10. **CUANDO** la vista previa da un margen negativo para el monto de referencia, **EL** sistema **DEBERÁ** advertirlo mostrando la pérdida por cobro, sin impedir guardar.
11. **CUANDO** una tarifa trae un IVA distinto de 0 % o 19 %, **EL** sistema **DEBERÁ** rechazarla con 400, y la base **DEBERÁ** rechazarla aunque llegue por otro camino.
12. **CUANDO** se calcula el IVA de una comisión C, **EL** sistema **DEBERÁ** obtener `redondeo_mitad_arriba(C × iva_bps / 10 000)` con la misma función de las tarifas.

## Preguntas abiertas

- **A ComboPay: ¿descuentan su tarifa de lo que consignan o la facturan
  aparte?** Ya no bloquea el diseño —se configura en su tarifa—, pero hay que
  saberlo para configurarla bien.
- **Al contador: qué IVA configurar y las retenciones.** El IVA ya es un campo
  de la tarifa (0 % o 19 %); el contador dice cuál aplica. Las retenciones que
  practique el comercio (ReteFuente, ReteIVA, ReteICA) siguen sin modelar.

## Restricciones de la constitución

- §2/§4: montos en centavos, enteros, nunca float; todo auditado.
- Premisas de la consola: nada que toque dinero se borra; el dinero se valida en
  la base.
- Acceso: solo `super_admin` (en la Fase 7 se comparte con `finanzas`).
