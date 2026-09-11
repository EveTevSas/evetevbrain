-- Riesgo del comercio. Spec: specs/evepay/riesgo-comercio/ (Fase 9).
--
-- Con el checkout alojado EvePay no ve tarjeta, IP ni dispositivo; lo que sí
-- ve es el comercio: cuánto cobra, cuándo, y si un cobro se sale de su
-- patrón. Aquí viven las reglas (configuración auditada), las evaluaciones
-- (inmutables: por qué se rechazó o retuvo cada cobro), la retención de
-- riesgo que impide dispersar un cobro hasta revisarlo, y la lista
-- restrictiva que se cruza en el alta (SARLAFT).

-- ---------------------------------------------------------------------------
-- Reglas: configuración, editable con auditoría. Un comercio tiene a lo sumo
-- una regla propia por tipo, y esa reemplaza a la global del mismo tipo.
-- ---------------------------------------------------------------------------
create table if not exists evepay.reglas_riesgo (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null check (length(trim(nombre)) >= 3),
  tipo            text not null check (tipo in ('limite_transaccion', 'limite_diario', 'limite_mensual', 'monto_atipico')),
  tenant_id       uuid references identity.tenants(id),
  parametros      jsonb not null,
  accion          text not null check (accion in ('rechazar', 'retener')),
  modo            text not null default 'shadow' check (modo in ('activa', 'shadow', 'inactiva')),
  prioridad       int not null default 100 check (prioridad between 0 and 1000),
  creada_por      text not null,
  creada_en       timestamptz not null default now(),
  actualizada_por text not null,
  actualizada_en  timestamptz not null default now(),
  constraint reglas_riesgo_parametros check (
    (tipo = 'monto_atipico' and (parametros->>'factor') is not null and (parametros->>'minimoCobros') is not null)
    or (tipo <> 'monto_atipico' and (parametros->>'limiteMinor') is not null)
  )
);

create unique index if not exists reglas_riesgo_tipo_uq on evepay.reglas_riesgo (tenant_id, tipo) nulls not distinct;

alter table evepay.reglas_riesgo enable row level security;

-- ---------------------------------------------------------------------------
-- Evaluaciones: qué decidió el motor con cada cobro y por qué. Inmutables.
-- ---------------------------------------------------------------------------
create table if not exists evepay.evaluaciones_riesgo (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references identity.tenants(id),
  /* Null cuando se rechazó: el cobro nunca existió. */
  payment_id         uuid references evepay.payments(id),
  monto_minor        bigint not null check (monto_minor > 0),
  decision           text not null check (decision in ('permitir', 'retener', 'rechazar')),
  reglas_disparadas  jsonb not null default '[]'::jsonb,
  senales            jsonb not null default '{}'::jsonb,
  creada_en          timestamptz not null default now()
);

create index if not exists evaluaciones_riesgo_tenant_idx on evepay.evaluaciones_riesgo (tenant_id, creada_en desc);
create index if not exists evaluaciones_riesgo_payment_idx on evepay.evaluaciones_riesgo (payment_id);

drop trigger if exists evaluaciones_riesgo_inmutable on evepay.evaluaciones_riesgo;
create trigger evaluaciones_riesgo_inmutable before update or delete on evepay.evaluaciones_riesgo
  for each row execute function audit.registro_inmutable();

alter table evepay.evaluaciones_riesgo enable row level security;
drop policy if exists tenant_isolation on evepay.evaluaciones_riesgo;
create policy tenant_isolation on evepay.evaluaciones_riesgo
  using (tenant_id = app_current_tenant());
grant select on evepay.evaluaciones_riesgo to evepay_api;

-- ---------------------------------------------------------------------------
-- La retención de riesgo: un tercer tipo sobre el cobro.
-- ---------------------------------------------------------------------------
alter table evepay.retenciones drop constraint if exists retenciones_tipo_check;
alter table evepay.retenciones add constraint retenciones_tipo_check
  check (tipo in ('primer_cobro', 'reserva', 'riesgo'));
