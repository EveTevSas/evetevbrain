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
   que es estático (sin build, sirve la carpeta) más la función serverless del
   formulario (`api/contacto.js`).
4. **Variables de entorno** (Settings → Environment Variables):
   ```
   RESEND_API_KEY       # API key de resend.com (obligatoria para que funcione el formulario)
   # Opcionales — si no se fijan, usan los valores de abajo:
   # CONTACTO_DESTINO=contacto@evetev.com
   # CONTACTO_REMITENTE=Web Evetev <web@send.evetev.com>
   ```
   > El formulario envía desde `web@send.evetev.com`. Para que Resend pueda usar
   > ese subdominio hay que verificarlo: en Resend → Domains → agregar
   > `send.evetev.com` → copiar los registros TXT/CNAME que da → ponerlos en
   > name.com **antes** de activar el formulario en producción.
5. **Deploy.**
6. **Settings → Domains** → agrega `evetev.com` y `www.evetev.com`
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

## 5. API de EvePay → `api.evetev.com` (Railway)

`apps/api` (NestJS) va en **Railway**. Trae un **`Dockerfile`** (en `apps/api/`) que
compila todo el workspace pnpm de forma determinista (build de `@evetev/shared` +
`@evetev/api`), así el despliegue no depende de la autodetección del builder.

### Pasos en el panel de Railway

1. Railway → **New Project → Deploy from GitHub repo** → `EveTevSas/evetevbrain`.
2. En el servicio → **Settings**:
   - **Root Directory:** *(vacío / raíz)* — el contexto de build debe ser la raíz
     del monorepo para resolver el workspace.
   - **Build → Dockerfile Path:** `apps/api/Dockerfile`.
   - Railway detecta el `Dockerfile` y lo usa (ignora Nixpacks).
3. **Variables** (Settings → Variables) — nunca en el repo (§4):
   ```
   DATABASE_URL          # rol evepay_api del proyecto Supabase de EvePay (pooler :6543)
   PAYMENT_PROVIDER=fake # 'akua' cuando lleguen las llaves ak_test_
   # AKUA_API_KEY        # al integrar Akua
   # AKUA_WEBHOOK_SECRET # al integrar webhooks de Akua
   ```
   > `PORT` lo inyecta Railway automáticamente; `main.ts` lo lee (fallback `API_PORT`, luego 3001).
4. **Deploy.** Cuando esté verde: **Settings → Networking → Generate Domain** (URL
   `*.up.railway.app`) para probar, y luego **Custom Domain** → `api.evetev.com`
   (agrega el CNAME que muestre Railway en **name.com**).
5. **Health check:** `GET /v1/health` → `{"status":"ok","service":"evepay-api"}`.
   Opcional: fijarlo como *Healthcheck Path* en Railway.

### Notas
- La DB de EvePay vive en su **propio** proyecto Supabase (separada de la vertical
  EveConecta, §8). El `DATABASE_URL` usa el rol `evepay_api` (respeta RLS; NO owner
  ni BYPASSRLS).
- El pipeline es igual que Vercel: push a `main` → deploy automático.
