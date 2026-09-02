# EveConecta — guía para agentes

Next.js + Supabase (Auth + RLS). Vertical de propiedad horizontal, **en
producción** en conecta.evetev.com con datos reales.

## Bucle de trabajo

```bash
cd apps/eveconecta
cp .env.example .env.local        # solo la primera vez
pnpm db:start                     # Supabase local en Docker (puertos 5532x)
pnpm db:status                    # copia la PUBLISHABLE_KEY a .env.local
pnpm db:reset                     # aplica migraciones + seed local
pnpm db:test                      # tests de base (RLS incluido)
pnpm dev                          # → http://localhost:3002
```

Supabase Studio local: http://127.0.0.1:55323. Datos demo: `pnpm demo:seed`.
Verificación completa: `pnpm lint && pnpm typecheck && pnpm test` (+ `pnpm
test:e2e` para flujos críticos).

## Reglas de esta app

- Solo es dueña del schema Postgres **`conjuntos`**. El schema `evepay` no se
  consulta ni se modifica jamás; los cobros se piden a EvePay por HTTP y
  `evepay_cobro_id` es un UUID externo sin llave foránea.
- **Todo cambio de tablas o permisos** va en una migración versionada en
  `supabase/migrations/`, con RLS y una prueba en `supabase/tests/`, y debe
  pasar `pnpm db:reset && pnpm db:lint && pnpm db:test`.
- Migraciones remotas: nunca desde el editor SQL. `pnpm db:migrations:status` →
  `pnpm db:deploy`, confirmando antes el proyecto con `supabase projects list`.
- Cambios en cuotas, aplicación de pagos, mora o visibilidad entre roles exigen
  **spec previa** en `specs/eve-conecta/<feature>/`.
- Registro público y usuarios anónimos están deshabilitados: los usuarios se
  aprovisionan con `pnpm auth:provision-user` desde un entorno administrativo.

## Trampas

- Los puertos locales son la serie **5532x** (no 5432x) para no chocar con otra
  instancia Supabase de la máquina.
- `NEXT_PUBLIC_*` se hornean en build time: cambiarlas exige rebuild.
