# ADR-005: Inngest para workflows durables

- Estado: Aceptada
- Fecha: 2026-07-18

## Contexto

Eve-Habitat debe cumplir los estándares de ingeniería EVETEV y operar con aislamiento, trazabilidad y bajo costo operacional.

## Decisión

Exponer funciones Inngest desde NestJS. La conciliación diaria usa cron con zona America/Bogota y pasos reintentables; los casos de uso siguen siendo invocables de forma manual.

## Consecuencias

Los reintentos no duplican efectos porque los casos de uso son idempotentes.
