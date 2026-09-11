# Reembolsos, contracargos y antifraude de tarjeta

> Fase 11 del [plan de EvePay](../../../docs/PLAN_DESARROLLO_EVEPAY.md). Depende de
> [`ledger-custodia`](../ledger-custodia/), [`dispersion`](../dispersion/) y
> [`riesgo-comercio`](../riesgo-comercio/). Toca pagos y ledger: spec obligatoria (§9).
>
> **Alcance de esta entrega:** lo que se puede construir sin la adquirencia de
> tarjeta propia. El riel que ejecuta reembolsos y el ML de Akua entran por el
> `PaymentProvider` cuando exista el contrato; hasta entonces el flujo es
> asistido (se paga desde el banco y se registra) y las señales de tarjeta
> llegan solo si el proveedor las manda en su webhook.

## Problema

Con custodia, EvePay es quien devuelve el dinero al pagador (reembolso) y
quien responde ante la red por un contracargo. Hoy ningún cobro puede
deshacerse: no hay estado `reembolsado`, no hay asiento que saque el dinero
de `recaudo` hacia el pagador, y un contracargo perdido no le llegaría al
comercio ni al margen. Y el motor de riesgo solo mira al comercio: cuando el
proveedor sí traiga señales de tarjeta (país del BIN, intentos, score), no
hay dónde ponerlas.

## Modelo

- **Reembolso** (total o parcial) de un cobro `conciliado` cuyo dinero está en
  `recaudo` y aún no se dispersó, o ya se dispersó (entonces el comercio queda
  debiendo y se descuenta del siguiente lote). Se paga al pagador desde el
  banco (asistido) y se registra con referencia; el asiento devuelve
  proporcionalmente lo del comercio, la comisión y su IVA, y EvePay absorbe la
  parte del costo del proveedor. Un reembolso total deja el cobro en
  `reembolsado`.
- **Contracargo**: la red reclama un cobro de tarjeta. Ciclo `recibido →
en_evidencia → ganado | perdido`, con **fecha límite** de evidencia visible.
  Perdido = mismo asiento que un reembolso total (el dinero sale hacia la
  red), y el cobro queda `reembolsado`. Ganado = nada cambia.
- **Deuda del comercio**: si el cobro ya se había dispersado, el reembolso o
  contracargo perdido deja `merchant_payable` en negativo por lo que ya se le
  pagó; el siguiente lote lo descuenta (item `deuda`). Mientras, el balance
  lo muestra como deuda.
- **Antifraude de tarjeta**: el motor de `riesgo-comercio` suma reglas que
  leen **señales del proveedor** (`paisTarjeta` vs `paisIp`, `intentos`, `score`
  del proveedor, tarjeta ya con contracargo). Se evalúan **al aprobarse el
  cobro** (webhook), porque con checkout alojado no hay pre-autorización
  nuestra; su acción es `retener`. Cuando la señal no viene, la regla no aplica.
- `CapacidadesProvider` suma `reembolsos` (¿ejecuta reembolsos por API?) y el
  `PaymentProvider` gana `reembolsar()` opcional; fake sí, ComboPay y Akua no
  hasta confirmar.

## Requisitos funcionales

- `evepay.reembolsos`: cobro, monto, motivo, estado `pagado`, referencia del
  banco, quién y cuándo. Inmutable. Σ reembolsos de un cobro ≤ monto del cobro.
- `evepay.contracargos`: cobro, monto, motivo de la red, fecha límite de
  evidencia, estado, evidencia (texto/enlace), quién y cuándo cada paso.
  Solo avanza. Un cobro tiene un contracargo abierto a la vez.
- Asiento `cobro_reembolsado` (por reembolso o contracargo perdido) de monto R
  sobre un cobro de monto M con comisión C e IVA V: débito `merchant_payable`
  R·(M−C−V)/M, débito `comision:evepay` R·C/M, débito `iva_por_pagar` R·V/M,
  crédito `recaudo` R. Enteros, mitad arriba, la parte del comercio absorbe el
  resto para que cierre. El costo del proveedor P no se recupera: en un
  reembolso total `recaudo` queda corto en P para ese cobro, y el cuadre de
  custodia lo muestra hasta que EvePay lo cubra de su operación.
