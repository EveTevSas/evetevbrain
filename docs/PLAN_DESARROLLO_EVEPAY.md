# Plan de desarrollo — EvePay

Plan de construcción de **EvePay**, la plataforma de pagos de Evetev. Opera como
**agregador con custodia**: el proveedor de recaudo es **ComboPay** y Akua queda
implementado en reserva (§0). Se ejecuta con **Spec-Driven Development**
(constitución §9). Este documento es el mapa; cada feature real vive en
`specs/evepay/<feature>/`.

> Fuente de verdad: [`ESTANDARES_INGENIERIA.md`](./ESTANDARES_INGENIERIA.md) (§4 seguridad,
> §7 decisiones, §8 repositorio, §9 SDD, §10 despliegue).

---

## Modelo de fondos (decisión, 11-sep-2026)

**ComboPay consigna todo el recaudo a la cuenta de EvePay. EvePay descuenta su
comisión y dispersa a cada comercio.** EvePay custodia dinero de terceros. Es
coherente con la integración: un token de ComboPay es una cuenta, y todos los
comercios cobran bajo la de Evetev.

```
pagador ─► ComboPay ─► consigna ─► cuenta de recaudo de EvePay
                                        │
                                        ├─► comisión de EvePay (ingreso propio)
                                        ├─► retenido (reservas, retenciones)
                                        └─► dispersión ─► cuenta de cada comercio
```

Lo que esto obliga, y que ordena las Fases 6–11:

1. **El ledger separa el dinero.** Recaudo (de terceros), por pagar a cada
   comercio, comisión de EvePay y retenido son cuentas distintas. Al 11-sep-2026
   no lo son: el cobro aprobado se asienta entero como deuda con el comercio, el
   banco es una sola cuenta `banco` y no se calcula comisión en ninguna parte.
2. **La dispersión es requisito para el primer comercio real.** Sin ella, el
   comercio nunca recibe su dinero.
3. **Cuadre de custodia permanente.** El saldo de la cuenta de recaudo debe ser
   igual a lo que se debe a los comercios + lo retenido + la comisión aún no
   retirada. Si no cuadra, es un incidente.
4. **Conciliación contra el extracto.** La beta de ComboPay no expone
   liquidaciones: lo consignado se cruza contra el banco, no contra una API.
5. **El riesgo empieza por el comercio.** El checkout es de ComboPay: EvePay
   crea la factura antes de que aparezca el pagador y nunca ve tarjeta, IP ni
   3DS. El antifraude de tarjeta llega con Akua (Fase 11); antes, límites por
   comercio, retenciones y SARLAFT (Fase 9).

**Por confirmar con ComboPay** (cambia asientos y conciliación, no el modelo):
¿consignan bruto o neto de su tarifa? ¿Cada cuánto, y con qué detalle por
cobro? ¿Tienen API de dispersión? ¿Cómo llegan los contracargos de tarjeta?

**Por confirmar con asesoría legal antes del primer peso real:** régimen del
agregador, cuenta de recaudo segregada (y cuándo pasar a fiducia), SARLAFT y
contrato tipo con el comercio (comisión, calendario T+N, retenciones,
contracargos).

---

## 0. Proveedores: ComboPay activo, Akua en reserva

### ComboPay (activo desde sep-2026)

Pasarela de recaudo colombiana (API Recaudos beta): PSE, tarjeta y efectivo en un
**checkout alojado por ComboPay**. EvePay crea la factura y redirige; nunca toca
el PAN ni ve los datos del pagador. Bearer estático (un token = la cuenta de
Evetev), solo COP, idempotencia por el campo `invoice`, webhook sin firma
autenticado por un secreto en la ruta. Sin API de liquidaciones ni de alta de
comercios: esos métodos fallan explícito. Detalle en
[`specs/evepay/provider-combopay/`](../specs/evepay/provider-combopay/).

### Akua (implementado, en reserva)

Queda para cuando se quiera adquirencia de tarjeta propia: tokenización,
contracargos, liquidaciones y señal de riesgo. Lo que sigue describe su API.

