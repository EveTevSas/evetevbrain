# Infraestructura y cuentas

Servicios que usamos, para qué, y **cómo se inicia sesión** en cada uno. Complementa
la topología de despliegue de `ESTANDARES_INGENIERIA.md` (§10).

> ⚠️ **Aquí NO van secretos.** Este documento registra solo el servicio y el método
> de acceso (SSO / email de la cuenta), nunca contraseñas, tokens ni API keys.
> Los secretos viven en el gestor de cada plataforma (GitHub Actions secrets,
> variables de entorno de Vercel/Railway/Supabase) y `.env` local — jamás en el repo (§4).

## Cuentas y servicios

| Servicio                       | Para qué                                                                                                                                                                                | Inicio de sesión                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **GitHub**                     | Código, monorepo, CI (Actions), fuente de verdad. Org `EveTevSas`, repo `evetevbrain`.                                                                                                  | Cuenta GitHub del equipo                                             |
| **Supabase**                   | Postgres + Auth + RLS. Schemas `evepay` y `conjuntos`; proyecto aparte para EveLedger.                                                                                                  | **Con GitHub** (SSO)                                                 |
| **Vercel**                     | Hosting de los frontends: `website` (evetev.com) y `eveconecta` (conecta.evetev.com).                                                                                                   | **Con GitHub** (SSO)                                                 |
| **Railway**                    | Hosting de la API de EvePay (NestJS, proceso de larga vida).                                                                                                                            | _Cuenta aún no creada — se crea cuando se requiera desplegar la API_ |
| **name.com**                   | Registrador del dominio **evetev.com** y su DNS.                                                                                                                                        | **Con email `contacto@evetev.com`**                                  |
| **Moonshot (Kimi)**            | Motor generador de `apps/eve-studio` y de **Fluxi** (`apps/rag-assistant`). Modelo elegido midiendo: `kimi-k2.6`.                                                                       | Cuenta propia con `MOONSHOT_API_KEY`                                 |
| **Alibaba Cloud Model Studio** | Embeddings de Fluxi (`text-embedding-v4`). _Cuenta aún no creada_ — se abre cuando exista la base documental definitiva, porque los vectores hay que recalcularlos si el corpus cambia. | _Pendiente_                                                          |

## Notas

- **SSO con GitHub:** Supabase y Vercel entran con la cuenta de GitHub. Mantener el
  **2FA de GitHub** activo protege también esas dos plataformas (§8, higiene día uno).
- **name.com** es el único que entra por email/contraseña (`contacto@evetev.com`), no
  por GitHub. Ahí se configuran los registros DNS que apuntan los dominios a Vercel.
- **Correspondencia dominio → app:**
  - `evetev.com` → proyecto Vercel de `apps/website`
  - `conecta.evetev.com` → proyecto Vercel de `apps/eveconecta`
  - `api.evetev.com` → API en Railway (cuando se despliegue)
  - `fluxi.evetev.com` → proyecto Vercel de `apps/rag-assistant` (creado; producción en
    `rag-assistant-ochre.vercel.app`. **Falta el CNAME en name.com**: nombre `fluxi`,
    valor `5202b8778fa8f959.vercel-dns-017.com.`)
  - `apps/eveledger` → proyecto Vercel **sin dominio de marca**: vive en la URL
    `*.vercel.app` que asigna Vercel. Es un MVP para un cliente; el subdominio se
    decide cuando lo apruebe. Su Postgres es un **proyecto Supabase propio**,
    separado de los de EvePay y EveConecta: son datos de un cliente, no de la
    plataforma.
- **Railway:** la cuenta **todavía no existe**; se crea cuando haya que desplegar la API de EvePay. Al crearla, anotar aquí el método de inicio de sesión.
