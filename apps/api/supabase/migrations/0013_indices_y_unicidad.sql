-- Índices de los caminos calientes y restricciones que el código ya daba por
-- ciertas. Sale de auditar el esquema (3-sep-2026); cada una arregla algo
-- comprobado con EXPLAIN o con una consulta a los datos, no una sospecha.

-- ---------------------------------------------------------------------------
-- 1. Un comercio por tenant.
--
-- El código lo asume desde hace tiempo: `buscarPorTenant` hace LIMIT 1 y la
-- aprobación de KYC decide sobre "el" merchant del comercio. La base permitía
-- varios y devolvía uno arbitrario, así que aprobar podía tocar uno y cobrar
-- comprobar el otro. Los datos ya cumplen la regla (máximo 1 por tenant); esto
-- solo la vuelve imposible de romper.
-- ---------------------------------------------------------------------------
create unique index if not exists merchants_tenant_uq on evepay.merchants (tenant_id);

/* Mismo caso: OutboundWebhooksRepository.buscarPorTenant asume una sola
   configuración por comercio. */
create unique index if not exists merchant_webhooks_tenant_uq
  on evepay.merchant_webhooks (tenant_id);

-- ---------------------------------------------------------------------------
-- 2. El camino más caliente del sistema: resolver el cobro de un webhook.
--
-- `EXPLAIN` sobre la búsqueda por provider_payment_id daba `Seq Scan`: cada
-- webhook entrante recorría la tabla entera de pagos. No se nota con cien
-- cobros y se vuelve el cuello de botella con cien mil, sin que nada avise.
--
-- Va sobre (provider, provider_payment_id) y no solo sobre el id porque el id
-- lo elige el proveedor: ComboPay usa números de factura cortos (1003455) y
-- Akua cadenas opacas. Con dos adquirencias activas, dos cobros distintos
-- pueden acabar con el mismo identificador, y entonces un webhook aprobaría el
-- cobro equivocado —el de otro comercio—. Único por par, no por id suelto.
-- ---------------------------------------------------------------------------
create unique index if not exists payments_provider_ref_uq
  on evepay.payments (provider, provider_payment_id)
  where provider_payment_id is not null;

-- ---------------------------------------------------------------------------
-- 3. El listado de la consola.
--
-- Pagina por keyset sobre (created_at desc, id desc) y `EXPLAIN` daba
-- `Seq Scan` + `Sort` en cada carga de la pantalla principal de Pagos.
-- ---------------------------------------------------------------------------
create index if not exists payments_listado_idx
  on evepay.payments (created_at desc, id desc);

/* Y el mismo listado filtrado por comercio, que es el uso más frecuente. Este
   índice sustituye a payments_tenant_idx: lo contiene como prefijo, así que
   mantener los dos sería pagar escrituras por nada. */
create index if not exists payments_tenant_listado_idx
  on evepay.payments (tenant_id, created_at desc, id desc);
drop index if exists evepay.payments_tenant_idx;

-- ---------------------------------------------------------------------------
-- 4. Un cobro apunta a un comercio que existe.
--
-- La aplicación ya lo valida, pero la base lo aceptaba. Va como NOT VALID a
-- propósito: hay filas anteriores a esa validación con un merchant_id que no
-- corresponde a ningún comercio (dos, en el entorno local). NOT VALID protege
-- todo lo que se inserte de aquí en adelante sin hacer fallar la migración por
-- basura vieja.
--
-- Para cerrarla del todo, una vez limpias esas filas:
--   ALTER TABLE evepay.payments VALIDATE CONSTRAINT payments_merchant_id_fkey;
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payments_merchant_id_fkey' and conrelid = 'evepay.payments'::regclass
  ) then
    alter table evepay.payments
      add constraint payments_merchant_id_fkey
      foreign key (merchant_id) references evepay.merchants(id) not valid;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. La resolución del webhook pasa a mirar también el proveedor.
--
-- Sustituye a evepay.tenant_of_payment(text), que resolvía solo por el id y
-- por tanto podía devolver el cobro de otro proveedor (ver punto 2).
-- ---------------------------------------------------------------------------
create or replace function evepay.tenant_of_payment(
  p_provider text,
  p_provider_payment_id text
)
returns table (payment_id uuid, tenant_id uuid, status text)
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  select p.id, p.tenant_id, p.status
  from evepay.payments p
  where p.provider = p_provider
    and p.provider_payment_id = p_provider_payment_id
  limit 1;
$$;

grant execute on function evepay.tenant_of_payment(text, text) to evepay_api;

/* La versión de un solo argumento se retira: dejarla accesible es dejar el
   camino que confunde proveedores. */
drop function if exists evepay.tenant_of_payment(text);
