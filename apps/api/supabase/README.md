# apps/api/supabase/

Base de datos de EvePay (Postgres administrado en Supabase, §7/§10). Schemas
`identity`, `evepay` y `audit`. El aislamiento por tenant se hace con **RLS**
(§4): el backend ejecuta `SET LOCAL app.tenant_id = '<uuid>'` por transacción y
las políticas filtran por ese valor.

## Levantar la base en local

Requiere Docker y la Supabase CLI. Usa la serie de puertos **5732x** para no
interferir con la instancia de EveConecta (5532x) ni con la de por defecto
(5432x):

```bash
cd apps/api
supabase start     # aplica roles.sql y luego migrations/*.sql
supabase status    # URLs y llaves locales
supabase stop      # al terminar
```

`roles.sql` crea el rol `evepay_api` que las migraciones necesitan para sus
`GRANT`. En los proyectos alojados ese rol se crea a mano una vez (ver abajo);
en local se recrea en cada arranque para que el entorno se levante solo.

Studio queda en `http://127.0.0.1:57323` y la API de Supabase en `:57321`.

## Aplicar las migraciones

Con la **Supabase CLI** (recomendado), enlazando al proyecto de la cuenta:

```bash
# instalar CLI (una vez): brew install supabase/tap/supabase
cd apps/api                              # la CLI se corre desde aquí
supabase link --project-ref <TU_PROJECT_REF>
supabase db push        # aplica apps/api/supabase/migrations/*.sql
```

O corriendo el SQL de `migrations/0001_init_evepay.sql` en el **SQL Editor** de
Supabase.

## Rol de conexión de la API (clave para que RLS funcione)

La API (NestJS + Drizzle) **debe** conectarse con un rol que **respete RLS**:
no el owner de las tablas ni un rol con `BYPASSRLS`. Si conecta como owner, las
políticas se ignoran y el aislamiento no aplica.

Recomendado: crear un rol dedicado (p. ej. `evepay_api`) con `LOGIN`, sin
`BYPASSRLS`, con `USAGE` en el schema `evepay` y privilegios
`SELECT/INSERT/UPDATE` en sus tablas. La `DATABASE_URL` de ese rol va en las
variables de entorno (nunca en el repo, §4).

## Verificar el aislamiento (test a nivel DB)

```sql
-- como rol con RLS activo:
set local app.tenant_id = '<tenant_A>';
select count(*) from evepay.payments;   -- solo filas de A
set local app.tenant_id = '<tenant_B>';
select count(*) from evepay.payments;   -- solo filas de B
```

> El test de aislamiento a nivel de aplicación corre en
> `apps/api` (repositorio in-memory). El de nivel DB (RLS real) se corre aquí
> contra Supabase con el bloque de arriba.
