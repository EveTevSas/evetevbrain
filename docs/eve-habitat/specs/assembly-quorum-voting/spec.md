# Quórum y votación por coeficiente

## Objetivo

Registrar representación y votos reproducibles con un voto por unidad y pregunta.

## Requisitos EARS

1. **ASSEMBLY-001** — CUANDO una unidad intenta votar dos veces la misma pregunta, EL SISTEMA DEBERÁ rechazar el segundo voto.
2. **ASSEMBLY-002** — CUANDO una asamblea está cerrada, EL SISTEMA DEBERÁ impedir nuevos votos.

## Invariantes

- Cada voto conserva coeficiente, actor y hora.
- La unicidad incluye tenant, asamblea, pregunta y unidad.
- El resultado se reconstruye desde eventos.

## Evidencia de aceptación

- Endpoint `/v1/habitat/assemblies/votes`.
- Constraint único en `habitat.votes`.
- Prueba ASSEMBLY-001 y panel de quórum.