alter table evepay.retenciones drop constraint if exists retenciones_forma;
alter table evepay.retenciones add constraint retenciones_forma check (
  (tipo in ('primer_cobro', 'riesgo') and payment_id is not null and lote_id is null) or
  (tipo = 'reserva' and lote_id is not null and payment_id is null)
);
alter table evepay.retenciones add column if not exists evaluacion_id uuid references evepay.evaluaciones_riesgo(id);
/* Un cobro retenido por riesgo una sola vez a la vez. */
create unique index if not exists retenciones_riesgo_activa_uq
  on evepay.retenciones (payment_id) where tipo = 'riesgo' and liberada_en is null;

-- Los cobros retenidos por riesgo tampoco se dispersan.
create or replace function evepay.cobros_dispersables(p_tenant uuid)
returns table (
  payment_id       uuid,
  reference        text,
  amount_minor     bigint,
  al_comercio      bigint,
  fecha_conciliado date,
  elegible         boolean,
  created_at       timestamptz
)
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  with pol as (select * from evepay.politica_de(p_tenant))
  select p.id, p.reference, p.amount_minor,
         evepay.al_comercio(p.amount_minor, tc.bps, tc.fijo_minor, tc.iva_bps),
         coalesce(c.fecha, (p.updated_at at time zone 'America/Bogota')::date) as fecha_conciliado,
         coalesce(c.fecha, (p.updated_at at time zone 'America/Bogota')::date) + pol.dias_liquidacion
           <= (now() at time zone 'America/Bogota')::date as elegible,
         p.created_at
  from evepay.payments p
  cross join pol
  left join evepay.tarifas_comercio tc on tc.id = p.tarifa_id
  left join evepay.consignacion_cobros cc on cc.payment_id = p.id
  left join evepay.consignaciones c on c.id = cc.consignacion_id
  where p.tenant_id = p_tenant
    and p.status = 'conciliado'
    and not exists (
      select 1 from evepay.lote_items li join evepay.lotes_dispersion l on l.id = li.lote_id
      where li.payment_id = p.id and l.estado in ('programado', 'aprobado', 'pagado')
    )
    and not exists (
      select 1 from evepay.retenciones r
      where r.payment_id = p.id and r.tipo in ('primer_cobro', 'riesgo') and r.liberada_en is null
    )
  order by p.created_at;
$$;

-- El balance de dispersión suma también lo retenido por riesgo.
create or replace function evepay.admin_balance_dispersion(p_tenant uuid)
returns table (
  disponible_minor   bigint,
  pendiente_minor    bigint,
  retenido_minor     bigint,
  en_lote_minor      bigint,
  cuenta_certificada boolean,
  cuenta_detalle     text,
  cobros_disponibles int,
  dias_liquidacion   int,
  reserva_bps        int,
  primer_cobro_retenido boolean
)
language sql
security definer
set search_path = evepay, identity, pg_temp
stable
as $$
  with d as (select * from evepay.cobros_dispersables(p_tenant)),
  pol as (select * from evepay.politica_de(p_tenant)),
  perfil as (
    select p.banco, p.tipo_cuenta, p.numero_cuenta, p.titular_cuenta, p.titular_documento, p.numero_documento,
           p.certificacion_bancaria_verificada
    from identity.perfil_comercio p where p.tenant_id = p_tenant
  )
  select
    (coalesce((select sum(al_comercio) from d where elegible), 0)
     + coalesce((select sum(monto_minor) from evepay.reservas_por_pagar(p_tenant)), 0))::bigint,
    (coalesce((select sum(al_comercio) from d where not elegible), 0)
     + coalesce((
        select sum(evepay.al_comercio(p.amount_minor, tc.bps, tc.fijo_minor, tc.iva_bps))
        from evepay.payments p left join evepay.tarifas_comercio tc on tc.id = p.tarifa_id
        where p.tenant_id = p_tenant and p.status = 'aprobado'), 0))::bigint,
    coalesce((
      select sum(r.monto_minor) from evepay.retenciones r
      left join evepay.lotes_dispersion l on l.id = r.lote_id
      where r.tenant_id = p_tenant and r.liberada_en is null
        and (r.tipo in ('primer_cobro', 'riesgo') or l.estado = 'pagado')), 0)::bigint,
    coalesce((select sum(monto_minor) from evepay.lotes_dispersion where tenant_id = p_tenant and estado in ('programado', 'aprobado')), 0)::bigint,
    coalesce((
      select pf.certificacion_bancaria_verificada and coalesce(pf.numero_cuenta, '') <> ''
             and coalesce(pf.titular_documento, '') <> '' and pf.titular_documento = pf.numero_documento
      from perfil pf), false),
    (select pf.banco || ' ' || coalesce(pf.tipo_cuenta, '') || ' ' || pf.numero_cuenta from perfil pf where pf.numero_cuenta is not null),
    (select count(*)::int from d where elegible),
    (select dias_liquidacion from pol),
    (select reserva_bps from pol),
    exists (select 1 from evepay.retenciones r where r.tenant_id = p_tenant and r.tipo = 'primer_cobro' and r.liberada_en is null);
