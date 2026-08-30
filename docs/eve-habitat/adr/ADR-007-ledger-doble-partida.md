# ADR-007: Ledger inmutable de doble partida

- Estado: Aceptada
- Fecha: 2026-07-18

## Contexto

Eve-Habitat debe cumplir los estándares de ingeniería EVETEV y operar con aislamiento, trazabilidad y bajo costo operacional.

## Decisión

Todo efecto económico confirmado genera un asiento con débitos iguales a créditos. PostgreSQL impide update/delete y valida el balance al confirmar la transacción.

## Consecuencias

Las correcciones requieren reverso. Auditoría y conciliación pueden reconstruir la historia.
