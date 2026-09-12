-- Tarifas: lo que EvePay le cobra a cada comercio y lo que el proveedor le
-- cobra a EvePay. Spec: specs/evepay/comisiones/ (Fase 6).
--
-- POR QUÉ DOS TABLAS. La del comercio es el contrato con él y va por tenant.
-- La del proveedor es una sola para todos los comercios: ComboPay le cobra a
-- EvePay lo mismo por cada cobro sin importar de quién sea, y EvePay la
-- absorbe de su comisión. Mezclarlas obligaría a repetir la del proveedor en
-- cada comercio y a cambiarla en todos cuando cambie.
--
-- POR QUÉ VERSIONADAS E INMUTABLES. Cada cobro guarda con qué versión de cada
-- tarifa se creó (payments.tarifa_id, payments.tarifa_proveedor_id). Si una
-- versión pudiera editarse, el desglose de un cobro viejo cambiaría al
-- recalcularlo y el libro dejaría de cuadrar con lo que se le pagó al comercio.
-- Cambiar una tarifa es agregar una fila; nunca tocar la anterior.
--
-- EL DINERO SE VALIDA EN LA BASE. Los rangos (bps 0–10 000, fijo ≥ 0) y el IVA
-- (solo 0 % o 19 %) son checks aquí, no solo en la API: una tarifa mal formada
-- no puede entrar aunque llegue por otro camino (CA-8, CA-11).

-- ---------------------------------------------------------------------------
-- Tarifa del comercio: por tenant, con IVA.
-- ---------------------------------------------------------------------------
create table if not exists evepay.tarifas_comercio (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references identity.tenants(id),
  /* Porcentaje en puntos básicos: 290 = 2,90 %. */
  bps           int not null check (bps between 0 and 10000),
  /* Fijo por transacción en centavos, nunca float. */
  fijo_minor    bigint not null check (fijo_minor >= 0),
  /* IVA sobre la comisión. Solo las dos opciones que existen para EvePay. */
  iva_bps       int not null check (iva_bps in (0, 1900)),
  vigente_desde timestamptz not null default now(),
  /* Desempate: dos versiones en la misma transacción comparten now(), y la
     vigente tiene que ser la última que se guardó, no la que salga primero. */
  secuencia     bigint generated always as identity,
  creada_por    text not null,
  creada_en     timestamptz not null default now()
);

create index if not exists tarifas_comercio_vigencia_idx
  on evepay.tarifas_comercio (tenant_id, vigente_desde desc, secuencia desc);

drop trigger if exists tarifas_comercio_inmutable on evepay.tarifas_comercio;
create trigger tarifas_comercio_inmutable before update or delete on evepay.tarifas_comercio
  for each row execute function audit.registro_inmutable();

-- Aislamiento por tenant como el resto de evepay.*: el comercio puede leer su
-- propia tarifa; escribirla solo se puede desde la función admin de abajo.
alter table evepay.tarifas_comercio enable row level security;
drop policy if exists tenant_isolation on evepay.tarifas_comercio;
create policy tenant_isolation on evepay.tarifas_comercio
  using (tenant_id = app_current_tenant());

grant select on evepay.tarifas_comercio to evepay_api;

-- ---------------------------------------------------------------------------
-- Tarifa del proveedor: una por proveedor, de EvePay.
-- ---------------------------------------------------------------------------
create table if not exists evepay.tarifas_proveedor (
  id                        uuid primary key default gen_random_uuid(),
  provider                  text not null check (length(trim(provider)) > 0),
  bps                       int not null check (bps between 0 and 10000),
  fijo_minor                bigint not null check (fijo_minor >= 0),
  /* true: consigna monto − su tarifa. false: consigna el monto y factura
     aparte. Decide contra qué cuenta se asienta el costo (ledger-custodia). */
  descuenta_en_consignacion boolean not null,
  vigente_desde             timestamptz not null default now(),
  secuencia                 bigint generated always as identity,
  creada_por                text not null,
  creada_en                 timestamptz not null default now()
);

create index if not exists tarifas_proveedor_vigencia_idx
  on evepay.tarifas_proveedor (provider, vigente_desde desc, secuencia desc);