$$;

-- ---------------------------------------------------------------------------
-- Señales del comercio en el momento del cobro (hora de Colombia).
-- ---------------------------------------------------------------------------
create or replace function evepay.senales_riesgo(p_tenant uuid)
returns table (hoy_minor bigint, mes_minor bigint, ticket_promedio_minor bigint, cobros_historicos int)
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  with hoy as (select (now() at time zone 'America/Bogota')::date as d)
  select
    coalesce(sum(p.amount_minor) filter (where p.status <> 'fallido' and (p.created_at at time zone 'America/Bogota')::date = hoy.d), 0)::bigint,
    coalesce(sum(p.amount_minor) filter (where p.status <> 'fallido' and date_trunc('month', p.created_at at time zone 'America/Bogota') = date_trunc('month', hoy.d::timestamp)), 0)::bigint,
    coalesce(round(avg(p.amount_minor) filter (where p.status in ('aprobado', 'conciliado'))), 0)::bigint,
    coalesce(count(*) filter (where p.status in ('aprobado', 'conciliado')), 0)::int
  from hoy left join evepay.payments p on p.tenant_id = p_tenant
  group by hoy.d;
$$;

grant execute on function evepay.senales_riesgo(uuid) to evepay_api;

-- Las reglas que aplican a un comercio: las globales y las suyas, sin las inactivas.
create or replace function evepay.reglas_riesgo_de(p_tenant uuid)
returns setof evepay.reglas_riesgo
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  select * from evepay.reglas_riesgo
  where (tenant_id is null or tenant_id = p_tenant) and modo <> 'inactiva'
  order by prioridad, creada_en;
$$;

grant execute on function evepay.reglas_riesgo_de(uuid) to evepay_api;

