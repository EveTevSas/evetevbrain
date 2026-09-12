-- Resumen por comercio para el listado de la consola: ciudad, volumen del
-- mes, lo que se le debe, si tiene tarifa y cuánto riesgo tiene encima. Solo
-- lectura; las cifras salen de cobros, ledger y retenciones.
create or replace function evepay.admin_comercios_resumen()
returns table (
  tenant_id            uuid,
  ciudad               text,
  volumen_mes_minor    bigint,
  cobros_mes           int,
  por_pagar_minor      bigint,
  tiene_tarifa         boolean,
  retenciones_activas  int,
  retenidas_riesgo_30d int
)
language sql
security definer
set search_path = evepay, identity, pg_temp
stable
as $$
  with mes as (select date_trunc('month', (now() at time zone 'America/Bogota')::date::timestamp) as inicio)
  select t.id,
         pf.ciudad,
         coalesce((select sum(p.amount_minor) from evepay.payments p where p.tenant_id = t.id
                   and p.status in ('aprobado', 'conciliado')
                   and (p.created_at at time zone 'America/Bogota') >= (select inicio from mes)), 0)::bigint,
         (select count(*)::int from evepay.payments p where p.tenant_id = t.id
                   and p.status in ('aprobado', 'conciliado')
                   and (p.created_at at time zone 'America/Bogota') >= (select inicio from mes)),
         coalesce((select sum(case when l.direction = 'credit' then l.amount_minor else -l.amount_minor end)
                   from evepay.ledger_lines l where l.tenant_id = t.id and l.account like 'merchant_payable:%'), 0)::bigint,
         exists (select 1 from evepay.tarifas_comercio tc where tc.tenant_id = t.id),
         (select count(*)::int from evepay.retenciones r where r.tenant_id = t.id and r.liberada_en is null and r.tipo in ('primer_cobro', 'riesgo')),
         (select count(*)::int from evepay.evaluaciones_riesgo e where e.tenant_id = t.id and e.decision <> 'permitir'
                 and e.creada_en > now() - interval '30 days')
  from identity.tenants t
  left join identity.perfil_comercio pf on pf.tenant_id = t.id;
$$;

grant execute on function evepay.admin_comercios_resumen() to evepay_api;
