# Dispersión: que cada comercio reciba su dinero

> Fase 7 del [plan de EvePay](../../../docs/PLAN_DESARROLLO_EVEPAY.md). Depende de
> [`ledger-custodia`](../ledger-custodia/) y [`comisiones`](../comisiones/); los
> roles y el cuatro ojos vienen de [`rbac-operativo`](../rbac-operativo/). Toca
> dinero de terceros: spec obligatoria (§9).

## Problema

EvePay custodia el recaudo y le debe a cada comercio lo que el libro dice en
`merchant_payable`. Hoy nada saca ese dinero de la cuenta de recaudo hacia el
comercio: sin dispersión, ningún comercio cobra de verdad. Y dispersar mal es
el error más caro de la plataforma: pagar dos veces, pagar a una cuenta que no
es del comercio, o pagar lo que todavía no está en el banco.

## Modelo (decisión del 11-sep-2026)

- **Asistida.** No hay riel de pago por API (ComboPay no lo confirma, Bre-B no
  está). La consola arma el **lote**, alguien lo **aprueba** (otra persona), se
  paga desde el portal del banco y se **registra** el comprobante. El ledger lo
  asienta. Cuando haya riel, la misma máquina de estados lo dispara sola.
- **Solo se dispersa lo que ya está en el banco:** cobros `conciliado`
  (consignados) cuyo dinero lleva al menos `T+N` días en la cuenta de recaudo.
  Lo `aprobado` sin consignar es **pendiente**, no disponible.
- **Retenciones.** Dos, y arrancan en cero:
  - **Reserva** por comercio (`reserva_bps`, 0 por defecto): un porcentaje de
    cada lote se queda en `retenido:<merchant>` y se libera a mano pasados
    `dias_reserva`.
  - **Primer cobro** de un comercio nuevo: no entra en el primer lote hasta que
    alguien lo libera. Es la única defensa antes de la Fase 9.
- **La cuenta de destino es la certificada en el perfil**, con el documento del
  titular igual al del comercio. Se copia al lote al prepararlo: si después
  cambian el perfil, el lote sigue diciendo a dónde se pagó.

## Usuarios / actores

- **`ops`**: prepara lotes, libera la retención del primer cobro.
- **`finanzas`**: aprueba lotes, registra el pago o el fallo, libera reservas.
- **`super_admin`**: todo, pero **no puede aprobar un lote que preparó**.
- **El núcleo**: calcula balances y asienta al registrar el pago.

## Resultado esperado

Para cada comercio se ve cuánto tiene **disponible**, **pendiente**, **retenido**
y **en lote**. Un lote recorre `programado → aprobado → pagado | fallido` con
quién hizo cada paso. Al registrarse pagado, el libro mueve el dinero de
`recaudo` a saldar `merchant_payable`, y el cuadre de custodia sigue exacto.

## Requisitos funcionales

### Balances (por comercio, desde el ledger y los cobros)

- **Disponible** = Σ `alComercio` de los cobros `conciliado` con
  `fecha_conciliado + dias_liquidacion ≤ hoy`, que no estén en ningún lote
  `programado|aprobado|pagado` ni retenidos, **más** las reservas ya liberadas
  y aún no pagadas.
- **Pendiente** = Σ `alComercio` de los cobros `aprobado` (aún sin consignar) y
  de los `conciliado` que aún no cumplen `T+N`.
- **Retenido** = Σ de retenciones activas (primer cobro + reservas).
- **En lote** = Σ de lotes `programado|aprobado` (ya comprometido, aún no pagado).

### Política por comercio

- `dias_liquidacion` (T+N, por defecto 1), `reserva_bps` (0–5 000, por defecto
  0), `dias_reserva` (por defecto 30), `retener_primer_cobro` (por defecto sí).
  Se administra desde la ficha; cada cambio queda auditado con antes y después.

### Lote

- **Preparar** (`ops`): toma todos los cobros disponibles del comercio y las
  reservas liberadas, calcula la reserva de este lote, y copia la cuenta de
  destino del perfil. Sin perfil, sin cuenta, sin certificación bancaria o con
  titular distinto al documento del comercio: **no se prepara**. Sin nada
  disponible: tampoco. Un comercio no tiene dos lotes abiertos a la vez.
- **Aprobar** (`finanzas`): otra persona distinta de quien preparó (cuatro
  ojos, validado en la base). Un lote se aprueba una sola vez.
- **Registrar pago** (`finanzas`): referencia del banco, fecha, comprobante
  (texto: número o enlace). En una transacción: el lote pasa a `pagado`, se
  asienta cada item y la reserva, y queda el rastro. Solo desde `aprobado`.
- **Marcar fallido** (`finanzas`) con motivo: sus cobros vuelven a estar
  disponibles para un lote nuevo. Solo desde `programado|aprobado`.
- **Inmutable**: un lote pagado o fallido no se edita; los items nunca.

### Asientos (al registrar el pago)

| Item             | Débito                                     | Crédito                                                                                    |
| ---------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Cobro dispersado | `merchant_payable:<merchant>` (alComercio) | `recaudo` (alComercio − su parte de reserva) y `retenido:<merchant>` (su parte de reserva) |
| Reserva liberada | `retenido:<merchant>`                      | `recaudo`                                                                                  |

