-- Fase 9, pantalla Riesgo: cifras del día para la cabecera y, por regla, cuántas
-- veces disparó hoy y cuántas de sus retenciones se terminaron liberando (la
-- medida honesta de falsos positivos: alguien revisó y dijo «estaba bien»).
-- Solo lectura. El día es el de Bogotá, como en admin_resumen (0020).

drop function if exists evepay.admin_listar_reglas_riesgo();
create or replace function evepay.admin_listar_reglas_riesgo()
returns table (
  id uuid, nombre text, tipo text, tenant_id uuid, tenant_nombre text, parametros jsonb, accion text, modo text,
  prioridad int, creada_por text, creada_en timestamptz, actualizada_por text, actualizada_en timestamptz,
  disparos_30d bigint, disparos_hoy bigint, retenciones_30d bigint, liberadas_30d bigint
)
language sql
security definer
set search_path = evepay, identity, pg_temp
stable
as $$
  with hoy as (select (now() at time zone 'America/Bogota')::date as d),
  disparos as (
    select (d->>'id')::uuid as regla_id, e.id as evaluacion_id, e.creada_en
    from evepay.evaluaciones_riesgo e
    cross join lateral jsonb_array_elements(e.reglas_disparadas) d
    where e.creada_en > now() - interval '30 days'
  )
  select r.id, r.nombre, r.tipo, r.tenant_id, t.display_name, r.parametros, r.accion, r.modo, r.prioridad,
         r.creada_por, r.creada_en, r.actualizada_por, r.actualizada_en,
         (select count(*) from disparos x where x.regla_id = r.id),
         (select count(*) from disparos x
          where x.regla_id = r.id and (x.creada_en at time zone 'America/Bogota')::date = (select d from hoy)),
         (select count(*) from disparos x
          join evepay.retenciones ret on ret.evaluacion_id = x.evaluacion_id and ret.tipo = 'riesgo'
          where x.regla_id = r.id),
         (select count(*) from disparos x
          join evepay.retenciones ret on ret.evaluacion_id = x.evaluacion_id and ret.tipo = 'riesgo'
          where x.regla_id = r.id and ret.liberada_en is not null)
  from evepay.reglas_riesgo r
  left join identity.tenants t on t.id = r.tenant_id
  order by (r.tenant_id is null) desc, r.prioridad, r.nombre;
$$;

grant execute on function evepay.admin_listar_reglas_riesgo() to evepay_api;

create or replace function evepay.admin_resumen_riesgo()
returns table (
  evaluadas_hoy   int,
  rechazadas_hoy  int,
  retenidas_hoy   int,
  en_cola         int,
  shadow_hoy      int
)
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  with hoy as (select (now() at time zone 'America/Bogota')::date as d),
  e as (
    select * from evepay.evaluaciones_riesgo
    where (creada_en at time zone 'America/Bogota')::date = (select d from hoy)
  )
  select
    (select count(*)::int from e),
    (select count(*)::int from e where decision = 'rechazar'),
    (select count(*)::int from e where decision = 'retener'),
    (select count(*)::int from evepay.retenciones where tipo = 'riesgo' and liberada_en is null),
    /* Cobros de hoy en los que alguna regla en shadow habría actuado: lo que se mide antes de activar. */
    (select count(*)::int from e
     where exists (select 1 from jsonb_array_elements(e.reglas_disparadas) d where (d->>'actuo')::boolean = false));
$$;

grant execute on function evepay.admin_resumen_riesgo() to evepay_api;