Akua expone una **API REST con JSON** (idempotencia nativa, paginación por cursor,
versionado semántico, rate limiting). Autenticación por **API key** (`ak_test_` en
sandbox, `ak_live_` en producción) y **webhooks firmados**. Tiene **sandbox**
réplica de producción con tarjetas de prueba y reset. Está **certificada PCI DSS
Nivel 1** y ofrece **tokenización** y detección de fraude.

**Regla dura (§4/§8):** ningún módulo de EvePay importa el SDK de Akua directamente.
Akua vive **detrás de la interfaz `PaymentProvider`** (`@evetev/shared`). Solo la
implementación `AkuaPaymentProvider` habla HTTP con Akua. Esto nos deja construir el
núcleo con un `FakePaymentProvider` mientras corre, **en paralelo**, la habilitación
con partnerships de Akua (toma semanas).

**Fuera de PCI:** nunca tocamos el PAN. Usamos la **tokenización / checkout
embebido** de Akua; EvePay solo maneja tokens e IDs.

### Recursos de Akua ↔ módulos de EvePay

| Recurso / evento de Akua                         | Módulo EvePay         | Uso                                                                 |
| ------------------------------------------------ | --------------------- | ------------------------------------------------------------------- |
| `POST /v1/payments` (+ `Idempotency-Key`)        | `pagos`               | Crear cobro. EvePay guarda su propio agregado y máquina de estados. |
| `/v1/tokens` (tokenización de tarjeta)           | `pagos`               | Cobrar sin tocar PAN (checkout/token de Akua).                      |
| webhook `payment.purchase.succeeded` / `.failed` | `webhooks` → `pagos`  | Transición de estado del cobro.                                     |
| webhook `payment.refunded` (+ refunds)           | `webhooks` → `ledger` | Reverso contable.                                                   |
| `/v1/merchants` + webhook `merchant.approved`    | `merchants`           | Onboarding y KYC/KYB de comercios.                                  |
| `/v1/settlements` + webhook `payout.completed`   | `conciliacion`        | Cuadrar lo cobrado con lo liquidado.                                |
| webhook `dispute.created`                        | `webhooks` → `ledger` | Registrar disputa/contracargo.                                      |
| API key `ak_test_`/`ak_live_`, firma de webhook  | `identidad` / infra   | Secretos por entorno (§4), nunca en el repo.                        |
| MCP server de Akua                               | `ia` (a futuro)       | Snippets/consultas asistidas por agente.                            |

---

## 1. Metodología (cómo se construye cada pieza)

Seguimos el loop de SDD (§9): **Constitución → Especificar → Clarificar → Plan →
Tareas → Implementar → Validar**. Nivel: _spec-anchored_ (la spec ancla la
intención; el código y los tests son la verdad ejecutable).

- **Spec obligatoria** para todo lo de EvePay: pagos, ledger, conciliación,
  multi-tenancy y RBAC. Aquí no hay "arreglo rápido": la precisión es el producto.
- Cada feature vive en `specs/evepay/<feature>/` con `spec.md` (qué + criterios EARS),
  `plan.md` (arquitectura) y `tasks.md` (unidades implementables). Entran en el
  **mismo PR** que implementan.
- Criterios en **EARS** (`CUANDO … EL sistema DEBERÁ …`), y cada criterio se
  convierte en test. Los tests obligatorios (idempotencia, aislamiento de tenant)
  se derivan de la spec, no se inventan aparte.
- Herramienta sugerida: **GitHub Spec Kit** (`/specify`, `/plan`, `/tasks`,
  `/implement`) con Claude Code.

---

## 2. Arquitectura de la integración

```
 Vertical (EveConecta)                    EvePay (apps/api)                 Akua
        │                                        │                            │
        │  POST /v1/pagos (HTTP, evepay-sdk)     │                            │
        │  Idempotency-Key ─────────────────────►│  pagos.service             │
        │                                        │   └─ PaymentProvider ──────►│  POST /v1/payments
        │                                        │        (AkuaProvider)       │   Idempotency-Key
        │◄───────────── { cobro_id, url_checkout }│◄──────────────────────────│  { id, checkout_url }
        │                                        │  ledger.registrarPendiente  │
        │                                        │                            │
        │                                        │  webhooks ◄─── firmado ─────│  payment.purchase.succeeded
        │                                        │   └─ normaliza → evento     │
        │                                        │   └─ pagos: →aprobado       │
        │                                        │   └─ ledger: asiento        │
        │◄──── evento/consulta: cobro.aprobado ──│                            │
        │  marca cuota pagada (SU schema)        │  conciliacion ◄ settlements─│
```

