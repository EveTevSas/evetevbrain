# ADR-008: Eventos, outbox e inbox

- Estado: Aceptada
- Fecha: 2026-07-18

## Contexto

Eve-Habitat debe cumplir los estándares de ingeniería EVETEV y operar con aislamiento, trazabilidad y bajo costo operacional.

## Decisión

Persistir recepciones de proveedor antes de aplicar dominio, deduplicar por proveedor/evento y publicar eventos internos versionados. Outbox conserva intentos y correlación.

## Consecuencias

Un webhook duplicado no duplica transición, asiento ni aplicación a cartera.
