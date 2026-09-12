# Hub de Evetev

Torre de control **de la compañía**, uso interno. No es un módulo de EvePay ni
una vertical: agrega hacia adentro (Global, Portales, Productos, Clientes
unificados, Ingresos & costos, Salud financiera, Equipo & metas, Documentos).
Arquitectura: [`docs/ARQUITECTURA_HUB_EVETEV.md`](../../docs/ARQUITECTURA_HUB_EVETEV.md).
Spec: [`specs/hub/hub-base/`](../../specs/hub/hub-base/).

## Cómo funciona el acceso

- **Google** a través del **proyecto Supabase de EvePay** (una identidad para
  todo el equipo). Entra cualquier cuenta cuyo correo sea de un dominio de
  `HUB_DOMINIOS_PERMITIDOS` (por defecto `evetev.com`), y también quien ya
  tenga rol interno de EvePay (`super_admin` · `ops` · `finanzas`).
- Sin sesión → `/login`; con sesión fuera del dominio → `/sin-acceso`.
- En local, sin credenciales de Google, el login admite correo + contraseña
  (los mismos usuarios de la consola).

## Qué posee y qué consume

| Posee (schema `hub`, rol `hub_app`)             | Consume (solo lectura, HTTP)             |
| ----------------------------------------------- | ---------------------------------------- |
| portales, miembros, metas, logros               | `GET /v1/admin/resumen` de EvePay        |
| costos de proveedores, cierres de mes           | `GET /v1/admin/merchants` (para enlazar) |
| cuentas y enlaces de producto (Cuenta canónica) |                                          |
| auditoría propia                                |                                          |

El rol `hub_app` **no tiene permisos** sobre `evepay`, `identity` ni `audit`:
la frontera la hacen los GRANT de la migración `0024_hub.sql` (en
`apps/api/supabase/migrations/`, porque es el mismo proyecto Supabase y una
sola historia de migraciones). Sin ORM: ocho tablas, consultas planas.

## Correr en local

```bash
cd apps/api && supabase start                   # aplica roles.sql (incluye hub_app) y las migraciones
cd ../hub && cp .env.example .env.local         # URL + publishable key del Supabase local,
                                                #   HUB_DATABASE_URL=postgresql://hub_app:postgres@127.0.0.1:57322/postgres
pnpm --filter @evetev/shared build
pnpm --filter @evetev/hub dev                   # → http://localhost:3005
```

Para los roll-ups, la API de EvePay debe estar arriba (`NEXT_PUBLIC_API_URL`).
Si no responde, el Hub lo dice y sigue mostrando lo suyo.

## Google en Supabase

- **Local:** `apps/api/supabase/config.toml` ya trae `[auth.external.google]`
  con `client_id`/`secret` por variables `SUPABASE_AUTH_EXTERNAL_GOOGLE_*`.
  Sin ellas, el proveedor no arranca y se usa correo + contraseña.
- **Alojado:** en el panel de Supabase → Authentication → Providers → Google,
  con un cliente OAuth de Google Cloud cuya URI de retorno sea
  `https://<ref>.supabase.co/auth/v1/callback`; y en URL Configuration agregar
  `https://<hub>/auth/callback` y `https://<hub>/**` a las redirect URLs.
  Restringe el cliente OAuth al Workspace de Evetev (tipo «Interno»).

## Despliegue

Vercel, proyecto propio apuntando a `apps/hub` (el `vercel.json` cancela
builds cuando la carpeta no cambió). Variables: las de `.env.example`, con
`HUB_DATABASE_URL` hacia el pooler del proyecto alojado como `hub_app` (crear
el rol una vez desde el panel, como `evepay_api`).
