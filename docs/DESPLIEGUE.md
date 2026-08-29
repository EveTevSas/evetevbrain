# Despliegue

Cómo publicar el monorepo en producción. Complementa la topología de la
constitución (`ESTANDARES_INGENIERIA.md` §10) y las cuentas de
[`INFRAESTRUCTURA_Y_CUENTAS.md`](./INFRAESTRUCTURA_Y_CUENTAS.md).

## Idea clave

Es un **monorepo → muchos proyectos en Vercel**, todos apuntando al mismo repo
`EveTevSas/evetevbrain` pero con **Root Directory distinto**. Cada uno trae su
`vercel.json`, así que la config ya está versionada; en el dashboard solo fijas el
Root Directory y el dominio.

La tabla de abajo recoge las apps con dominio de marca, no todas: hoy hay una
decena de proyectos, contando las landings y las apps sin dominio propio. Cada
push los dispara a todos, y por eso el `ignoreCommand` de cada `vercel.json` no
es opcional (ver el README de la raíz).

| App            | Root Directory    | Dominio                              | Hosting                        |
| -------------- | ----------------- | ------------------------------------ | ------------------------------ |
| `website`      | `apps/website`    | `evetev.com` (+ `www`)               | Vercel (estático)              |
| `eveconecta`   | `apps/eveconecta` | `conecta.evetev.com`                 | Vercel (Next.js)               |
| `eveledger`    | `apps/eveledger`  | _sin dominio propio, `*.vercel.app`_ | Vercel (Next.js)               |
| `api` (EvePay) | `apps/api`        | `api.evetev.com`                     | Railway _(cuando se requiera)_ |

---

## 1. Website → `evetev.com`

1. Vercel → **Add New → Project** → importa `EveTevSas/evetevbrain`.
2. **Root Directory:** `apps/website` (botón _Edit_).
3. Framework/build: los deja como están — `apps/website/vercel.json` ya define
   que es estático (sin build, sirve la carpeta) más la función serverless del
   formulario (`api/contacto.js`).
   > Esa función es el buzón de **toda** la marca. Las tres landings de
   > producto —`/evepay`, `/conecta`, `/intelligence`— son rutas de este mismo
   > proyecto desde que dejaron sus subdominios, así que sus demos llegan al
   > endpoint sin CORS de por medio. La lista de orígenes de
   > `apps/website/api/contacto.js` solo hace falta para un dominio nuevo o
   > para los subdominios viejos mientras sigan redirigiendo.
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

## 1 bis. Las landings de producto → rutas de `evetev.com`

`/evepay`, `/conecta` e `/intelligence` **no son proyectos aparte**: son
carpetas de `apps/website` (`evepay/`, `conecta/`, `intelligence/`) y se
despliegan con el sitio. No hay nada que configurar en Vercel para ellas.

Antes cada una era su propio proyecto, con su subdominio. Se unificaron por tres
razones: la autoridad de dominio deja de repartirse entre cuatro sitios; un push
gasta un despliegue del cupo diario en vez de cuatro; y el formulario de demo
deja de ser cross-origin, así que ya no depende de que alguien acuerde de añadir
un dominio a la lista de CORS.

**Retirar los subdominios viejos.** La redirección **no** se pone en el panel:
vive en `apps/website/vercel.json`, en reglas condicionadas por host
(`has: [{ "type": "host", … }]`) que mandan cualquier ruta del subdominio viejo
a la landing nueva con un 308. En código se revisa en un PR y se ve en el
`git blame`; en un campo del panel no la ve nadie hasta que falla.

> Y en el panel **no se podría**, aunque se quisiera. El campo «Redirect to» de
> un dominio solo acepta otro dominio del mismo proyecto, no una URL con ruta:
> la API responde _«Unable to redirect to https://evetev.com/evepay, because
> that domain is not added to the project»_. Lo máximo que da el panel es mandar
> el subdominio a la portada, que no es lo que se quiere.

> **Cada host necesita DOS reglas, `/` y `/:ruta*`.** `/:ruta*` no casa con la
> raíz. Con solo esa regla, `evepay.evetev.com/lo-que-sea` redirigía bien y
> `evepay.evetev.com` a secas servía la portada corporativa con un `200` — que
> es peor que un error, porque parece que funciona. Se descubrió en producción,
> probando las dos URL por separado; probar solo la raíz, o solo una ruta, no
> lo habría encontrado.

Con eso ya desplegado, quedan dos pasos:

1. **Borrar los tres proyectos viejos.** Al borrarlos sueltan sus dominios; el
   único hueco es el minuto entre eso y el paso 2.

   | Proyecto           | Root Directory (así se identifica)       | Dominio                      |
   | ------------------ | ---------------------------------------- | ---------------------------- |
   | `evepay`           | `apps/evepay` — ya no existe             | `evepay.evetev.com`          |
   | `eveconecta`       | `apps/eveconecta-landing` — ya no existe | `eveconecta.evetev.com`      |
   | `eve-intelligence` | `apps/eve-intelligence` — ya no existe   | `eveintelligence.evetev.com` |

   > **Cuidado con `eveconecta`.** Ese nombre es el de la _landing_. El portal de
   > residentes es el proyecto **`evetevbrain-eveconecta`** (Root Directory
   > `apps/eveconecta`), y ese no se toca: borrarlo tumba `conecta.evetev.com`.
   > El Root Directory es el único campo que los distingue sin lugar a dudas.

