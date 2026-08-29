# Creación idempotente de pagos

## Objetivo

Crear exactamente un cobro lógico ante reintentos, doble clic o concurrencia.

## Requisitos EARS

1. **PAY-001** — CUANDO se repite una clave con el mismo payload, EL SISTEMA DEBERÁ devolver el pago original.
2. **PAY-002** — CUANDO se reutiliza una clave con payload distinto, EL SISTEMA DEBERÁ responder conflicto.

## Invariantes

- La clave se particiona por tenant y operación.
- El hash incluye todos los campos económicos.
- Solicitudes concurrentes comparten la misma promesa.

## Evidencia de aceptación

- Pruebas PAY-001, PAY-002 y PAY-003.
- Constraint único en `evepay.idempotency_keys`.
- Header obligatorio `Idempotency-Key`.