create or replace function evepay.registrar_evaluacion_riesgo(
  p_tenant     uuid,
  p_payment    uuid,
  p_monto      bigint,
  p_decision   text,
  p_disparadas jsonb,
  p_senales    jsonb
) returns uuid
language plpgsql
security definer
set search_path = evepay, pg_temp
as $$
declare v_id uuid;
begin
  insert into evepay.evaluaciones_riesgo (tenant_id, payment_id, monto_minor, decision, reglas_disparadas, senales)
  values (p_tenant, p_payment, p_monto, p_decision, coalesce(p_disparadas, '[]'::jsonb), coalesce(p_senales, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;

grant execute on function evepay.registrar_evaluacion_riesgo(uuid, uuid, bigint, text, jsonb, jsonb) to evepay_api;

-- Retiene el cobro por riesgo: lo que se le debe al comercio por él no sale
-- hasta que alguien revise y libere. Idempotente por cobro.
create or replace function evepay.retener_por_riesgo(p_payment uuid, p_evaluacion uuid, p_motivo text, p_actor text)
returns uuid
language plpgsql
security definer
set search_path = evepay, pg_temp
as $$
declare v_id uuid; p record;
begin
  select id into v_id from evepay.retenciones where payment_id = p_payment and tipo = 'riesgo' and liberada_en is null;
  if found then return v_id; end if;

  select pa.tenant_id, evepay.al_comercio(pa.amount_minor, tc.bps, tc.fijo_minor, tc.iva_bps) as al_comercio
  into p
  from evepay.payments pa left join evepay.tarifas_comercio tc on tc.id = pa.tarifa_id
  where pa.id = p_payment;
  if not found then
    raise exception 'El cobro % no existe', p_payment using errcode = 'no_data_found';
  end if;

  insert into evepay.retenciones (tenant_id, tipo, payment_id, monto_minor, motivo, creada_por, evaluacion_id)
  values (p.tenant_id, 'riesgo', p_payment, greatest(p.al_comercio, 1), p_motivo, p_actor, p_evaluacion)
  returning id into v_id;
  return v_id;
end $$;

grant execute on function evepay.retener_por_riesgo(uuid, uuid, text, text) to evepay_api;

-- ---------------------------------------------------------------------------
-- Administración de reglas (auditada con antes/después).
-- ---------------------------------------------------------------------------
create or replace function evepay.admin_guardar_regla_riesgo(
  p_id         uuid,
  p_nombre     text,
  p_tipo       text,
  p_tenant     uuid,
  p_parametros jsonb,
  p_accion     text,
  p_modo       text,
  p_prioridad  int,
  p_actor      text
) returns uuid
language plpgsql
security definer
set search_path = evepay, audit, identity, pg_temp
as $$
declare v_id uuid; v_antes jsonb;
begin
  if p_tenant is not null and not exists (select 1 from identity.tenants where id = p_tenant) then
    raise exception 'El comercio % no existe', p_tenant using errcode = 'no_data_found';
  end if;

  if p_id is not null then
    select to_jsonb(r) - 'creada_por' - 'creada_en' - 'actualizada_por' - 'actualizada_en' into v_antes
    from evepay.reglas_riesgo r where r.id = p_id for update;
    if not found then
      raise exception 'La regla % no existe', p_id using errcode = 'no_data_found';
    end if;
    update evepay.reglas_riesgo
    set nombre = trim(p_nombre), tipo = p_tipo, tenant_id = p_tenant, parametros = p_parametros,
        accion = p_accion, modo = p_modo, prioridad = p_prioridad, actualizada_por = p_actor, actualizada_en = now()
    where id = p_id;
    v_id := p_id;
  else
    insert into evepay.reglas_riesgo (nombre, tipo, tenant_id, parametros, accion, modo, prioridad, creada_por, actualizada_por)
    values (trim(p_nombre), p_tipo, p_tenant, p_parametros, p_accion, p_modo, p_prioridad, p_actor, p_actor)
    returning id into v_id;
  end if;

  perform audit.registrar_accion_admin(
    p_actor, 'riesgo.regla', 'regla_riesgo', v_id::text,
    jsonb_build_object('antes', v_antes, 'despues', jsonb_build_object(
      'nombre', trim(p_nombre), 'tipo', p_tipo, 'tenantId', p_tenant, 'parametros', p_parametros,
      'accion', p_accion, 'modo', p_modo, 'prioridad', p_prioridad))
  );
  return v_id;
end $$;

grant execute on function evepay.admin_guardar_regla_riesgo(uuid, text, text, uuid, jsonb, text, text, int, text) to evepay_api;

create or replace function evepay.admin_listar_reglas_riesgo()
returns table (
  id uuid, nombre text, tipo text, tenant_id uuid, tenant_nombre text, parametros jsonb, accion text, modo text,
  prioridad int, creada_por text, creada_en timestamptz, actualizada_por text, actualizada_en timestamptz,
  disparos_30d bigint
)
language sql
security definer
set search_path = evepay, identity, pg_temp
stable
as $$
  select r.id, r.nombre, r.tipo, r.tenant_id, t.display_name, r.parametros, r.accion, r.modo, r.prioridad,
         r.creada_por, r.creada_en, r.actualizada_por, r.actualizada_en,
         (select count(*) from evepay.evaluaciones_riesgo e
          where e.creada_en > now() - interval '30 days'
            and exists (select 1 from jsonb_array_elements(e.reglas_disparadas) d where d->>'id' = r.id::text))
  from evepay.reglas_riesgo r
  left join identity.tenants t on t.id = r.tenant_id
  order by (r.tenant_id is null) desc, r.prioridad, r.nombre;
$$;

grant execute on function evepay.admin_listar_reglas_riesgo() to evepay_api;

create or replace function evepay.admin_listar_evaluaciones_riesgo(p_tenant uuid default null, p_limite int default 100)
returns table (
  id uuid, tenant_id uuid, tenant_nombre text, payment_id uuid, reference text, monto_minor bigint,
  decision text, reglas_disparadas jsonb, senales jsonb, creada_en timestamptz
)
language sql
security definer
set search_path = evepay, identity, pg_temp
stable
as $$
  select e.id, e.tenant_id, t.display_name, e.payment_id, p.reference, e.monto_minor, e.decision,
         e.reglas_disparadas, e.senales, e.creada_en
  from evepay.evaluaciones_riesgo e
  join identity.tenants t on t.id = e.tenant_id
  left join evepay.payments p on p.id = e.payment_id
  where p_tenant is null or e.tenant_id = p_tenant
  order by e.creada_en desc
  limit least(greatest(coalesce(p_limite, 100), 1), 500);
$$;

grant execute on function evepay.admin_listar_evaluaciones_riesgo(uuid, int) to evepay_api;

-- La cola de revisión: cobros retenidos por riesgo, con su evaluación.
create or replace function evepay.admin_cola_riesgo()
returns table (
  retencion_id uuid, tenant_id uuid, tenant_nombre text, payment_id uuid, reference text, payment_status text,
  amount_minor bigint, monto_retenido bigint, motivo text, creada_en timestamptz, evaluacion_id uuid,
  reglas_disparadas jsonb, senales jsonb
)
language sql
security definer
set search_path = evepay, identity, pg_temp
stable
as $$
  select r.id, r.tenant_id, t.display_name, r.payment_id, p.reference, p.status, p.amount_minor, r.monto_minor,
         r.motivo, r.creada_en, r.evaluacion_id, coalesce(e.reglas_disparadas, '[]'::jsonb), coalesce(e.senales, '{}'::jsonb)
  from evepay.retenciones r
  join identity.tenants t on t.id = r.tenant_id
  join evepay.payments p on p.id = r.payment_id
  left join evepay.evaluaciones_riesgo e on e.id = r.evaluacion_id
  where r.tipo = 'riesgo' and r.liberada_en is null
  order by r.creada_en;
$$;

grant execute on function evepay.admin_cola_riesgo() to evepay_api;

-- ---------------------------------------------------------------------------
-- Lista restrictiva (SARLAFT): documentos que bloquean el alta. La carga es
-- manual; las entradas no se borran, se desactivan.
-- ---------------------------------------------------------------------------
create table if not exists evepay.lista_restrictiva (
  id               uuid primary key default gen_random_uuid(),
  tipo_documento   text not null check (tipo_documento in ('NIT', 'CC', 'CE', 'PA')),
  numero_documento text not null check (length(trim(numero_documento)) >= 3),
  nombre           text not null,
  fuente           text not null check (fuente in ('OFAC', 'ONU', 'PEP', 'interna')),
  motivo           text,
  activa           boolean not null default true,
  agregada_por     text not null,
  agregada_en      timestamptz not null default now(),
  desactivada_por  text,
  desactivada_en   timestamptz
);

create index if not exists lista_restrictiva_doc_idx on evepay.lista_restrictiva (tipo_documento, numero_documento) where activa;

alter table evepay.lista_restrictiva enable row level security;

create or replace function evepay.admin_agregar_lista_restrictiva(
  p_tipo text, p_numero text, p_nombre text, p_fuente text, p_motivo text, p_actor text
) returns uuid
language plpgsql
security definer
set search_path = evepay, audit, pg_temp
as $$
declare v_id uuid;
begin
  insert into evepay.lista_restrictiva (tipo_documento, numero_documento, nombre, fuente, motivo, agregada_por)
  values (p_tipo, regexp_replace(trim(p_numero), '[.\s-]', '', 'g'), trim(p_nombre), p_fuente, p_motivo, p_actor)
  returning id into v_id;
  perform audit.registrar_accion_admin(p_actor, 'riesgo.lista.agregar', 'lista_restrictiva', v_id::text,
    jsonb_build_object('tipoDocumento', p_tipo, 'fuente', p_fuente, 'nombre', trim(p_nombre)));
  return v_id;
end $$;

create or replace function evepay.admin_desactivar_lista_restrictiva(p_id uuid, p_actor text)
returns void
language plpgsql
security definer
set search_path = evepay, audit, pg_temp
as $$
begin
  update evepay.lista_restrictiva set activa = false, desactivada_por = p_actor, desactivada_en = now()
  where id = p_id and activa;
  if not found then
    raise exception 'La entrada % no existe o ya estaba inactiva', p_id using errcode = 'no_data_found';
  end if;
  perform audit.registrar_accion_admin(p_actor, 'riesgo.lista.desactivar', 'lista_restrictiva', p_id::text, '{}'::jsonb);
end $$;

create or replace function evepay.admin_listar_lista_restrictiva(p_limite int default 200)
returns setof evepay.lista_restrictiva
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  select * from evepay.lista_restrictiva order by activa desc, agregada_en desc
  limit least(greatest(coalesce(p_limite, 200), 1), 1000);
$$;

-- Coincidencias de un conjunto de documentos [{tipo, numero, quien}].
create or replace function evepay.admin_coincidencias_restrictivas(p_docs jsonb)
returns table (quien text, tipo_documento text, numero_documento text, nombre text, fuente text, motivo text)
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  select d.quien, l.tipo_documento, l.numero_documento, l.nombre, l.fuente, l.motivo
  from jsonb_to_recordset(coalesce(p_docs, '[]'::jsonb)) as d(tipo text, numero text, quien text)
  join evepay.lista_restrictiva l
    on l.activa and l.tipo_documento = d.tipo
   and l.numero_documento = regexp_replace(trim(d.numero), '[.\s-]', '', 'g');
$$;

grant execute on function evepay.admin_agregar_lista_restrictiva(text, text, text, text, text, text) to evepay_api;
grant execute on function evepay.admin_desactivar_lista_restrictiva(uuid, text) to evepay_api;
grant execute on function evepay.admin_listar_lista_restrictiva(int) to evepay_api;
grant execute on function evepay.admin_coincidencias_restrictivas(jsonb) to evepay_api;

-- ---------------------------------------------------------------------------
-- Reglas de arranque, en shadow: se miden antes de activarlas.
-- ---------------------------------------------------------------------------
insert into evepay.reglas_riesgo (nombre, tipo, tenant_id, parametros, accion, modo, prioridad, creada_por, actualizada_por)
select v.nombre, v.tipo, null, v.parametros::jsonb, v.accion, 'shadow', v.prioridad, 'migracion-0019', 'migracion-0019'
from (values
  ('Límite por transacción', 'limite_transaccion', '{"limiteMinor": 20000000}', 'rechazar', 10),
  ('Límite diario por comercio', 'limite_diario', '{"limiteMinor": 50000000}', 'rechazar', 20),
  ('Límite mensual por comercio', 'limite_mensual', '{"limiteMinor": 500000000}', 'rechazar', 30),
  ('Monto atípico frente al ticket promedio', 'monto_atipico', '{"factor": 5, "minimoCobros": 10}', 'retener', 40)
) as v(nombre, tipo, parametros, accion, prioridad)
where not exists (select 1 from evepay.reglas_riesgo r where r.tenant_id is null and r.tipo = v.tipo);
