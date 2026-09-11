# Riesgo del comercio

> Fase 9 del [plan de EvePay](../../../docs/PLAN_DESARROLLO_EVEPAY.md). Depende de
> [`dispersion`](../dispersion/) (las retenciones) y [`rbac-operativo`](../rbac-operativo/).
> Toca pagos y auditoría: spec obligatoria (§9).

## Problema

Con el checkout alojado de ComboPay, EvePay crea la factura antes de que
aparezca el pagador y nunca ve tarjeta, IP ni dispositivo: el antifraude de
tarjeta no tiene con qué alimentarse hasta la Fase 11. Lo que sí ve, y lo que
más le cuesta si sale mal, es el **comercio**: cuánto cobra, con qué
frecuencia, si un cobro se sale de su patrón, y quién está detrás. Hoy nada
de eso se mira, y un comercio podría cobrar cualquier monto sin que nadie se
entere hasta que llegue el reclamo.

## Modelo

- **Reglas configurables** desde la consola, globales o por comercio, con
  **modo**: `activa` (decide), `shadow` (registra qué habría hecho, sin
  actuar) e `inactiva`. Se enciende en shadow, se miden falsos positivos,
  se activa.
- **Tipos de regla** (los que el comercio permite medir):
  | Tipo                 | Qué evalúa                                              | Acción típica |
  | -------------------- | ------------------------------------------------------- | ------------- |
  | `limite_transaccion` | monto del cobro > límite                                | rechazar      |
  | `limite_diario`      | monto + lo cobrado hoy > límite                         | rechazar      |
  | `limite_mensual`     | monto + lo cobrado este mes > límite                    | rechazar      |
  | `monto_atipico`      | monto > factor × ticket promedio (con historial mínimo) | retener       |
- **Dos decisiones** además de permitir: **rechazar** (el cobro no se crea ni
  se llama al proveedor, 409) y **retener** (el cobro se crea normal — el
  pagador paga — pero su dinero no se dispersa hasta que alguien lo revise y
  libere la retención de riesgo). Retener y no rechazar es lo que encaja con la
  custodia: la plata entra, pero no sale sin mirar.
- **Toda evaluación se guarda**, inmutable, con las señales y las reglas
  disparadas (incluidas las shadow), para poder responder «por qué se rechazó»
  y medir las reglas antes de activarlas.
- **Listas restrictivas** (SARLAFT): una tabla propia de documentos vetados
  (fuente OFAC, ONU, PEP o interna) que se cruza en el alta del comercio contra
  el documento del comercio, del representante legal y de los beneficiarios;
  una coincidencia bloquea el alta. La carga es manual (la API recibe las
  entradas): traer las listas oficiales por API es de otra spec.
- **Auditoría en la consola**: la API ya la expone; falta la pantalla.

## Usuarios / actores

- **El núcleo** evalúa cada cobro antes de llamar al proveedor.
- **`super_admin`** define las reglas. **`ops`** y `super_admin` cargan listas.
- **Cualquier rol interno** revisa la cola y libera retenciones de riesgo.

## Requisitos funcionales

- `evepay.reglas_riesgo`: nombre, tipo, alcance (`tenant_id` null = global),
  parámetros (`limiteMinor` o `factor` + `minimoCobros`), acción, modo,
  prioridad. Se edita con auditoría antes/después. Un comercio con regla propia
  del mismo tipo **reemplaza** la global de ese tipo.
- `evepay.evaluaciones_riesgo`: tenant, cobro (null si se rechazó), monto,
  decisión, reglas disparadas (con modo y si actuó), señales (acumulado del
  día, del mes, ticket promedio, cobros históricos). Inmutable.
- Señales desde la base: cobros del comercio no fallidos creados hoy y este
  mes (hora de Colombia), y promedio y cantidad de cobros aprobados o
  conciliados.
- El motor (`@evetev/shared`) es determinista: recibe señales y reglas y
  devuelve decisión + disparadas. La API lo corre; la consola puede
  simularlo.
