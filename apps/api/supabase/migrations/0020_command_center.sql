-- Command Center y reportes (Fase 10). Solo lecturas: cifras reales desde
-- cobros, ledger, consignaciones, lotes y riesgo. Va después de las Fases
-- 6–9 porque antes no había de dónde sacarlas.

-- ---------------------------------------------------------------------------
-- El resumen operativo de la portada. Una sola fila; todo en la unidad mínima
-- y con el día y el mes en hora de Colombia.
-- ---------------------------------------------------------------------------
create or replace function evepay.admin_resumen()
returns table (
  volumen_hoy_minor        bigint,
  cobros_hoy               int,
  volumen_mes_minor        bigint,
  cobros_mes               int,
  aprobacion_mes_pct       numeric,
  comision_mes_minor       bigint,
  costo_mes_minor          bigint,
  margen_mes_minor         bigint,
  iva_mes_minor            bigint,
  por_pagar_minor          bigint,
  retenido_minor           bigint,
  en_recaudo_minor         bigint,
  en_transito_minor        bigint,
  pendientes_consignar     int,
  pendientes_consignar_minor bigint,
  lotes_abiertos           int,
  cola_riesgo              int,
  comercios_activos        int,
  comercios_sin_tarifa     int,
  comercios_sin_kyc        int,
  asientos_descuadrados    int
)
language sql
security definer
set search_path = evepay, identity, pg_temp
stable
as $$
  with hoy as (select (now() at time zone 'America/Bogota')::date as d),
  mes as (select date_trunc('month', (select d from hoy)::timestamp) as inicio),
  pagos as (
    select p.*, (p.created_at at time zone 'America/Bogota') as creado_local
    from evepay.payments p
  ),
  saldos as (
    select l.account,
           coalesce(sum(case when l.direction = 'debit' then l.amount_minor else 0 end), 0)::bigint as deb,
           coalesce(sum(case when l.direction = 'credit' then l.amount_minor else 0 end), 0)::bigint as cred
    from evepay.ledger_lines l group by l.account
  ),
  ledger_mes as (
    select l.account,
           coalesce(sum(case when l.direction = 'debit' then l.amount_minor else 0 end), 0)::bigint as deb,
           coalesce(sum(case when l.direction = 'credit' then l.amount_minor else 0 end), 0)::bigint as cred
    from evepay.ledger_lines l join evepay.ledger_entries e on e.id = l.entry_id
    where (e.posted_at at time zone 'America/Bogota') >= (select inicio from mes)
    group by l.account
  )
  select
    coalesce((select sum(amount_minor) from pagos where status in ('aprobado','conciliado') and creado_local::date = (select d from hoy)), 0)::bigint,
    (select count(*)::int from pagos where status in ('aprobado','conciliado') and creado_local::date = (select d from hoy)),
    coalesce((select sum(amount_minor) from pagos where status in ('aprobado','conciliado') and creado_local >= (select inicio from mes)), 0)::bigint,
    (select count(*)::int from pagos where status in ('aprobado','conciliado') and creado_local >= (select inicio from mes)),
    (select case when count(*) = 0 then null
                 else round(100.0 * count(*) filter (where status in ('aprobado','conciliado')) / count(*), 1) end
     from pagos where status in ('aprobado','conciliado','fallido') and creado_local >= (select inicio from mes)),
    coalesce((select sum(cred - deb) from ledger_mes where account = 'comision:evepay'), 0)::bigint,
    coalesce((select sum(deb - cred) from ledger_mes where account like 'costo_proveedor:%'), 0)::bigint,
    (coalesce((select sum(cred - deb) from ledger_mes where account = 'comision:evepay'), 0)
     - coalesce((select sum(deb - cred) from ledger_mes where account like 'costo_proveedor:%'), 0))::bigint,
    coalesce((select sum(cred - deb) from ledger_mes where account = 'iva_por_pagar'), 0)::bigint,
    coalesce((select sum(cred - deb) from saldos where account like 'merchant_payable:%'), 0)::bigint,
    coalesce((select sum(cred - deb) from saldos where account like 'retenido:%'), 0)::bigint,
    coalesce((select sum(deb - cred) from saldos where account in ('recaudo', 'banco')), 0)::bigint,
    coalesce((select sum(deb - cred) from saldos where account like 'clearing:%' or account like '%\_clearing'), 0)::bigint,
    (select count(*)::int from pagos p where p.status = 'aprobado' and not exists (select 1 from evepay.consignacion_cobros c where c.payment_id = p.id)),
    coalesce((select sum(p.amount_minor) from pagos p where p.status = 'aprobado' and not exists (select 1 from evepay.consignacion_cobros c where c.payment_id = p.id)), 0)::bigint,
    (select count(*)::int from evepay.lotes_dispersion where estado in ('programado', 'aprobado')),
    (select count(*)::int from evepay.retenciones where tipo = 'riesgo' and liberada_en is null),
    (select count(*)::int from identity.tenants where status = 'activo'),
    (select count(*)::int from identity.tenants t where t.status = 'activo' and not exists (select 1 from evepay.tarifas_comercio tc where tc.tenant_id = t.id)),
    (select count(*)::int from identity.tenants t where t.status = 'activo' and not exists (select 1 from evepay.merchants m where m.tenant_id = t.id and m.status = 'aprobado')),
    (select count(*)::int from evepay.ledger_entries e
     where coalesce((select sum(case when l.direction = 'debit' then l.amount_minor else -l.amount_minor end) from evepay.ledger_lines l where l.entry_id = e.id), 0) <> 0);
