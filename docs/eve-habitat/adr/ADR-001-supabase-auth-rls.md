# ADR-001: Supabase Auth y RLS

- Estado: Aceptada
- Fecha: 2026-07-18

## Contexto

Eve-Habitat debe cumplir los estándares de ingeniería EVETEV y operar con aislamiento, trazabilidad y bajo costo operacional.

## Decisión

Usar proyectos Supabase separados por ambiente. El JWT declara el tenant activo y PostgreSQL aplica RLS forzado en toda tabla de negocio. Las claves privilegiadas nunca llegan al navegador.

## Consecuencias

La base de datos constituye una segunda frontera de autorización. Cambiar de tenant exige una sesión/claim nuevo y queda auditado.
