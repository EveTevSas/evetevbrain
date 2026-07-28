# Infraestructura y cuentas

Servicios que usamos, para qué, y **cómo se inicia sesión** en cada uno. Complementa
la topología de despliegue de `ESTANDARES_INGENIERIA.md` (§10).

> ⚠️ **Aquí NO van secretos.** Este documento registra solo el servicio y el método
> de acceso (SSO / email de la cuenta), nunca contraseñas, tokens ni API keys.
> Los secretos viven en el gestor de cada plataforma (GitHub Actions secrets,
> variables de entorno de Vercel/Railway/Supabase) y `.env` local — jamás en el repo (§4).

## Cuentas y servicios

| Servicio | Para qué | Inicio de sesión |
|---|---|---|
| **GitHub** | Código, monorepo, CI (Actions), fuente de verdad. Org `EveTevSas`, repo `evetevbrain`. | Cuenta GitHub del equipo |
| **Supabase** | Postgres + Auth + RLS. Schemas `evepay` y `conjuntos`. | **Con GitHub** (SSO) |
| **Vercel** | Hosting de los frontends: `website` (evetev.com) y `eveconecta` (conecta.evetev.com). | **Con GitHub** (SSO) |
| **Railway** | Hosting de la API de EvePay (NestJS, proceso de larga vida). | *Cuenta aún no creada — se crea cuando se requiera desplegar la API* |
| **name.com** | Registrador del dominio **evetev.com** y su DNS. | **Con email `contacto@evetev.com`** |

## Notas

- **SSO con GitHub:** Supabase y Vercel entran con la cuenta de GitHub. Mantener el
  **2FA de GitHub** activo protege también esas dos plataformas (§8, higiene día uno).
- **name.com** es el único que entra por email/contraseña (`contacto@evetev.com`), no
  por GitHub. Ahí se configuran los registros DNS que apuntan los dominios a Vercel.
- **Correspondencia dominio → app:**
  - `evetev.com` → proyecto Vercel de `apps/website`
  - `conecta.evetev.com` → proyecto Vercel de `apps/eveconecta`
  - `api.evetev.com` → API en Railway (cuando se despliegue)
- **Railway:** la cuenta **todavía no existe**; se crea cuando haya que desplegar la API de EvePay. Al crearla, anotar aquí el método de inicio de sesión.
