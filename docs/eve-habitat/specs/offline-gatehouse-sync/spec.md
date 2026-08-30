# Sincronización offline de portería

## Objetivo

Mantener portería operativa con datos mínimos y sincronización exactamente una vez desde dominio.

## Requisitos EARS

1. **GATEHOUSE-001** — CUANDO regresa la red, EL SISTEMA DEBERÁ aceptar cada `client_event_id` nuevo una vez.
2. **GATEHOUSE-002** — CUANDO se repite un evento del mismo dispositivo, EL SISTEMA DEBERÁ reportarlo duplicado.

## Invariantes

- La clave incluye tenant, dispositivo y evento cliente.
- La cola no contiene cartera ni censo completo.
- Se preservan hora del dispositivo y hora recibida.

## Evidencia de aceptación

- Endpoint `/v1/habitat/gatehouse/sync`.
- Cola local de PWA y estado de contingencia.
- Prueba GATEHOUSE-001 y constraint SQL.
