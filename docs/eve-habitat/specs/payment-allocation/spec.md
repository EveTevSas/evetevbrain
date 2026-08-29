# Aplicación de pagos a cartera

## Objetivo

Aplicar el evento aprobado a una obligación sin acoplar EvePay con Eve-Habitat.

## Requisitos EARS

1. **ALLOCATION-001** — CUANDO Eve-Habitat recibe `payment.approved`, EL SISTEMA DEBERÁ disminuir el saldo de la referencia.
2. **ALLOCATION-002** — CUANDO se repite el mismo evento, EL SISTEMA DEBERÁ evitar una segunda aplicación.

## Invariantes

- Estado de pago y aplicación a cartera son operaciones separadas.
- El pago nunca crea saldo negativo.
- La referencia identifica la obligación.

## Evidencia de aceptación

- Bus de eventos de dominio.
- Suscripción en `HabitatService`.
- Prueba ALLOCATION-001 y flujo E2E de Playwright.