2. **Adjuntar los tres dominios al proyecto `website`**, sin marcar nada más —la
   redirección ya la hace `vercel.json`—:

   ```bash
   vercel domains add evepay.evetev.com website --scope evetev
   vercel domains add eveconecta.evetev.com website --scope evetev
   vercel domains add eveintelligence.evetev.com website --scope evetev
   ```

3. En Search Console, pedir la reindexación de las tres rutas nuevas.

> El DNS no cambia: los `CNAME` de esos hosts siguen apuntando a Vercel; lo que
> cambia es qué proyecto los reclama.

> **`conecta.evetev.com` no se toca.** Ese es el portal de residentes
> (`apps/eveconecta`), no la landing. Se parecen y no son lo mismo.

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

## 2 bis. EveLedger → `*.vercel.app`

EveLedger es el MVP de operación diaria de estaciones de servicio. **No lleva
dominio propio todavía**: se despliega en la URL que asigna Vercel y el
subdominio se decide cuando el cliente lo apruebe. Por eso este paso no toca DNS.

1. Vercel → **Add New → Project** → el **mismo** repo.
2. **Root Directory:** `apps/eveledger`. Framework Next.js;
   `apps/eveledger/vercel.json` lo confirma y trae el `ignoreCommand` que evita
   reconstruir cuando el commit no toca la carpeta.
3. **Base de datos:** proyecto **Supabase propio de EveLedger**, separado de los
   de EvePay y EveConecta. Motivo: los datos son de **un cliente** (una estación
   de servicio), no de la plataforma; mezclarlos con `evepay` o `conjuntos`
   ataría la operación de un cliente al ciclo de vida de la plataforma.
4. **Environment Variables** (Settings → Environment Variables):
   ```
   DATABASE_URL   # transaction pooler de Supabase (:6543) — ver la tabla del paso 5
   AUTH_SECRET    # secreto de la cookie de sesión: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   > `ADMIN_EMAIL` y `ADMIN_PASSWORD` **no van en Vercel**: solo los lee la
   > semilla (`db:sembrar`), que se corre una vez desde local contra la base de
   > producción. Ponerlos en Vercel sería dejar la contraseña de administrador
   > en el entorno de todas las funciones sin que nada la use.
5. **Migraciones y semilla** (una sola vez, desde local). Pon los valores de
   producción en `apps/eveledger/.env.produccion` —lo ignora git, y al ir aparte
   el `.env` de desarrollo se queda apuntando a tu Postgres local:

   ```bash
   # apps/eveledger/.env.produccion
   DATABASE_URL="postgresql://postgres.<ref>:<contraseña>@aws-0-<región>.pooler.supabase.com:5432/postgres"
   ADMIN_EMAIL="..."          # con esto se entra a la app
   ADMIN_PASSWORD="..."       # ídem; NO dejar los de .env.example
   SEMILLA_EJEMPLOS=0         # sin productos ni clientes de mentira
   ```

   ```bash
   cd apps/eveledger
   set -a && . ./.env.produccion && set +a   # dotenv no pisa lo ya exportado
   pnpm exec prisma migrate deploy           # crea las tablas
   pnpm exec prisma db seed                  # crea el usuario administrador
   ```

   `SEMILLA_EJEMPLOS=0` importa: por defecto la semilla crea productos y
   **clientes de cartera inventados** ("Transportes SA", "ACUAEXPRESS"), que en
   la base de una estación real son basura dentro de su cartera. El default los
   deja puestos para que un clon nuevo arranque con algo que mirar.

   **Usa el _session pooler_ para migrar**, no el transaction pooler ni la
   directa. Supabase ofrece tres cadenas y cada una sirve para algo distinto:

   | Cadena                 | Puerto | Host                                 | Para qué                                    |
   | ---------------------- | ------ | ------------------------------------ | ------------------------------------------- |
   | Directa                | 5432   | `db.<ref>.supabase.co`               | Nada aquí: es **IPv6 salvo add-on de pago** |
   | **Session pooler**     | 5432   | `aws-0-<región>.pooler.supabase.com` | **Migrar y sembrar desde local**            |
   | **Transaction pooler** | 6543   | `aws-0-<región>.pooler.supabase.com` | **La app en Vercel** (`DATABASE_URL`)       |

   El transaction pooler no sirve para migrar: reparte la conexión por
   transacción, y el DDL de `migrate deploy` necesita sesión. La directa sí
   valdría, pero **las conexiones directas son IPv6 por defecto** y desde una red
   IPv4 no conectan sin contratar el add-on de IPv4; el session pooler es la
   alternativa IPv4 y mantiene una conexión por cliente, que es lo que el DDL
   pide. Dos trampas que costaron varios intentos la primera vez:

   - **Copiar la cadena de Vercel y olvidar el puerto.** Las dos del pooler solo
     se diferencian en `:6543` vs `:5432`. Pegada tal cual, `migrate deploy`
     apunta al pooler de transacción y falla por el DDL.
   - **La contraseña sin percent-encodear.** Si lleva `@`, `:`, `/`, `?` o `#`,
     hay que sustituirlos (`/` → `%2F`, `@` → `%40`, …) **en todas** sus
     apariciones, y en los dos sitios: Vercel y este archivo. Una `/` cruda corta
     la URL ahí mismo y el driver lee como base de datos lo que venía después.
     Si la contraseña tiene varios, es más rápido resetearla en Supabase por una
     de solo letras y números.

