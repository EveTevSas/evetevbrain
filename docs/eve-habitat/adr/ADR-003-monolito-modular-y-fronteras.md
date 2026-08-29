# ADR-003: Monolito modular

- Estado: Aceptada
- Fecha: 2026-07-18

## Contexto

Eve-Habitat debe cumplir los estándares de ingeniería EVETEV y operar con aislamiento, trazabilidad y bajo costo operacional.

## Decisión

Mantener una API NestJS desplegable con módulos EvePay, Eve-Habitat, eventos, datos y workflows. Los dominios se comunican por contratos o eventos, no mediante imports de repositorios internos.

## Consecuencias

Reduce operación sin renunciar a fronteras extraíbles. No se introducen microservicios prematuros.