- **Seam:** `PaymentProvider` (`@evetev/shared`) — `FakePaymentProvider` (local/CI),
  la implementación de ComboPay (activa) y la de Akua (en reserva). Se cambia por
  config (`PAYMENT_PROVIDER=fake|akua|combopay`). El diagrama muestra Akua; con
  ComboPay el flujo es el mismo y la conciliación va contra el extracto bancario.
- **Idempotencia en dos capas:** la clave del cliente → dedupe en EvePay **y** se
  reenvía como `Idempotency-Key` a Akua.
- **Event-logged (§1):** cada transición emite un evento interno. Los webhooks de
  Akua se **normalizan** a eventos EvePay; el dominio nunca escucha a Akua directo.
- **Workflows durables:** reintentos de cobro, ingest de webhooks y conciliación
  corren en **Inngest** (§7).
- **Datos:** schema `evepay` en Postgres (Supabase), aislado por tenant con RLS.
  Tenant = **comercio** (≠ `conjunto` de la vertical).

---

## 3. Roadmap por fases

Cada fase entrega algo validable y tiene sus specs. El orden respeta los cimientos
no-reescribibles (§1): multi-tenant e idempotencia/auditoría/conciliación van
sólidos desde el inicio; lo demás puede ser provisional.

> **Estado al 11-sep-2026:** Fases 0–5 implementadas, y también la consola de
> operación (`admin-console`). Lo que sigue son las Fases 6–11, ordenadas por el
> modelo de fondos: primero lo necesario para mover el primer peso real sin perderlo.

### Fase 0 — Cimientos (antes del primer cobro)

**Objetivo:** que todo lo que se construya encima nazca aislado y auditable.

- `specs/evepay/multi-tenancy-rls/` — RLS en schema `evepay`, `tenant_id` + `SET LOCAL app.tenant_id`. **Test obligatorio:** tenant A jamás ve datos de B.
- `specs/evepay/identidad-rbac/` — auth Supabase, roles (`super_admin`, `admin_comercio`), cada endpoint declara su rol.
- Contrato `PaymentProvider` (ya en `@evetev/shared`) + `FakePaymentProvider` (ya) + esqueleto `AkuaPaymentProvider`.
  **Validación:** typecheck/lint/test verdes; test de aislamiento pasa.

### Fase 1 — Cobro idempotente + máquina de estados (MVP núcleo)

**Objetivo:** crear cobros de verdad y no cobrar dos veces nunca.

- `specs/evepay/create-payment-idempotency/` — crear cobro, `Idempotency-Key`, estados `creado → pendiente → aprobado/fallido → conciliado`. **(spec exemplar ya escrita).**
- Persistencia (`evepay.payments`, Drizzle), máquina de estados, auditoría inmutable de transiciones.
- `AkuaPaymentProvider.crearCobro` contra sandbox `ak_test_`.
- **Dogfooding:** EveConecta crea un cobro vía HTTP y guarda `cuota.evepay_cobro_id`.
  **Validación:** EARS de idempotencia en test; cobro real en sandbox de Akua.

### Fase 2 — Webhooks normalizados

**Objetivo:** que el estado del cobro lo mueva la realidad, no un polling frágil.

- `specs/evepay/provider-webhooks/` — verificar **firma**, procesar **idempotente** (un webhook repetido no duplica efecto), mapear `payment.purchase.succeeded→aprobado`, `payment.purchase.failed→fallido`, `payment.refunded→reverso`.
- Ingesta con Inngest (reintentos), normalización a eventos EvePay.
  **Validación:** replay de webhook no duplica; firma inválida se rechaza.

### Fase 3 — Ledger inmutable + estado de cuenta

**Objetivo:** la verdad contable de cada peso.

- `specs/evepay/ledger-posting/` — doble partida, asientos **inmutables** (sin edición/borrado), ligados a cada transición. Saldo **reconstruible** desde movimientos, no un campo suelto.
  **Validación:** débitos = créditos siempre; el saldo se reconstruye.

