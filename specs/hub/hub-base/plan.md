# Plan — hub-base

1. **Contrato** en `packages/shared/src/cuenta-canonica.ts` (Zod + `ingresoDeCuenta`), con tests de CA-4 y CA-5.
2. **Base**: migración `0024_hub.sql` en el proyecto de EvePay (una sola historia de migraciones por proyecto): schema `hub`, rol `hub_app` (en `roles.sql` para local), tablas `miembros`, `metas`, `logros`, `portales`, `costos_proveedor`, `cierres_mes`, `cuentas`, `enlaces_producto`, `auditoria`; GRANT solo sobre `hub`. Seed mínimo de portales.
3. **Google en Supabase**: `[auth.external.google]` en `config.toml` con secretos por `env(...)`; URL de retorno del Hub (`:3005/auth/callback`) en `additional_redirect_urls`. En el proyecto alojado se activa desde el panel (documentado en el README).
4. **App `apps/hub`** (Next 16, puerto 3005): proxy que exige sesión y dominio (CA-1, CA-2), login con Google (+ correo en local), callback OAuth, layout con menú en tres grupos (Compañía · Negocio · Interno) y las vistas del prototipo con datos reales: Global, Portales & accesos, Productos, Clientes (unificado), Ingresos & costos, Salud financiera, Equipo & metas, Documentos.
5. **Acceso a datos**: `postgres` directo (sin ORM) desde el servidor de Next con `HUB_DATABASE_URL` (rol `hub_app`); server actions para lo que se edita; roll-ups de EvePay por HTTP con el JWT de la sesión.
6. **CI**: área `hub` en `scripts/ci-areas.sh` y job `hub` en `ci.yml` (lint · typecheck · test · build), `needs: shared`.
