# EveConecta

Vertical de Evetev para gestión y recaudo de propiedad horizontal. Esta aplicación
contiene su frontend, sus Route Handlers y el dominio de conjuntos residenciales.

## Frontera de datos

- El proyecto Supabase remoto se llama `Eveconecta` y pertenece exclusivamente a
  esta vertical.
- EveConecta es propietaria únicamente del schema Postgres `conjuntos`.
- EveConecta nunca consulta ni modifica el schema `evepay`.
- Los cobros se solicitan a EvePay por HTTP. `evepay_cobro_id` es un UUID externo,
  sin llave foránea.
- Cada ambiente tiene datos independientes:

| Ambiente   | Base de datos                                     | Uso                                         |
| ---------- | ------------------------------------------------- | ------------------------------------------- |
| Local      | Supabase CLI en Docker                            | Desarrollo y pruebas con datos ficticios    |
| Preview    | Proyecto/branch de desarrollo, cuando se habilite | Vistas previas de PR, sin datos reales      |
| Producción | Proyecto Supabase `Eveconecta`                    | Datos reales, solo despliegues desde `main` |

Preview nunca debe apuntar a datos productivos. Mientras no exista un proyecto o
branch de preview independiente, los previews no habilitan escrituras de base de
datos. No se versionan referencias, contraseñas ni API keys.

## Levantar la base local

Requisitos: Node 22, pnpm 9, Docker y Supabase CLI.

```bash
cd apps/eveconecta
cp .env.example .env.local
pnpm db:start
pnpm db:status
```

Copiar la `PUBLISHABLE_KEY` mostrada por `pnpm db:status` a
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local`. Después:

```bash
pnpm db:reset
pnpm db:test
pnpm dev
```

Supabase Studio queda disponible en `http://127.0.0.1:55323` y la aplicación en
`http://localhost:3002`.

La serie de puertos `5532x` evita interferir con la instancia Supabase del
monorepo, que usa los puertos predeterminados `5432x`.

## Cambios de esquema

Las migraciones viven en `supabase/migrations` y son la fuente de verdad. Todo
cambio de tablas o permisos debe:

1. quedar en una migración versionada;
2. mantener todas las tablas de tenant dentro de `conjuntos`;
3. incluir RLS y una prueba en `supabase/tests`;
4. pasar `pnpm db:reset`, `pnpm db:lint` y `pnpm db:test`.

Para enlazar un ambiente remoto se usa `supabase link` con la referencia guardada
por el CLI fuera del código. Antes de aplicar una migración remota, confirmar el
proyecto objetivo con `supabase projects list`. Las migraciones productivas nunca
se ejecutan manualmente desde el editor SQL.

Comandos de validación y despliegue:

```bash
pnpm db:migrations:status
pnpm db:deploy
pnpm db:lint:linked
pnpm db:test:linked
```

La configuración remota vigente es:

- Data API: `public`, `graphql_public` y `conjuntos`; máximo 1.000 filas.
- Auth Site URL: `https://conecta.evetev.com`.
- Registro público y usuarios anónimos deshabilitados. Los usuarios se
  aprovisionan mediante invitación.
- Contraseñas de mínimo 12 caracteres con mayúscula, minúscula, número y símbolo.
- Confirmación de correo, OTP de 8 dígitos y enrolamiento TOTP habilitados.
- JWT de una hora.

La configuración local y la variante productiva viven en `supabase/config.toml`.
El bloque `remotes.production` mantiene las URLs productivas sin romper los
redirects de desarrollo. Para sincronizarla:

```bash
supabase config push --project-ref jmwiydbyngqbaieheeeh --yes
```

## Autenticación y autorización

Supabase Auth autentica el correo y la contraseña. La autorización no depende de
metadatos editables del usuario: se resuelve con la membresía activa de
`conjuntos.miembros_conjunto` y se vuelve a aplicar mediante RLS en Postgres.
Las sesiones se almacenan en cookies con `@supabase/ssr`; el Proxy de Next.js
refresca la sesión y protege rutas antes de renderizarlas.

| Sección        | Superadmin | Administración | Consejo | Residente |
| -------------- | :--------: | :------------: | :-----: | :-------: |
| Inicio         |     ✓      |       ✓        |    ✓    |     ✓     |
| Finanzas       |     ✓      |       ✓        |         |     ✓     |
| Presupuesto    |     ✓      |       ✓        |    ✓    |           |
| Comunidad      |     ✓      |       ✓        |         |           |
| Comunicaciones |     ✓      |       ✓        |    ✓    |     ✓     |
| PQRS           |     ✓      |       ✓        |    ✓    |     ✓     |
| Reservas       |     ✓      |       ✓        |    ✓    |     ✓     |
| Portería       |     ✓      |       ✓        |         |     ✓     |
| Mantenimiento  |     ✓      |       ✓        |    ✓    |           |
| Asambleas      |     ✓      |       ✓        |    ✓    |     ✓     |
| Documentos     |     ✓      |       ✓        |    ✓    |     ✓     |
| Auditoría      |     ✓      |       ✓        |         |           |

Los residentes reciben una portada sin indicadores colectivos ni cartera
identificada. Los llamados HTTP de la aplicación envían el JWT de Supabase; no se
aceptan encabezados de identidad o rol definidos por el navegador. La caché
offline queda separada por ID de usuario para evitar cruces en dispositivos
compartidos.

### Aprovisionar un usuario

No se crean contraseñas temporales ni se envían por chat. El comando
administrativo invita por correo y vincula el UUID de Supabase Auth con el rol y
la copropiedad:

```bash
SUPABASE_URL="https://<project-ref>.supabase.co" \
SUPABASE_SECRET_KEY="<sb_secret_...>" \
SUPABASE_INVITE_REDIRECT_URL="https://conecta.evetev.com/auth/callback?next=/actualizar-contrasena" \
pnpm auth:provision-user \
  --email usuario@dominio.com \
  --name "Nombre Apellido" \
  --role admin_conjunto \
  --conjunto-id "<uuid>"
```

Para `--role residente` también es obligatorio `--unidad-id "<uuid>"`. El
aprovisionador crea o reactiva la membresía, enlaza la persona con esa unidad y
registra el evento en la auditoría. La clave secreta se usa solo durante este
comando, en una estación administrativa; no se guarda en `.env.local`, Vercel ni
ningún Client Component.

Antes de enviar invitaciones reales se debe configurar SMTP propio. El servicio
de correo predeterminado de Supabase es únicamente para pruebas y tiene límites
restrictivos.

## Variables de entorno

| Variable                               | Alcance              | Descripción                                      |
| -------------------------------------- | -------------------- | ------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | navegador y servidor | URL de Auth/Data API del ambiente                |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | navegador y servidor | Clave pública; la seguridad depende de RLS       |
| `DATABASE_URL`                         | solo servidor        | Pool de Postgres usado por Drizzle               |
| `NEXT_PUBLIC_API_URL`                  | navegador y servidor | URL HTTP de EvePay                               |
| `SUPABASE_SECRET_KEY`                  | comando puntual      | Atraviesa RLS; solo aprovisionamiento controlado |

La `SUPABASE_SECRET_KEY` no forma parte de la configuración normal de la
aplicación. Los casos de uso con sesión usan `withUserDatabase`, que ejecuta cada
transacción con el rol `authenticated` y la identidad de Supabase.
