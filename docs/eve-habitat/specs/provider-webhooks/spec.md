# Webhooks de proveedores

## Objetivo

Aceptar solo eventos verificables, deduplicarlos y evitar regresiones de estado.

## Requisitos EARS

1. **WEBHOOK-001** — CUANDO llega una firma inválida, EL SISTEMA DEBERÁ rechazar el evento sin afectar dominio ni ledger.
2. **WEBHOOK-002** — CUANDO llega dos veces el mismo evento, EL SISTEMA DEBERÁ registrar una sola transición de dominio.

## Invariantes

- Cada adaptador normaliza al contrato interno.
- Proveedor y `event_id` forman una identidad única.
- Un estado final no retrocede.

## Evidencia de aceptación

- Adaptadores mock, Wompi y Akua.
- HMAC con comparación de tiempo constante.
- Prueba WEBHOOK-001 y duplicado cubierto por LEDGER-001.