### Fase 4 — Conciliación

**Objetivo:** lo cobrado cuadra con lo liquidado por Akua.

- `specs/evepay/reconciliation/` — cruzar ledger de EvePay contra `/v1/settlements` y `payout.completed`; reportar diferencias y pagos huérfanos.
- Job periódico en Inngest.
  **Validación:** con datos sembrados, 0 diferencias; una diferencia inyectada se detecta.

### Fase 5 — Onboarding de comercios (merchants)

**Objetivo:** dar de alta comercios (incluida la vertical como primer comercio).

- `specs/evepay/merchant-onboarding/` — `POST /v1/merchants`, estados de KYC/KYB, webhook `merchant.approved`.
  **Validación:** alta de comercio de prueba aprobado en sandbox.

### Fase 6 — Separar el dinero en el ledger + comisión

**Objetivo:** que el libro distinga de quién es cada peso. Es el cimiento que no
se reescribe, y no depende de ninguna respuesta pendiente.

- `specs/evepay/ledger-custodia/` — cuentas separadas: recaudo, por pagar por
  comercio, comisión de EvePay, retenido (y costo del proveedor si consigna
  neto). El cobro aprobado se asienta dividido: comisión + neto al comercio.
- `specs/evepay/comisiones/` — plan de comisión por comercio (% + fijo),
  versionado como el contrato; el asiento usa la versión vigente al cobrar.
- Cuadre de custodia con alarma. Capacidades del proveedor ampliadas
  (custodia, dispersión, métodos).
- Consola: sección Comisiones; balances en la ficha del comercio.
  **Validación:** Σ por pagar + retenido + comisión = saldo de recaudo, con
  test. Ejemplo: un cobro de $100.000 con comisión de 2 % + $900 deja
  exactamente $97.100 por pagar al comercio.

### Fase 7 — Dispersión

**Objetivo:** que cada comercio reciba su dinero, sin pagar dos veces ni a quien
no es.

- `specs/evepay/dispersion/` — balances (disponible / pendiente / retenido),
  calendario T+N, lotes `programado → en_proceso → pagado / fallido`,
  idempotencia por lote y comercio, comprobante adjunto.
- Primera versión **asistida**: la consola arma el lote, se paga desde el portal
  del banco y se registra el comprobante; el ledger lo asienta. Se automatiza
  cuando haya riel (API de ComboPay o Bre-B).
- Retenciones: reserva por comercio (arranca en 0 %) y retención del primer
  cobro de un comercio nuevo.
- `specs/evepay/rbac-operativo/` — roles `ops` y `finanzas`; **cuatro ojos**:
  quien prepara un lote no lo aprueba.
  **Validación:** un lote reintentado no paga dos veces; la cuenta de destino es
  la certificada en el perfil; el cuadre de custodia se mantiene tras dispersar.

### Fase 8 — Producción con un comercio piloto

- Desplegar API y consola; migraciones y Auth en el Supabase alojado.
- ComboPay en sandbox (T6 de `provider-combopay`) y luego producción.
- Solidez pendiente: RLS en `identity.tenants`, validar
  `payments_merchant_id_fkey`, refactor R3–R6 de `admin-console`.
- Un comercio real, montos pequeños, dispersión asistida, cuadre diario
  revisado a mano.
  **Requisitos externos (§4):** respuestas de ComboPay, asesoría legal, cuenta de
  recaudo abierta y tabla de comisiones definida.

### Fase 9 — Riesgo del comercio

- `specs/evepay/riesgo-comercio/` — límites por comercio (transacción, día,
  mes) aplicados antes de crear el cobro; monto atípico frente al ticket
  promedio → cola de revisión; motor de reglas con modo _shadow_.
- Cruce contra listas restrictivas (OFAC, ONU, PEP) en el alta — SARLAFT.
- Consola: sección de Auditoría (la API ya la expone).

### Fase 10 — Command Center y reportes

- Tablero con cifras reales: volumen, comisión ganada, flujo de fondos, cuadre.
  Va después de las Fases 6–7 porque antes no hay de dónde sacar esas cifras.
- Estados de cuenta por comercio, exportes y lo contable (retenciones, IVA).

### Fase 11 — Tarjetas con Akua