6. **Deploy.** No hay paso de dominio: la URL de producción es la que da Vercel.

> El build **no necesita la base**: todas las rutas son `force-dynamic` y
> `prisma generate` solo lee el schema. Si un día una página se prerenderiza
> contra Postgres, el build empezará a depender de `DATABASE_URL` y el job
> `EveLedger` del CI —que corre sin ella— lo va a delatar antes que Vercel.

## 3. DNS (en name.com)

Al agregar cada dominio, **Vercel muestra los registros exactos**. Los típicos:

| Tipo    | Host      | Valor                  |
| ------- | --------- | ---------------------- |
| `A`     | `@`       | `76.76.21.21`          |
| `CNAME` | `www`     | `cname.vercel-dns.com` |
| `CNAME` | `conecta` | `cname.vercel-dns.com` |

Se ponen en el panel DNS de **name.com** (login `contacto@evetev.com`). Propaga en
minutos–horas; Vercel emite el certificado HTTPS solo. **Usa siempre los valores
que muestre Vercel**, por si cambian.

> **`www.evetev.com` está sin hacer, pese a la fila de arriba.** Hoy (28-ago-2026)
> no resuelve —`dig www.evetev.com` no devuelve nada— y el dominio tampoco está
> adjunto al proyecto `website`. Quien teclee `www.evetev.com` no llega a
> ninguna parte: no es una redirección lenta, es un error de DNS del navegador.
> Esta tabla describía la intención, no lo que hay; ojo con leerla como
> inventario.
>
> Arreglarlo son dos pasos, y el orden da igual:
>
> 1. En name.com, crear el `CNAME` de `www` a `cname.vercel-dns.com`.
> 2. `vercel domains add www.evetev.com website --scope evetev`. Vercel redirige
>    `www` al apex por su cuenta en cuanto los dos están en el mismo proyecto.
>
> El apex resuelve hoy a `216.198.79.1`, no al `76.76.21.21` de la tabla: Vercel
> cambió de IP. Otra razón para pedirle a Vercel los valores en el momento.

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
   - **Root Directory:** _(vacío / raíz)_ — el contexto de build debe ser la raíz
     del monorepo para resolver el workspace.
   - **Build → Dockerfile Path:** `apps/api/Dockerfile`.
   - Railway detecta el `Dockerfile` y lo usa (ignora Nixpacks).
3. **Variables** (Settings → Variables) — nunca en el repo (§4):
   ```
   DATABASE_URL          # rol evepay_api del proyecto Supabase de EvePay (pooler :6543)
   PAYMENT_PROVIDER=fake # 'akua' cuando lleguen las llaves
   # ── Variables de Akua (agregar cuando lleguen las llaves del dashboard) ──
   # AKUA_CLIENT_ID      # client_id para OAuth2 (del dashboard de Akua)
   # AKUA_CLIENT_SECRET  # client_secret para OAuth2 (del dashboard de Akua)
   # AKUA_WEBHOOK_SECRET # Secreto del webhook; formato: whsec_<base64>
   # AKUA_BASE_URL       # Omitir en producción; sandbox: https://sandbox.akua.la
   ```
   > `PORT` lo inyecta Railway automáticamente; `main.ts` lo lee (fallback `API_PORT`, luego 3001).
   > Cuando lleguen las llaves: cambia `PAYMENT_PROVIDER=akua` y agrega las 3 vars de Akua.
4. **Deploy.** Cuando esté verde: **Settings → Networking → Generate Domain** (URL
   `*.up.railway.app`) para probar, y luego **Custom Domain** → `api.evetev.com`
   (agrega el CNAME que muestre Railway en **name.com**).
5. **Health check:** `GET /v1/health` → `{"status":"ok","service":"evepay-api"}`.
   Opcional: fijarlo como _Healthcheck Path_ en Railway.

### Notas

- La DB de EvePay vive en su **propio** proyecto Supabase (separada de la vertical
  EveConecta, §8). El `DATABASE_URL` usa el rol `evepay_api` (respeta RLS; NO owner
  ni BYPASSRLS).
- El pipeline es igual que Vercel: push a `main` → deploy automático.