Todo por comercio; débitos = créditos por construcción y el trigger diferido lo
vuelve a comprobar. La reserva del lote se reparte entre sus cobros
proporcionalmente (mitad arriba, el último absorbe el resto) para que cada
asiento cierre por sí solo.

### Retenciones

- Se crean al preparar el lote (reserva) o al detectar el primer cobro
  (`primer_cobro`). Se liberan a mano con motivo (`finanzas` la reserva, `ops` o
  `finanzas` el primer cobro); la reserva solo pasados `dias_reserva`, salvo
  `super_admin`. Liberar se audita. Una retención liberada no se vuelve a retener.

## No-objetivos

- Pago automático por API (cuando haya riel).
- Split uno-a-muchos, comisiones fuera del flujo, retenciones tributarias.
- Notificar al comercio (Notifier, después).
- Reversar un lote pagado: se compensa con un asiento nuevo cuando haga falta
  (fuera de esta spec).

## Casos borde

- Cobro anterior a la Fase 6 (sin tarifas): su `alComercio` es el monto entero.
- Perfil cambia la cuenta después de preparar el lote: el lote conserva la que
  copió; si aún no se pagó, se marca fallido y se prepara otro.
- Lote fallido y luego uno nuevo con los mismos cobros: permitido; los items del
  fallido quedan como historia.
- Registrar pago de un lote `programado` (sin aprobar): rechazado.
- La misma persona prepara y aprueba: rechazado en la base, aunque sea `super_admin`.
- Reserva del 0 %: no hay línea de `retenido`.
- Redondeo de la reserva: 2,5 % de $48.572 = $1.214,3 → $1.214; la parte de
  cada cobro suma exactamente la reserva del lote.

## Criterios de aceptación (EARS)

1. **CUANDO** se consulta el balance de un comercio, **EL** sistema **DEBERÁ** devolver disponible, pendiente, retenido y en lote calculados desde los cobros, las retenciones y los lotes, con la regla de T+N.
2. **CUANDO** `ops` prepara un lote de un comercio con disponible > 0 y cuenta certificada, **EL** sistema **DEBERÁ** crear un lote `programado` con sus items, su reserva y la cuenta de destino copiada del perfil, y dejar el rastro.
3. **CUANDO** se intenta preparar un lote sin cuenta certificada, con titular distinto al documento del comercio, sin disponible, o con otro lote abierto, **EL** sistema **DEBERÁ** rechazarlo sin crear nada.
4. **CUANDO** quien aprueba es la misma persona que preparó, **EL** sistema **DEBERÁ** rechazar la aprobación en la base (cuatro ojos), sea cual sea su rol.
5. **CUANDO** `finanzas` registra el pago de un lote `aprobado`, **EL** sistema **DEBERÁ**, en una sola transacción, pasarlo a `pagado`, asentar por cada item débito `merchant_payable` / crédito `recaudo` (y `retenido` por la reserva), y auditar; el cuadre de custodia **DEBERÁ** seguir exacto.
6. **CUANDO** se intenta registrar el pago de un lote que no está `aprobado`, o por segunda vez, **EL** sistema **DEBERÁ** rechazarlo sin efectos (no se paga dos veces).
7. **CUANDO** un lote se marca `fallido`, **EL** sistema **DEBERÁ** dejar sus cobros disponibles para un lote nuevo y no asentar nada.
8. **CUANDO** un comercio nuevo tiene su primer cobro conciliado y `retener_primer_cobro`, **EL** sistema **DEBERÁ** excluirlo del lote y crear una retención `primer_cobro` hasta que alguien la libere.
9. **CUANDO** la política tiene `reserva_bps > 0`, **EL** sistema **DEBERÁ** retener ese porcentaje del lote en `retenido:<merchant>` con una retención `reserva` liberable pasados `dias_reserva`.
10. **CUANDO** se libera una retención, **EL** sistema **DEBERÁ** auditarlo y, si es una reserva, sumarla al disponible del comercio para el siguiente lote.
11. **CUANDO** se cambia la política de dispersión de un comercio, **EL** sistema **DEBERÁ** validar los rangos y auditar el antes y el después.
12. **CUANDO** un cobro ya está en un lote `programado|aprobado|pagado`, **EL** sistema **DEBERÁ** excluirlo de cualquier lote nuevo.

## Preguntas abiertas

- **A ComboPay:** ¿tienen API de dispersión? Si sí, el paso «registrar pago» se
  reemplaza por la llamada y el comprobante lo devuelve ella.
- **Al negocio:** el calendario T+N real y si la reserva arranca distinta de 0 %
  para algún comercio.
- **A legal:** si la reserva necesita cláusula en el contrato tipo.

## Restricciones de la constitución

- §2/§4: centavos, idempotente (un cobro en un solo lote pagado), inmutable,
  auditado; dinero validado en la base; funciones SECURITY DEFINER con nombre.
- Cuadre de custodia exacto después de dispersar, con test.
