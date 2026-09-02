# EvePay Admin

Consola de operación de la pasarela, **uso exclusivo del equipo de Evetev**
(rol `super_admin`). Spec completa: [`specs/evepay/admin-console/`](../../specs/evepay/admin-console/).

Secciones: comercios + onboarding · proveedores de pago · pagos · conciliación
y ledger. En Fase A solo el esqueleto autenticado; cada sección se llena en su
fase (B–E de `tasks.md`).

## Cómo funciona el acceso

- Auth con el **proyecto Supabase de EvePay** (no el de la vertical). Sin
  registro público: los usuarios se aprovisionan con
  `pnpm auth:provision-admin --email persona@evetev.com --name "Nombre"`.
- El rol `super_admin` va en `app_metadata` del JWT (solo escribible con la
  clave secreta). El proxy de la app lo exige en toda ruta, y la API lo
  verifica de nuevo (`supabase-jwt.ts` + `TenantMiddleware`): la consola no es
  frontera de seguridad, la API sí.
- La consola **no tiene base de datos**: todo pasa por `/v1/admin/*` de la API.

## Correr

```bash
cp .env.example .env.local   # valores del proyecto Supabase de EvePay
pnpm --filter @evetev/evepay-admin dev   # → http://localhost:3004
```

Verificación: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
(el build de CI usa placeholders de Supabase; nada toca la red).
