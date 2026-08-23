# Plan de desarrollo — EvePay

Plan de construcción de **EvePay**, la plataforma de pagos (PSP/gateway) de Evetev,
sobre **Akua** como backbone de adquirencia. Se ejecuta con **Spec-Driven
Development** (constitución §9). Este documento es el mapa; cada feature real vive
en `specs/evepay/<feature>/`.

> Fuente de verdad: [`ESTANDARES_INGENIERIA.md`](./ESTANDARES_INGENIERIA.md) (§4 seguridad,
> §7 decisiones, §8 repositorio, §9 SDD, §10 despliegue). Decisión de proveedor:
> ver el modelo Akua en la memoria del proyecto — arrancamos en **Full Stack AaaS**.

---

## 0. Cómo usamos a Akua

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

- **Seam:** `PaymentProvider` (`@evetev/shared`) — `FakePaymentProvider` (local/CI) y
  `AkuaPaymentProvider` (real). Se cambia por config (`PAYMENT_PROVIDER=fake|akua`).
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

### Fase 6+ — Cuando el negocio lo pida (no antes, §1)

- Refunds y disputas (`payment.refunded`, `dispute.created`) con su reverso en ledger.
- Payouts / split payments / liquidación a beneficiarios.
- `apps/checkout` (elements white-label) y `packages/evepay-sdk` (primer consumidor externo o 2.ª vertical).

---

## 4. Track paralelo — habilitación de Akua

Corre **en paralelo** al desarrollo (no bloquea Fase 0–1 gracias al fake):

1. Contactar **partnerships** (info@akua.la / akua.la/es/contacto) — no es self-service; toma semanas.
2. Definir modelo comercial (revenue sharing, Full Stack AaaS).
3. Obtener **sandbox keys** (`ak_test_`) → fijar los contratos exactos de campos en las specs de Fase 1–2.
4. Revisar API reference, recetas y **snippets MCP** en docs.akua.la.
5. Certificación → **`ak_live_`** → enchufar `AkuaPaymentProvider` en producción sin tocar el núcleo.

---

## 5. Lista maestra de specs

| Spec                         | Fase | Cimiento tocado        | Estado               |
| ---------------------------- | ---- | ---------------------- | -------------------- |
| `multi-tenancy-rls`          | 0    | multi-tenant           | por escribir         |
| `identidad-rbac`             | 0    | RBAC                   | por escribir         |
| `create-payment-idempotency` | 1    | idempotencia/auditoría | **exemplar escrita** |
| `provider-webhooks`          | 2    | auditoría              | por escribir         |
| `ledger-posting`             | 3    | ledger                 | por escribir         |
| `reconciliation`             | 4    | conciliación           | por escribir         |
| `merchant-onboarding`        | 5    | —                      | por escribir         |

---

## 6. Definición de "listo" (por fase)

Además del Definition of Done de la constitución (§6):

- La feature tiene `spec.md` con criterios **EARS** y tests derivados de ellos.
- Si toca dinero: montos en **enteros/centavos**, idempotente, auditado, sin PAN.
- Aislamiento por tenant verificado con test.
- Secretos de Akua en el gestor del entorno, nunca en el repo (§4).
- Eventos relevantes registrados (para producto e IA).