drop trigger if exists tarifas_proveedor_inmutable on evepay.tarifas_proveedor;
create trigger tarifas_proveedor_inmutable before update or delete on evepay.tarifas_proveedor
  for each row execute function audit.registro_inmutable();

-- No es de ningún comercio: RLS activo y sin políticas, se entra solo por las
-- funciones SECURITY DEFINER (mismo patrón que audit.admin_actions).
alter table evepay.tarifas_proveedor enable row level security;

-- ---------------------------------------------------------------------------
-- Las tarifas viajan con el cobro (CA-5). Null en los cobros anteriores a esta
-- fase: para ellos comisión y costo son 0, como se asentaron.
-- ---------------------------------------------------------------------------
alter table evepay.payments
  add column if not exists tarifa_id uuid references evepay.tarifas_comercio(id),
  add column if not exists tarifa_proveedor_id uuid references evepay.tarifas_proveedor(id);

-- ---------------------------------------------------------------------------
-- Lectura de la versión vigente. La más reciente cuya vigencia ya empezó.
-- SECURITY DEFINER porque la usan tanto el núcleo (dentro del tenant) como la
-- consola (a través de todos).
-- ---------------------------------------------------------------------------
create or replace function evepay.tarifa_vigente(p_tenant uuid)
returns table (
  id            uuid,
  bps           int,
  fijo_minor    bigint,
  iva_bps       int,
  vigente_desde timestamptz,
  creada_por    text,
  creada_en     timestamptz
)
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  select t.id, t.bps, t.fijo_minor, t.iva_bps, t.vigente_desde, t.creada_por, t.creada_en
  from evepay.tarifas_comercio t
  where t.tenant_id = p_tenant and t.vigente_desde <= now()
  order by t.vigente_desde desc, t.secuencia desc
  limit 1;
$$;

create or replace function evepay.tarifa_proveedor_vigente(p_provider text)
returns table (
  id                        uuid,
  provider                  text,
  bps                       int,
  fijo_minor                bigint,
  descuenta_en_consignacion boolean,
  vigente_desde             timestamptz,
  creada_por                text,
  creada_en                 timestamptz
)
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  select t.id, t.provider, t.bps, t.fijo_minor, t.descuenta_en_consignacion,
         t.vigente_desde, t.creada_por, t.creada_en
  from evepay.tarifas_proveedor t
  where t.provider = p_provider and t.vigente_desde <= now()
  order by t.vigente_desde desc, t.secuencia desc
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Escritura: agrega una versión y deja el rastro con la anterior y la nueva en
-- la MISMA función, así no hay forma de cambiar una tarifa sin auditarla (CA-1).
-- Los checks de la tabla rechazan los valores fuera de rango antes de llegar
-- a la auditoría, y la excepción deshace todo.
-- ---------------------------------------------------------------------------
create or replace function evepay.admin_asignar_tarifa(
  p_tenant     uuid,
  p_bps        int,
  p_fijo_minor bigint,
  p_iva_bps    int,
  p_actor      text
) returns uuid
language plpgsql
security definer
set search_path = evepay, audit, identity, pg_temp
as $$
declare
  v_anterior jsonb;
  v_id       uuid;
begin
  if not exists (select 1 from identity.tenants where id = p_tenant) then
    raise exception 'El comercio % no existe', p_tenant using errcode = 'no_data_found';
  end if;

  select to_jsonb(v) - 'creada_por' into v_anterior
  from evepay.tarifa_vigente(p_tenant) v;

  insert into evepay.tarifas_comercio (tenant_id, bps, fijo_minor, iva_bps, creada_por)
  values (p_tenant, p_bps, p_fijo_minor, p_iva_bps, p_actor)
  returning id into v_id;

  perform audit.registrar_accion_admin(
    p_actor,
    'tarifa.asignar',
    'tenant',
    p_tenant::text,
    jsonb_build_object(
      'anterior', v_anterior,
      'nueva', jsonb_build_object('id', v_id, 'bps', p_bps, 'fijoMinor', p_fijo_minor, 'ivaBps', p_iva_bps)
    )
  );

  return v_id;
