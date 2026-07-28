# Despliegue

Cómo publicar el monorepo en producción. Complementa la topología de la
constitución (`ESTANDARES_INGENIERIA.md` §10) y las cuentas de
[`INFRAESTRUCTURA_Y_CUENTAS.md`](./INFRAESTRUCTURA_Y_CUENTAS.md).

## Idea clave

Es un **monorepo → dos proyectos en Vercel**, ambos apuntando al mismo repo
`EveTevSas/evetevbrain` pero con **Root Directory distinto**. Cada uno trae su
`vercel.json`, así que la config ya está versionada; en el dashboard solo fijas el
Root Directory y el dominio.

| App | Root Directory | Dominio | Hosting |
|---|---|---|---|
| `website` | `apps/website` | `evetev.com` (+ `www`) | Vercel (estático) |
| `eveconecta` | `apps/eveconecta` | `conecta.evetev.com` | Vercel (Next.js) |
| `api` (EvePay) | `apps/api` | `api.evetev.com` | Railway *(cuando se requiera)* |

---

## 1. Website → `evetev.com`

1. Vercel → **Add New → Project** → importa `EveTevSas/evetevbrain`.
2. **Root Directory:** `apps/website` (botón *Edit*).
3. Framework/build: los deja como están — `apps/website/vercel.json` ya define
   que es estático (sin build, sirve la carpeta).
4. **Deploy.**
5. **Settings → Domains** → agrega `evetev.com` y `www.evetev.com`
   (Vercel redirige `www` → apex automáticamente).

## 2. EveConecta → `conecta.evetev.com`

1. Vercel → **Add New → Project** → el **mismo** repo otra vez.
2. **Root Directory:** `apps/eveconecta`. Framework Next.js (lo detecta;
   `vercel.json` lo confirma). Vercel entiende el pnpm workspace solo.
3. **Environment Variables** (Settings → Environment Variables):
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
   DATABASE_URL
   NEXT_PUBLIC_API_URL
   ```
   > Usa los valores del proyecto Supabase de EveConecta. `DATABASE_URL` es
   > exclusiva del servidor y `NEXT_PUBLIC_API_URL` apunta a EvePay por HTTP.
4. **Deploy** → **Settings → Domains** → agrega `conecta.evetev.com`.

## 3. DNS (en name.com)

Al agregar cada dominio, **Vercel muestra los registros exactos**. Los típicos:

| Tipo | Host | Valor |
|---|---|---|
| `A` | `@` | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |
| `CNAME` | `conecta` | `cname.vercel-dns.com` |

Se ponen en el panel DNS de **name.com** (login `contacto@evetev.com`). Propaga en
minutos–horas; Vercel emite el certificado HTTPS solo. **Usa siempre los valores
que muestre Vercel**, por si cambian.

## 4. Pipeline

- Cada push a una rama con PR levanta un **preview deploy** (URL desechable).
- Merge a `main` → **deploy automático** a producción.
- `main` siempre desplegable; si CI está en rojo, arreglarla es prioridad (§3).

## 5. API de EvePay (a futuro)

Cuando haya que desplegar `apps/api` (NestJS), va en **Railway** con dominio
`api.evetev.com`. La cuenta de Railway se crea en ese momento (ver doc de cuentas).
Secretos (Akua, DB, etc.) en las variables de entorno de Railway, nunca en el repo (§4).
