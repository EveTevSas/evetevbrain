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

## Correr en local

La consola necesita un Supabase con Auth. El entorno local de EvePay vive en
`apps/api` (Docker, serie de puertos **5732x** para no chocar con la de
EveConecta, que usa 5532x):

```bash
cd apps/api && supabase start        # aplica roles.sql + las 8 migraciones
supabase status                      # muestra API URL y PUBLISHABLE_KEY
```

Con eso, en esta carpeta:

```bash
cp .env.example .env.local           # pega la URL y la publishable key de arriba
pnpm auth:provision-admin --email admin@evetev.com --name "Admin" --password "…"
pnpm --filter @evetev/evepay-admin dev   # → http://localhost:3004
```

`--password` solo funciona contra un Supabase local; contra un proyecto
alojado el script manda la invitación por correo, que es lo correcto ahí.

La API (opcional en Fase A, necesaria desde la B) se levanta contra esa misma
base:

```bash
cd apps/api
DATABASE_URL="postgresql://evepay_api:postgres@127.0.0.1:57322/postgres" \
SUPABASE_URL="http://127.0.0.1:57321" PAYMENT_PROVIDER=fake \
  pnpm exec nest start                   # → http://localhost:3001
```

`SUPABASE_URL` es lo que le permite a la API verificar el JWT de la consola:
Supabase firma con claves asimétricas y la API busca la pública en su JWKS.

Verificación: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
(el build de CI usa placeholders de Supabase; nada toca la red).