end $$;

create or replace function evepay.admin_asignar_tarifa_proveedor(
  p_provider   text,
  p_bps        int,
  p_fijo_minor bigint,
  p_descuenta  boolean,
  p_actor      text
) returns uuid
language plpgsql
security definer
set search_path = evepay, audit, pg_temp
as $$
declare
  v_anterior jsonb;
  v_id       uuid;
begin
  select to_jsonb(v) - 'creada_por' into v_anterior
  from evepay.tarifa_proveedor_vigente(p_provider) v;

  insert into evepay.tarifas_proveedor (provider, bps, fijo_minor, descuenta_en_consignacion, creada_por)
  values (p_provider, p_bps, p_fijo_minor, p_descuenta, p_actor)
  returning id into v_id;

  perform audit.registrar_accion_admin(
    p_actor,
    'tarifa_proveedor.asignar',
    'provider',
    p_provider,
    jsonb_build_object(
      'anterior', v_anterior,
      'nueva', jsonb_build_object(
        'id', v_id, 'bps', p_bps, 'fijoMinor', p_fijo_minor,
        'descuentaEnConsignacion', p_descuenta
      )
    )
  );

  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Historiales para la consola: todas las versiones, la vigente primero.
-- ---------------------------------------------------------------------------
create or replace function evepay.admin_historial_tarifas(p_tenant uuid)
returns table (
  id            uuid,
  bps           int,
  fijo_minor    bigint,
  iva_bps       int,
  vigente_desde timestamptz,
  creada_por    text,
  creada_en     timestamptz
)
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  select t.id, t.bps, t.fijo_minor, t.iva_bps, t.vigente_desde, t.creada_por, t.creada_en
  from evepay.tarifas_comercio t
  where t.tenant_id = p_tenant
  order by t.vigente_desde desc, t.secuencia desc;
$$;

create or replace function evepay.admin_historial_tarifas_proveedor(p_provider text)
returns table (
  id                        uuid,
  provider                  text,
  bps                       int,
  fijo_minor                bigint,
  descuenta_en_consignacion boolean,
  vigente_desde             timestamptz,
  creada_por                text,
  creada_en                 timestamptz
)
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  select t.id, t.provider, t.bps, t.fijo_minor, t.descuenta_en_consignacion,
         t.vigente_desde, t.creada_por, t.creada_en
  from evepay.tarifas_proveedor t
  where t.provider = p_provider
  order by t.vigente_desde desc, t.secuencia desc;
$$;

-- La tarifa vigente de TODOS los comercios, para el listado de la consola
-- (quién está sin tarifa no puede cobrar) y para avisar, al cambiar la del
-- proveedor, a cuántos comercios les quedaría margen negativo.
create or replace function evepay.admin_tarifas_vigentes()
returns table (
  tenant_id     uuid,
  id            uuid,
  bps           int,
  fijo_minor    bigint,
  iva_bps       int,
  vigente_desde timestamptz,
  creada_por    text,
  creada_en     timestamptz
)
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  select distinct on (t.tenant_id)
         t.tenant_id, t.id, t.bps, t.fijo_minor, t.iva_bps, t.vigente_desde, t.creada_por, t.creada_en
  from evepay.tarifas_comercio t
  where t.vigente_desde <= now()
  order by t.tenant_id, t.vigente_desde desc, t.secuencia desc;
$$;

grant execute on function evepay.tarifa_vigente(uuid) to evepay_api;
grant execute on function evepay.admin_tarifas_vigentes() to evepay_api;
grant execute on function evepay.tarifa_proveedor_vigente(text) to evepay_api;
grant execute on function evepay.admin_asignar_tarifa(uuid, int, bigint, int, text) to evepay_api;
grant execute on function evepay.admin_asignar_tarifa_proveedor(text, int, bigint, boolean, text) to evepay_api;
grant execute on function evepay.admin_historial_tarifas(uuid) to evepay_api;
grant execute on function evepay.admin_historial_tarifas_proveedor(text) to evepay_api;
