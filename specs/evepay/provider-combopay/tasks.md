# Tareas — Proveedor ComboPay

- [x] T1 — `ComboPayPaymentProvider` con `crearCobro` (CA-2, CA-3) y
      `verificarEstado` (CA-4), con sus tests unitarios sobre `fetch` mockeado.
- [x] T2 — Errores explícitos en `listarLiquidaciones` (CA-8) y
      `crearMerchant` (CA-9), con tests.
- [x] T3 — Factory en `repositories.module.ts`: caso `combopay` (CA-1).
- [x] T4 — Webhook `POST /v1/webhooks/combopay/:secreto`: verificación del
      secreto en tiempo constante (CA-6), normalización a `EventoWebhook` con
      `provider: "combopay"` (CA-5) e idempotencia por `ticket_id`/CUS (CA-7),
      con tests de controller y service.
- [x] T5 — Configuración documentada: `.env.example`, `docs/DESPLIEGUE.md`
      (variables de Railway) y README de la API.
- [ ] T6 — (sandbox, cuando entreguen credenciales) Confirmar contra el
      ambiente real: formato exacto de la respuesta de
      `/api/invoice-company-customer`, comportamiento de `invoice` repetido
      sobre factura pagada, y campos reales del hook. Ajustar los TODO(sandbox).