$$;

grant execute on function evepay.admin_resumen() to evepay_api;

-- ---------------------------------------------------------------------------
-- Estado de cuenta del comercio: cada línea del ledger en el periodo, con el
-- asiento y el cobro al que pertenece. Lo que se le muestra al comercio.
-- ---------------------------------------------------------------------------
create or replace function evepay.admin_estado_cuenta(p_tenant uuid, p_desde date, p_hasta date)
returns table (
  posted_at   timestamptz,
  entry_id    uuid,
  kind        text,
  memo        text,
  payment_id  uuid,
  reference   text,
  cuenta      text,
  direction   text,
  amount_minor bigint
)
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  select e.posted_at, e.id, e.kind, e.memo, e.payment_id, p.reference, l.account, l.direction, l.amount_minor
  from evepay.ledger_entries e
  join evepay.ledger_lines l on l.entry_id = e.id
  left join evepay.payments p on p.id = e.payment_id
  where e.tenant_id = p_tenant
    and (e.posted_at at time zone 'America/Bogota') >= p_desde::timestamp
    and (e.posted_at at time zone 'America/Bogota') < (p_hasta + 1)::timestamp
  order by e.posted_at, e.id, l.direction desc, l.account;
$$;

grant execute on function evepay.admin_estado_cuenta(uuid, date, date) to evepay_api;

-- ---------------------------------------------------------------------------
-- Reporte fiscal del mes, por comercio: base (cobros aprobados o conciliados
-- creados en el mes), comisión, IVA de la comisión y costo del proveedor
-- asentados en el mes. Lo que el contador necesita para el IVA y para ver el
-- margen; las retenciones (ReteFuente, ReteIVA, ReteICA) siguen sin modelar.
-- ---------------------------------------------------------------------------
create or replace function evepay.admin_reporte_fiscal(p_mes date)
returns table (
  tenant_id     uuid,
  tenant_nombre text,
  documento     text,
  cobros        int,
  base_minor    bigint,
  comision_minor bigint,
  iva_minor     bigint,
  costo_minor   bigint,
  margen_minor  bigint
)
language sql
security definer
set search_path = evepay, identity, pg_temp
stable
as $$
  with lim as (
    select date_trunc('month', p_mes::timestamp) as inicio,
           date_trunc('month', p_mes::timestamp) + interval '1 month' as fin
  ),
  cobros as (
    select p.tenant_id, count(*)::int as n, coalesce(sum(p.amount_minor), 0)::bigint as base
    from evepay.payments p, lim
    where p.status in ('aprobado', 'conciliado')
      and (p.created_at at time zone 'America/Bogota') >= lim.inicio
      and (p.created_at at time zone 'America/Bogota') < lim.fin
    group by p.tenant_id
  ),
  libro as (
    select l.tenant_id,
           coalesce(sum(case when l.account = 'comision:evepay' then (case when l.direction = 'credit' then l.amount_minor else -l.amount_minor end) else 0 end), 0)::bigint as comision,
           coalesce(sum(case when l.account = 'iva_por_pagar' then (case when l.direction = 'credit' then l.amount_minor else -l.amount_minor end) else 0 end), 0)::bigint as iva,
           coalesce(sum(case when l.account like 'costo_proveedor:%' then (case when l.direction = 'debit' then l.amount_minor else -l.amount_minor end) else 0 end), 0)::bigint as costo
    from evepay.ledger_lines l join evepay.ledger_entries e on e.id = l.entry_id, lim
    where (e.posted_at at time zone 'America/Bogota') >= lim.inicio
      and (e.posted_at at time zone 'America/Bogota') < lim.fin
    group by l.tenant_id
  )
  select t.id, t.display_name,
         (select pf.tipo_documento || ' ' || pf.numero_documento || coalesce('-' || pf.digito_verificacion, '') from identity.perfil_comercio pf where pf.tenant_id = t.id),
         coalesce(c.n, 0), coalesce(c.base, 0), coalesce(lb.comision, 0), coalesce(lb.iva, 0), coalesce(lb.costo, 0),
         (coalesce(lb.comision, 0) - coalesce(lb.costo, 0))::bigint
  from identity.tenants t
  left join cobros c on c.tenant_id = t.id
  left join libro lb on lb.tenant_id = t.id
  where coalesce(c.n, 0) > 0 or coalesce(lb.comision, 0) <> 0 or coalesce(lb.iva, 0) <> 0 or coalesce(lb.costo, 0) <> 0
  order by coalesce(c.base, 0) desc, t.display_name;
$$;

grant execute on function evepay.admin_reporte_fiscal(date) to evepay_api;
