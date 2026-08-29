# ADR-002: Drizzle y migraciones SQL visibles

- Estado: Aceptada
- Fecha: 2026-07-18

## Contexto

Eve-Habitat debe cumplir los estándares de ingeniería EVETEV y operar con aislamiento, trazabilidad y bajo costo operacional.

## Decisión

Usar Drizzle ORM para consultas tipadas y Drizzle Kit para detectar diffs. Mantener migraciones SQL revisables en `supabase/migrations`; las políticas, triggers y constraints complejos se escriben explícitamente.

## Consecuencias

Se conserva control de SQL y se evita que el ORM oculte invariantes financieras.