- Estado `reembolsado` en la máquina de estados: desde `conciliado` (y desde
  `aprobado` si el proveedor devuelve antes de consignar; entonces el crédito
  va a `clearing:<proveedor>`).
- La deuda del comercio es `merchant_payable` en negativo (ya se le pagó lo
  que ahora se devolvió). El siguiente lote transfiere
  `max(0, disponible − deuda)`: sus cobros se asientan igual y el crédito a
  `recaudo` se reduce en lo que salda la deuda, de modo que `merchant_payable`
  vuelve a cero antes de que el comercio reciba un peso más.
- Señales de tarjeta en el webhook normalizado (`EventoWebhook.senalesTarjeta`),
  reglas `geo_mismatch`, `intentos_tarjeta`, `score_proveedor`; evaluación
  post-evento guardada como las demás.
- Consola: en la ficha del cobro, «Registrar reembolso» (finanzas) y
  «Registrar contracargo» / evidencia / resolver (ops y finanzas); sección
  Riesgo muestra las reglas de tarjeta; Balance muestra la deuda.

## No-objetivos

- Ejecutar el reembolso por API (cuando el proveedor lo tenga).
- Disputas con la red (formularios, plazos de las marcas): se registra el
  resultado, no se litiga aquí.
- Reembolsos de cobros `pendientes` o `fallidos` (no hay dinero).

## Casos borde

- Reembolso parcial repetido hasta el total: el último deja `reembolsado`.
- Reembolso mayor que lo que queda: rechazado.
- Contracargo sobre un cobro ya reembolsado: rechazado.
- Cobro anterior a la Fase 6 (sin tarifas): todo el reembolso sale de
  `merchant_payable` (C = V = P = 0).
- Señales de tarjeta ausentes: las reglas de tarjeta no disparan.

## Criterios de aceptación (EARS)

1. **CUANDO** finanzas registra un reembolso de R sobre un cobro `conciliado` con R ≤ lo no reembolsado, **EL** sistema **DEBERÁ** guardarlo inmutable, asentar `cobro_reembolsado` balanceado con el reparto proporcional y, si completa el monto, pasar el cobro a `reembolsado`.
2. **CUANDO** R supera lo que queda por reembolsar, o el cobro no está `conciliado` ni `aprobado`, **EL** sistema **DEBERÁ** rechazarlo sin efectos.
3. **CUANDO** se registra un contracargo, **EL** sistema **DEBERÁ** crearlo `recibido` con su fecha límite; **CUANDO** se marca `perdido`, **DEBERÁ** asentar como un reembolso total y dejar el cobro `reembolsado`; **CUANDO** se marca `ganado`, **NO DEBERÁ** tocar el ledger.
4. **CUANDO** un cobro ya dispersado se reembolsa, **EL** sistema **DEBERÁ** dejar la deuda visible en el balance del comercio y el siguiente lote **DEBERÁ** descontarla.
5. **CUANDO** el webhook de aprobación trae señales de tarjeta y una regla de tarjeta activa dispara, **EL** sistema **DEBERÁ** retener el cobro y guardar la evaluación; sin señales, **NO DEBERÁ** disparar.
6. **CUANDO** el proveedor declara `reembolsos: false`, **EL** sistema **DEBERÁ** tratar el reembolso como asistido (registro con referencia) y decirlo en la consola.
7. **CUANDO** el reparto proporcional se calcula en la base y en TypeScript sobre los mismos montos, **EL** sistema **DEBERÁ** obtener los mismos enteros.

## Restricciones de la constitución

- §2/§4: centavos, inmutable, auditado, doble partida validada por el trigger;
  sin PAN (las señales traen país, conteo y score, jamás el número).
- El reembolso solo devuelve lo que hay: la parte del proveedor la asume EvePay
  y queda a la vista en el cuadre, nunca escondida en un asiento que «cuadre»
  inventando una cuenta.
