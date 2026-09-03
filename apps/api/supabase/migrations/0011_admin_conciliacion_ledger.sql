-- Conciliación con histórico y vistas de ledger para la consola.
-- Spec: specs/evepay/admin-console/ (CA-19, CA-20, CA-21).

-- ---------------------------------------------------------------------------
-- Histórico de corridas de conciliación (CA-19).
--
-- Una corrida es un HECHO fechado: "el 2 de septiembre, con este rango, salían
-- 3 diferencias". Guardarla permite responder qué se sabía y cuándo, y ver si
-- un descuadre viene arrastrándose. Recalcular el pasado no sirve: los datos
-- de hoy ya no son los de entonces.
--
-- Por eso es inmutable, y por eso `modo` distingue una conciliación real de una
-- que no se pudo hacer porque el proveedor no expone liquidaciones (CA-20):
-- guardar ceros en ese caso simularía un cuadre perfecto que nadie comprobó.
-- ---------------------------------------------------------------------------
create table if not exists evepay.reconciliation_runs (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references identity.tenants(id),
  desde               timestamptz not null,
  hasta               timestamptz not null,
  -- 'automatica' = se cruzó contra el proveedor.
  -- 'no_soportada' = el proveedor no da liquidaciones por API; queda manual.
  modo                text not null check (modo in ('automatica', 'no_soportada')),
  provider            text not null,
  conciliados         int,
  diferencias         int,
  huerfanos_proveedor int,
  no_conciliados      int,
  nota                text,
  actor               text not null,
  corrido_en          timestamptz not null default now()
);

create index if not exists reconciliation_runs_tenant_idx
  on evepay.reconciliation_runs (tenant_id, corrido_en desc);

drop trigger if exists reconciliation_runs_inmutable on evepay.reconciliation_runs;
create trigger reconciliation_runs_inmutable
  before update or delete on evepay.reconciliation_runs
  for each row execute function audit.registro_inmutable();

-- Como la auditoría admin: RLS sin políticas, y solo se entra por las
-- funciones de abajo. Son datos de operación cross-tenant, no del comercio.
alter table evepay.reconciliation_runs enable row level security;

create or replace function evepay.admin_registrar_conciliacion(
  p_tenant      uuid,
  p_desde       timestamptz,
  p_hasta       timestamptz,
  p_modo        text,
  p_provider    text,
  p_conciliados int default null,
  p_diferencias int default null,
  p_huerfanos   int default null,
  p_no_concil   int default null,
  p_nota        text default null,
  p_actor       text default 'sistema'
) returns uuid
language plpgsql
security definer
set search_path = evepay, pg_temp
as $$
declare v_id uuid;
begin
  insert into evepay.reconciliation_runs (
    tenant_id, desde, hasta, modo, provider,
    conciliados, diferencias, huerfanos_proveedor, no_conciliados, nota, actor
  ) values (
    p_tenant, p_desde, p_hasta, p_modo, p_provider,
    p_conciliados, p_diferencias, p_huerfanos, p_no_concil, p_nota, p_actor
  )
  returning id into v_id;
  return v_id;
end $$;

create or replace function evepay.admin_listar_conciliaciones(
  p_tenant uuid default null,
  p_limite int default 50
)
returns table (
  id                  uuid,
  tenant_id           uuid,
  tenant_nombre       text,
  desde               timestamptz,
  hasta               timestamptz,
  modo                text,
  provider            text,
  conciliados         int,
  diferencias         int,
  huerfanos_proveedor int,
  no_conciliados      int,
  nota                text,
  actor               text,
  corrido_en          timestamptz
)
language sql
security definer
set search_path = evepay, identity, pg_temp
stable
as $$
  select r.id, r.tenant_id, t.display_name, r.desde, r.hasta, r.modo, r.provider,
         r.conciliados, r.diferencias, r.huerfanos_proveedor, r.no_conciliados,
         r.nota, r.actor, r.corrido_en
  from evepay.reconciliation_runs r
  join identity.tenants t on t.id = r.tenant_id
  where p_tenant is null or r.tenant_id = p_tenant
  order by r.corrido_en desc
  limit least(greatest(coalesce(p_limite, 50), 1), 200);
$$;

grant execute on function evepay.admin_registrar_conciliacion(
  uuid, timestamptz, timestamptz, text, text, int, int, int, int, text, text
) to evepay_api;
grant execute on function evepay.admin_listar_conciliaciones(uuid, int) to evepay_api;

-- ---------------------------------------------------------------------------
-- Ledger de un comercio (CA-21).
--
-- El saldo se RECONSTRUYE sumando las líneas; no hay ningún campo "saldo" que
-- pudiera quedar desactualizado. Un saldo guardado y un saldo calculado que no
-- coinciden es la clase de bug que se descubre tarde y mal.
--
-- Devuelve también los totales de débito y crédito para poder afirmar que la
-- partida doble cuadra. Si no cuadran, hay un asiento mal construido y eso
-- tiene que verse, no esconderse tras un número bonito.
-- ---------------------------------------------------------------------------
create or replace function evepay.admin_ledger_resumen(p_tenant uuid)
returns table (
  cuenta        text,
  debitos       bigint,
  creditos      bigint,
  saldo_minor   bigint,
  movimientos   bigint
)
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  select
    l.account as cuenta,
    coalesce(sum(l.amount_minor) filter (where l.direction = 'debit'), 0)::bigint  as debitos,
    coalesce(sum(l.amount_minor) filter (where l.direction = 'credit'), 0)::bigint as creditos,
    (coalesce(sum(l.amount_minor) filter (where l.direction = 'debit'), 0)
     - coalesce(sum(l.amount_minor) filter (where l.direction = 'credit'), 0))::bigint as saldo_minor,
    count(*)::bigint as movimientos
  from evepay.ledger_lines l
  where l.tenant_id = p_tenant
  group by l.account
  order by l.account;
$$;

grant execute on function evepay.admin_ledger_resumen(uuid) to evepay_api;

-- Asientos recientes con sus líneas, para ver el detalle de cada movimiento.
create or replace function evepay.admin_ledger_asientos(p_tenant uuid, p_limite int default 50)
returns table (
  id          uuid,
  payment_id  uuid,
  kind        text,
  memo        text,
  posted_at   timestamptz,
  lineas      jsonb,
  cuadra      boolean
)
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  select
    e.id, e.payment_id, e.kind, e.memo, e.posted_at,
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'cuenta', l.account,
               'direccion', l.direction,
               'montoMinor', l.amount_minor
             ) order by l.direction, l.account)
      from evepay.ledger_lines l where l.entry_id = e.id
    ), '[]'::jsonb) as lineas,
    -- Cada asiento, por sí solo, debe tener débitos = créditos.
    coalesce((
      select sum(case when l.direction = 'debit' then l.amount_minor else -l.amount_minor end) = 0
      from evepay.ledger_lines l where l.entry_id = e.id
    ), false) as cuadra
  from evepay.ledger_entries e
  where e.tenant_id = p_tenant
  order by e.posted_at desc
  limit least(greatest(coalesce(p_limite, 50), 1), 200);
$$;

grant execute on function evepay.admin_ledger_asientos(uuid, int) to evepay_api;