- Retención de riesgo: tipo `riesgo` en `retenciones`, sobre el cobro, con el
  motivo (reglas que dispararon). Excluye el cobro de la dispersión hasta
  liberarla; se libera con motivo por cualquier rol interno.
- Listas: `evepay.lista_restrictiva` (tipo y número de documento, nombre,
  fuente, motivo, quién y cuándo, activa). Cruce exacto por tipo+número, y una
  función que devuelve las coincidencias de un conjunto de documentos.
- Reglas de arranque, todas en **shadow**: límite por transacción $20.000.000,
  diario $50.000.000, mensual $500.000.000, monto atípico 5× con mínimo 10 cobros.

## No-objetivos

- Antifraude de tarjeta (velocity, card testing, geo, 3DS, dispositivo): Fase 11.
- Descargar OFAC/ONU/PEP automáticamente; scoring con ML.
- Notificar al comercio o al pagador.

## Casos borde

- Comercio sin historial (menos de `minimoCobros`): `monto_atipico` no aplica.
- Regla shadow que habría rechazado: el cobro se crea y la evaluación dice que
  habría rechazado.
- Dos reglas disparan, una `rechazar` y otra `retener`: gana rechazar.
- Reintento idempotente de un cobro ya creado: no se re-evalúa.
- Un cobro retenido por riesgo que luego falla: la retención queda sin efecto
  (no hay nada que dispersar); se puede liberar igual para cerrar el caso.
- Documento en lista pero la entrada está `activa = false`: no bloquea.

## Criterios de aceptación (EARS)

1. **CUANDO** un cobro dispara una regla `activa` de acción `rechazar`, **EL** sistema **DEBERÁ** responder 409 sin llamar al proveedor y guardar la evaluación con las reglas disparadas.
2. **CUANDO** un cobro dispara solo reglas en modo `shadow`, **EL** sistema **DEBERÁ** crearlo normalmente y guardar la evaluación indicando qué habrían hecho.
3. **CUANDO** un cobro dispara una regla `activa` de acción `retener`, **EL** sistema **DEBERÁ** crearlo, guardar la evaluación y crear una retención de riesgo sobre él que lo excluya de la dispersión.
4. **CUANDO** se libera una retención de riesgo con motivo, **EL** sistema **DEBERÁ** auditarlo y el cobro **DEBERÁ** volver a ser dispersable.
5. **CUANDO** el monto más lo cobrado hoy (o este mes) supera el límite de la regla, **EL** sistema **DEBERÁ** dispararla; si no lo supera, **NO DEBERÁ**.
6. **CUANDO** el comercio tiene menos cobros que `minimoCobros`, **EL** sistema **NO DEBERÁ** disparar `monto_atipico`.
7. **CUANDO** existe una regla por comercio del mismo tipo que una global, **EL** sistema **DEBERÁ** aplicar solo la del comercio.
8. **CUANDO** se crea o cambia una regla, **EL** sistema **DEBERÁ** validar tipo, parámetros, acción y modo, y auditar antes/después.
9. **CUANDO** el documento del comercio, del representante o de un beneficiario coincide con una entrada activa de la lista restrictiva, **EL** sistema **DEBERÁ** rechazar el alta con 409 nombrando la fuente, sin crear nada.
10. **CUANDO** se consulta la cola de riesgo, **EL** sistema **DEBERÁ** listar las retenciones de riesgo activas con su evaluación.
11. **CUANDO** un rol distinto de `super_admin` intenta crear o cambiar reglas, **EL** sistema **DEBERÁ** responder 403.

## Restricciones de la constitución

- §4: cada evaluación auditada e inmutable; sin PAN ni datos de tarjeta (no
  los hay); listas con documentos en una tabla sin RLS por comercio, solo por
  funciones.
- El motor corre ANTES de `PaymentProvider.crearCobro()`.