- Motor antifraude de tarjeta (velocity, card testing, geo, 3DS, listas de
  bloqueo) con el ML de Akua como una señal más.
- Contracargos con plazos y evidencia; reserva ligada al contracargo;
  reembolsos (se adelantan si un comercio los pide antes).

### Después, cuando el negocio lo pida (§1)

- Split uno-a-muchos, portal para el comercio (`admin_comercio`), compliance
  ARCO, notificaciones.
- `apps/checkout` (elements white-label) y `packages/evepay-sdk` (primer
  consumidor externo o 2.ª vertical).

---

## 4. Track paralelo — lo que no es código

Corre en paralelo al desarrollo. Bloquea la Fase 8 (producción), no las 6 y 7:

1. **ComboPay:** credenciales de sandbox (T6) y las respuestas pendientes del
   modelo de fondos: bruto o neto, frecuencia y detalle de la consignación, API
   de dispersión, contracargos.
2. **Asesoría legal:** régimen del agregador, cuenta segregada o fiducia,
   SARLAFT, contrato tipo con el comercio.
3. **Negocio:** tabla de comisiones y calendario de pago (T+N).
4. **Banco:** cuenta de recaudo separada de la operación de Evetev.
5. **Akua (en reserva):** retomar partnerships (info@akua.la) cuando se quiera
   adquirencia de tarjeta propia; la integración ya está implementada.

---

## 5. Lista maestra de specs

| Spec                         | Fase | Cimiento tocado        | Estado                                                                                         |
| ---------------------------- | ---- | ---------------------- | ---------------------------------------------------------------------------------------------- |
| `multi-tenancy-rls`          | 0    | multi-tenant           | implementada (solo `spec.md`)                                                                  |
| `identidad-rbac`             | 0    | RBAC                   | implementada (solo `spec.md`)                                                                  |
| `create-payment-idempotency` | 1    | idempotencia/auditoría | implementada; faltan T8 (dogfooding) y el cobro en sandbox de Akua                             |
| `provider-webhooks`          | 2    | auditoría              | implementada; su `tasks.md` quedó sin marcar                                                   |
| `ledger-posting`             | 3    | ledger                 | implementada; `tasks.md` sin marcar. La revisa la Fase 6                                       |
| `reconciliation`             | 4    | conciliación           | implementada; `tasks.md` sin marcar. La revisa la Fase 6                                       |
| `merchant-onboarding`        | 5    | —                      | implementada; `tasks.md` sin marcar                                                            |
| `provider-combopay`          | 1–2  | idempotencia/auditoría | implementada; falta T6 (sandbox)                                                               |
| `admin-console`              | 5+   | RBAC/auditoría         | implementada; faltan R3–R6 (refactor)                                                          |
| `ledger-custodia`            | 6    | ledger                 | implementada (11-sep-2026): asiento dividido, consignación asistida, cuadre de custodia        |
| `comisiones`                 | 6    | ledger                 | implementada (11-sep-2026): tarifas versionadas, IVA 0 %/19 %, desglose compartido             |
| `dispersion`                 | 7    | ledger/idempotencia    | implementada (11-sep-2026): lotes asistidos, cuatro ojos, retenciones, deuda                   |
| `rbac-operativo`             | 7    | RBAC                   | implementada (11-sep-2026): roles ops y finanzas, permisos por acción                          |
| `riesgo-comercio`            | 9    | auditoría              | implementada (11-sep-2026): reglas con shadow, retención de riesgo, lista restrictiva          |
| `reembolsos-contracargos`    | 11   | ledger/pagos           | implementada (11-sep-2026) en lo construible sin Akua: asistido, reglas de tarjeta post-evento |

---

## 6. Definición de "listo" (por fase)

Además del Definition of Done de la constitución (§6):

- La feature tiene `spec.md` con criterios **EARS** y tests derivados de ellos.
- Si toca dinero: montos en **enteros/centavos**, idempotente, auditado, sin PAN.
- Aislamiento por tenant verificado con test.
- Secretos de los proveedores en el gestor del entorno, nunca en el repo (§4).
- Si mueve fondos de terceros: el cuadre de custodia sigue exacto después del
  cambio, con test.
- Eventos relevantes registrados (para producto e IA).
