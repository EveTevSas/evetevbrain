# Ledger de doble partida

## Objetivo

Registrar el efecto económico de un pago en asientos balanceados e inmutables.

## Requisitos EARS

1. **LEDGER-001** — CUANDO se aprueba un pago, EL SISTEMA DEBERÁ registrar débitos iguales a créditos.
2. **LEDGER-002** — CUANDO se intenta editar o borrar un asiento confirmado, EL SISTEMA DEBERÁ impedirlo.

## Invariantes

- Montos enteros en unidad menor.
- Correcciones por asiento compensatorio.
- Un pago aprobado genera como máximo un asiento del mismo tipo.

## Evidencia de aceptación

- `LedgerService` y pruebas LEDGER-001/002.
- Triggers append-only en PostgreSQL.
- Constraint diferido de balance y pruebas pgTAP.
