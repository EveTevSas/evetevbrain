-- Dispersión asistida. Spec: specs/evepay/dispersion/ y specs/evepay/rbac-operativo/ (Fase 7).
--
-- EvePay custodia el recaudo y le debe a cada comercio lo que dice
-- merchant_payable. Esta migración pone en la base lo que saca ese dinero
-- hacia el comercio sin pagar dos veces ni a quien no es:
--
--   1. Una política por comercio (T+N, reserva, retención del primer cobro).
--   2. Retenciones: primer cobro de un comercio nuevo y reserva de cada lote.
--   3. Lotes con máquina de estados programado → aprobado → pagado | fallido,
--      cuenta de destino copiada del perfil, y CUATRO OJOS validado aquí:
--      quien preparó no aprueba, sea cual sea su rol.
--   4. Al registrar el pago, los asientos que sacan el dinero de `recaudo` y
--      saldan `merchant_payable` (y mueven la reserva a `retenido`), en la
--      misma transacción. El trigger diferido de 0016 vuelve a comprobar cada
--      asiento; el cuadre de custodia sigue exacto.

-- ---------------------------------------------------------------------------
-- Política de dispersión por comercio. Configuración, no dinero: se edita,
-- pero cada cambio queda en la auditoría con el antes y el después.
-- ---------------------------------------------------------------------------
create table if not exists evepay.politica_dispersion (
  tenant_id            uuid primary key references identity.tenants(id),
  dias_liquidacion     int not null default 1 check (dias_liquidacion between 0 and 30),
  reserva_bps          int not null default 0 check (reserva_bps between 0 and 5000),
  dias_reserva         int not null default 30 check (dias_reserva between 0 and 365),
  retener_primer_cobro boolean not null default true,
  actualizada_por      text not null,
  actualizada_en       timestamptz not null default now()
);

alter table evepay.politica_dispersion enable row level security;

-- La política vigente, con los valores por defecto si el comercio no tiene fila.
create or replace function evepay.politica_de(p_tenant uuid)
returns table (
  dias_liquidacion     int,
  reserva_bps          int,
  dias_reserva         int,
  retener_primer_cobro boolean,
  actualizada_por      text,
  actualizada_en       timestamptz
)
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  select coalesce(p.dias_liquidacion, 1), coalesce(p.reserva_bps, 0), coalesce(p.dias_reserva, 30),
         coalesce(p.retener_primer_cobro, true), p.actualizada_por, p.actualizada_en
  from (select 1) as uno
  left join evepay.politica_dispersion p on p.tenant_id = p_tenant;
$$;

create or replace function evepay.admin_guardar_politica_dispersion(
  p_tenant               uuid,
  p_dias_liquidacion     int,
  p_reserva_bps          int,
  p_dias_reserva         int,
  p_retener_primer_cobro boolean,
  p_actor                text
) returns void
language plpgsql
security definer
set search_path = evepay, audit, identity, pg_temp
as $$
declare v_antes jsonb;
begin
  if not exists (select 1 from identity.tenants where id = p_tenant) then
    raise exception 'El comercio % no existe', p_tenant using errcode = 'no_data_found';
  end if;

  select to_jsonb(v) - 'actualizada_por' - 'actualizada_en' into v_antes from evepay.politica_de(p_tenant) v;

  insert into evepay.politica_dispersion (tenant_id, dias_liquidacion, reserva_bps, dias_reserva, retener_primer_cobro, actualizada_por)
  values (p_tenant, p_dias_liquidacion, p_reserva_bps, p_dias_reserva, p_retener_primer_cobro, p_actor)
  on conflict (tenant_id) do update set
    dias_liquidacion = excluded.dias_liquidacion,
    reserva_bps = excluded.reserva_bps,
    dias_reserva = excluded.dias_reserva,
    retener_primer_cobro = excluded.retener_primer_cobro,
    actualizada_por = excluded.actualizada_por,
    actualizada_en = now();

  perform audit.registrar_accion_admin(
    p_actor, 'dispersion.politica', 'tenant', p_tenant::text,
    jsonb_build_object(
      'antes', v_antes,
      'despues', jsonb_build_object(
        'dias_liquidacion', p_dias_liquidacion, 'reserva_bps', p_reserva_bps,
        'dias_reserva', p_dias_reserva, 'retener_primer_cobro', p_retener_primer_cobro
      )
    )
  );
end $$;

grant execute on function evepay.politica_de(uuid) to evepay_api;
grant execute on function evepay.admin_guardar_politica_dispersion(uuid, int, int, int, boolean, text) to evepay_api;

-- ---------------------------------------------------------------------------
-- Lo que se le debe al comercio por un cobro: monto − comisión − IVA, con la
-- tarifa fijada en él. Sin tarifa (anterior a la Fase 6) es el monto entero.
-- Misma regla que desglosarCobro en @evetev/shared.
-- ---------------------------------------------------------------------------
create or replace function evepay.al_comercio(p_monto bigint, p_bps int, p_fijo bigint, p_iva_bps int)
returns bigint
language sql
immutable
as $$
  select case
    when p_bps is null then p_monto
    else p_monto
         - evepay.calcular_tarifa(p_monto, p_bps, p_fijo)
         - evepay.calcular_tarifa(evepay.calcular_tarifa(p_monto, p_bps, p_fijo), p_iva_bps, 0)
  end;
$$;

grant execute on function evepay.al_comercio(bigint, int, bigint, int) to evepay_api;

-- ---------------------------------------------------------------------------
-- Lotes de dispersión.
-- ---------------------------------------------------------------------------
create table if not exists evepay.lotes_dispersion (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references identity.tenants(id),
  estado             text not null default 'programado'
                     check (estado in ('programado', 'aprobado', 'pagado', 'fallido')),
  /* Lo que se transfiere al comercio: cobros − reserva + reservas liberadas. */
  monto_minor        bigint not null check (monto_minor >= 0),
  /* La reserva de este lote, que se queda en retenido:<merchant>. */
  reserva_minor      bigint not null default 0 check (reserva_minor >= 0),
  /* Cuenta de destino copiada del perfil al preparar: si el perfil cambia
     después, el lote sigue diciendo a dónde se pagó. */
  banco              text not null,
  tipo_cuenta        text not null,
  numero_cuenta      text not null,
  titular_cuenta     text not null,
  titular_documento  text not null,
  preparado_por      text not null,
  preparado_en       timestamptz not null default now(),
  aprobado_por       text,
  aprobado_en        timestamptz,
  fecha_pago         date,
  referencia_pago    text,
  comprobante        text,
  pagado_por         text,
  pagado_en          timestamptz,
  fallo_motivo       text,
  fallido_por        text,
  fallido_en         timestamptz,
  /* CUATRO OJOS: quien preparó no aprueba. Vive aquí, no solo en el código. */
  constraint lotes_cuatro_ojos check (aprobado_por is null or aprobado_por <> preparado_por)
);

create index if not exists lotes_dispersion_tenant_idx on evepay.lotes_dispersion (tenant_id, preparado_en desc);
/* Un comercio no tiene dos lotes abiertos a la vez. */
create unique index if not exists lotes_dispersion_abierto_uq
  on evepay.lotes_dispersion (tenant_id) where estado in ('programado', 'aprobado');

-- Solo cambian de estado hacia adelante; pagado y fallido no se tocan más.
create or replace function evepay.lote_solo_avanza() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Los lotes de dispersión no se borran' using errcode = 'check_violation';
  end if;
  if old.estado in ('pagado', 'fallido') then
    raise exception 'El lote % ya está % y no se modifica', old.id, old.estado using errcode = 'check_violation';
  end if;
  if not (
    (old.estado = 'programado' and new.estado in ('aprobado', 'fallido')) or
    (old.estado = 'aprobado' and new.estado in ('pagado', 'fallido'))
  ) then
    raise exception 'Transición de lote no permitida: % → %', old.estado, new.estado using errcode = 'check_violation';
  end if;
  -- Lo que ya se fijó no cambia: tenant, montos, cuenta, quién preparó.
  if new.tenant_id <> old.tenant_id or new.monto_minor <> old.monto_minor or new.reserva_minor <> old.reserva_minor
     or new.numero_cuenta <> old.numero_cuenta or new.preparado_por <> old.preparado_por then
    raise exception 'Los datos del lote % son inmutables', old.id using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists lotes_dispersion_avanza on evepay.lotes_dispersion;
create trigger lotes_dispersion_avanza before update or delete on evepay.lotes_dispersion
  for each row execute function evepay.lote_solo_avanza();

alter table evepay.lotes_dispersion enable row level security;

-- ---------------------------------------------------------------------------
-- Retenciones: el primer cobro de un comercio nuevo y la reserva de cada lote.
-- Estado derivado: activa → liberada → pagada; o anulada si su lote falló.
-- ---------------------------------------------------------------------------
create table if not exists evepay.retenciones (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references identity.tenants(id),
  tipo              text not null check (tipo in ('primer_cobro', 'reserva')),
  payment_id        uuid references evepay.payments(id),
  lote_id           uuid references evepay.lotes_dispersion(id),
  monto_minor       bigint not null check (monto_minor > 0),
  liberar_desde     date,
  motivo            text not null,
  creada_por        text not null,
  creada_en         timestamptz not null default now(),
  liberada_por      text,
  liberada_en       timestamptz,
  liberacion_motivo text,
  /* Reserva: el lote que la pagó al comercio una vez liberada. */
  pagada_en_lote    uuid references evepay.lotes_dispersion(id),
  constraint retenciones_forma check (
    (tipo = 'primer_cobro' and payment_id is not null and lote_id is null) or
    (tipo = 'reserva' and lote_id is not null and payment_id is null)
  )
);

create index if not exists retenciones_tenant_idx on evepay.retenciones (tenant_id, creada_en desc);
/* Un cobro se retiene como primer cobro una sola vez en la vida. */
create unique index if not exists retenciones_primer_cobro_uq
  on evepay.retenciones (payment_id) where tipo = 'primer_cobro';

create or replace function evepay.retencion_solo_avanza() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Las retenciones no se borran' using errcode = 'check_violation';
  end if;
  if new.tenant_id <> old.tenant_id or new.tipo <> old.tipo or new.monto_minor <> old.monto_minor
     or coalesce(new.payment_id::text, '') <> coalesce(old.payment_id::text, '')
     or coalesce(new.lote_id::text, '') <> coalesce(old.lote_id::text, '') then
    raise exception 'Los datos de la retención % son inmutables', old.id using errcode = 'check_violation';
  end if;
  if old.liberada_en is not null and new.liberada_en is distinct from old.liberada_en then
    raise exception 'La retención % ya estaba liberada' , old.id using errcode = 'check_violation';
  end if;
  if old.pagada_en_lote is not null and new.pagada_en_lote is distinct from old.pagada_en_lote then
    raise exception 'La retención % ya se pagó en un lote', old.id using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists retenciones_avanza on evepay.retenciones;
create trigger retenciones_avanza before update or delete on evepay.retenciones
  for each row execute function evepay.retencion_solo_avanza();

alter table evepay.retenciones enable row level security;

-- Items del lote: cada cobro (con su parte de reserva) y cada reserva liberada
-- que se paga en él. Inmutables.
create table if not exists evepay.lote_items (
  id            uuid primary key default gen_random_uuid(),
  lote_id       uuid not null references evepay.lotes_dispersion(id),
  tenant_id     uuid not null references identity.tenants(id),
  tipo          text not null check (tipo in ('cobro', 'reserva_liberada')),
  payment_id    uuid references evepay.payments(id),
  retencion_id  uuid references evepay.retenciones(id),
  /* Cobro: lo que se le debe al comercio por él. Reserva: su monto. */
  monto_minor   bigint not null check (monto_minor > 0),
  /* Cobro: la parte de la reserva del lote que le toca. */
  reserva_minor bigint not null default 0 check (reserva_minor >= 0 and reserva_minor <= monto_minor),
  constraint lote_items_forma check (
    (tipo = 'cobro' and payment_id is not null and retencion_id is null) or
    (tipo = 'reserva_liberada' and retencion_id is not null and payment_id is null)
  )
);

create index if not exists lote_items_lote_idx on evepay.lote_items (lote_id);
create index if not exists lote_items_payment_idx on evepay.lote_items (payment_id);

drop trigger if exists lote_items_inmutable on evepay.lote_items;
create trigger lote_items_inmutable before update or delete on evepay.lote_items
  for each row execute function audit.registro_inmutable();

alter table evepay.lote_items enable row level security;

-- ---------------------------------------------------------------------------
-- Los cobros de un comercio que podrían dispersarse: conciliados, sin lote
-- vivo, sin retención de primer cobro activa. `elegible` aplica el T+N.
-- ---------------------------------------------------------------------------
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
      where r.payment_id = p.id and r.tipo = 'primer_cobro' and r.liberada_en is null
    )
  order by p.created_at;
$$;

grant execute on function evepay.cobros_dispersables(uuid) to evepay_api;

-- Reservas liberadas de un comercio que aún no se han pagado en ningún lote
-- (y cuyo lote de origen sí se pagó: si falló, la reserva nunca existió).
create or replace function evepay.reservas_por_pagar(p_tenant uuid)
returns table (retencion_id uuid, monto_minor bigint, liberada_en timestamptz)
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  select r.id, r.monto_minor, r.liberada_en
  from evepay.retenciones r
  join evepay.lotes_dispersion l on l.id = r.lote_id
  where r.tenant_id = p_tenant and r.tipo = 'reserva'
    and r.liberada_en is not null and r.pagada_en_lote is null
    and l.estado = 'pagado'
  order by r.liberada_en;
$$;

-- ---------------------------------------------------------------------------
-- Balance de dispersión (CA-1): disponible, pendiente, retenido, en lote, y si
-- la cuenta de destino está certificada.
-- ---------------------------------------------------------------------------
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
        and (r.tipo = 'primer_cobro' or l.estado = 'pagado')), 0)::bigint,
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

grant execute on function evepay.admin_balance_dispersion(uuid) to evepay_api;

create or replace function evepay.admin_balances_dispersion()
returns table (
  tenant_id          uuid,
  tenant_nombre      text,
  tenant_estado      text,
  disponible_minor   bigint,
  pendiente_minor    bigint,
  retenido_minor     bigint,
  en_lote_minor      bigint,
  cuenta_certificada boolean,
  cuenta_detalle     text,
  cobros_disponibles int,
  dias_liquidacion   int,
  reserva_bps        int,
  primer_cobro_retenido boolean,
  lote_abierto       uuid,
  lote_abierto_estado text
)
language sql
security definer
set search_path = evepay, identity, pg_temp
stable
as $$
  select t.id, t.display_name, t.status, b.*,
         l.id, l.estado
  from identity.tenants t
  cross join lateral evepay.admin_balance_dispersion(t.id) b
  left join evepay.lotes_dispersion l on l.tenant_id = t.id and l.estado in ('programado', 'aprobado')
  order by b.disponible_minor desc, t.display_name;
$$;

grant execute on function evepay.admin_balances_dispersion() to evepay_api;

-- ---------------------------------------------------------------------------
-- Preparar un lote (CA-2, CA-3, CA-8, CA-9, CA-12). Devuelve el id del lote,
-- o null si no había nada disponible (dejando retenido el primer cobro si
-- aplicaba).
-- ---------------------------------------------------------------------------
create or replace function evepay.admin_preparar_lote(p_tenant uuid, p_actor text, p_rol text)
returns uuid
language plpgsql
security definer
set search_path = evepay, audit, identity, pg_temp
as $$
declare
  v_pol        record;
  v_perfil     record;
  v_lote       uuid;
  v_total      bigint := 0;
  v_reserva    bigint := 0;
  v_liberadas  bigint := 0;
  v_n          int := 0;
  v_acum       bigint := 0;
  v_parte      bigint;
  v_i          int := 0;
  v_primer     record;
  r            record;
begin
  -- Un preparador a la vez por comercio.
  perform pg_advisory_xact_lock(hashtext('lote:' || p_tenant::text));

  if exists (select 1 from evepay.lotes_dispersion where tenant_id = p_tenant and estado in ('programado', 'aprobado')) then
    raise exception 'El comercio ya tiene un lote abierto; apruébalo, págalo o márcalo fallido antes de preparar otro'
      using errcode = 'check_violation';
  end if;

  select * into v_perfil from identity.perfil_comercio where tenant_id = p_tenant;
  if not found then
    raise exception 'El comercio no tiene perfil: no hay cuenta a la que dispersar' using errcode = 'check_violation';
  end if;
  if coalesce(v_perfil.numero_cuenta, '') = '' or coalesce(v_perfil.banco, '') = '' then
    raise exception 'El perfil no tiene cuenta de dispersión' using errcode = 'check_violation';
  end if;
  if not v_perfil.certificacion_bancaria_verificada then
    raise exception 'La certificación bancaria del comercio no está verificada: no se dispersa a una cuenta sin certificar'
      using errcode = 'check_violation';
  end if;
  if coalesce(v_perfil.titular_documento, '') <> v_perfil.numero_documento then
    raise exception 'El titular de la cuenta (%) no es el comercio (%): no se dispersa a un tercero',
      coalesce(v_perfil.titular_documento, 'sin documento'), v_perfil.numero_documento
      using errcode = 'check_violation';
  end if;

  select * into v_pol from evepay.politica_de(p_tenant);

  -- CA-8: el primer cobro de un comercio nuevo se retiene hasta que alguien lo libere.
  if v_pol.retener_primer_cobro
     and not exists (select 1 from evepay.lotes_dispersion where tenant_id = p_tenant and estado = 'pagado')
     and not exists (select 1 from evepay.retenciones where tenant_id = p_tenant and tipo = 'primer_cobro') then
    select * into v_primer from evepay.cobros_dispersables(p_tenant) order by created_at limit 1;
    if found then
      insert into evepay.retenciones (tenant_id, tipo, payment_id, monto_minor, motivo, creada_por)
      values (p_tenant, 'primer_cobro', v_primer.payment_id, greatest(v_primer.al_comercio, 1),
              'Primer cobro de un comercio nuevo: se libera a mano tras revisarlo', p_actor);
    end if;
  end if;

  -- Cobros elegibles (T+N) y reservas liberadas por pagar.
  select coalesce(sum(al_comercio), 0), count(*) into v_total, v_n
  from evepay.cobros_dispersables(p_tenant) where elegible and al_comercio > 0;
  select coalesce(sum(monto_minor), 0) into v_liberadas from evepay.reservas_por_pagar(p_tenant);

  -- Sin nada disponible no hay lote, pero la retención del primer cobro (si
  -- se acaba de crear) tiene que quedar: por eso se devuelve null en vez de
  -- lanzar, que desharía también la retención. El servicio arma el mensaje.
  if v_n = 0 and v_liberadas = 0 then
    return null;
  end if;

  v_reserva := evepay.calcular_tarifa(v_total, v_pol.reserva_bps, 0);

  insert into evepay.lotes_dispersion (
    tenant_id, monto_minor, reserva_minor, banco, tipo_cuenta, numero_cuenta, titular_cuenta, titular_documento, preparado_por
  ) values (
    p_tenant, v_total - v_reserva + v_liberadas, v_reserva,
    v_perfil.banco, coalesce(v_perfil.tipo_cuenta, ''), v_perfil.numero_cuenta,
    coalesce(v_perfil.titular_cuenta, ''), v_perfil.titular_documento, p_actor
  ) returning id into v_lote;

  -- Items de cobro con su parte de la reserva: proporcional, mitad arriba, el
  -- último absorbe el resto (misma regla que repartirReserva en shared).
  for r in select * from evepay.cobros_dispersables(p_tenant) where elegible and al_comercio > 0 order by created_at, payment_id loop
    v_i := v_i + 1;
    if v_i = v_n then
      v_parte := v_reserva - v_acum;
    else
      v_parte := floor((r.al_comercio::numeric * v_reserva * 2 + v_total) / (2 * v_total));
    end if;
    v_parte := least(greatest(v_parte, 0), r.al_comercio);
    v_acum := v_acum + v_parte;
    insert into evepay.lote_items (lote_id, tenant_id, tipo, payment_id, monto_minor, reserva_minor)
    values (v_lote, p_tenant, 'cobro', r.payment_id, r.al_comercio, v_parte);
  end loop;

  for r in select * from evepay.reservas_por_pagar(p_tenant) loop
    insert into evepay.lote_items (lote_id, tenant_id, tipo, retencion_id, monto_minor)
    values (v_lote, p_tenant, 'reserva_liberada', r.retencion_id, r.monto_minor);
  end loop;

  -- CA-9: la reserva de este lote queda como retención liberable pasados N días.
  if v_reserva > 0 then
    insert into evepay.retenciones (tenant_id, tipo, lote_id, monto_minor, liberar_desde, motivo, creada_por)
    values (p_tenant, 'reserva', v_lote, v_reserva,
            (now() at time zone 'America/Bogota')::date + v_pol.dias_reserva,
            format('Reserva del %s %% del lote', (v_pol.reserva_bps::numeric / 100)), p_actor);
  end if;

  perform audit.registrar_accion_admin(
    p_actor, 'lote.preparar', 'lote', v_lote::text,
    jsonb_build_object('tenantId', p_tenant, 'montoMinor', v_total - v_reserva + v_liberadas,
                       'reservaMinor', v_reserva, 'cobros', v_n, 'rol', p_rol)
  );
  return v_lote;
end $$;

grant execute on function evepay.admin_preparar_lote(uuid, text, text) to evepay_api;

-- ---------------------------------------------------------------------------
-- Aprobar (CA-4): otra persona. La constraint lo garantiza; esto lo dice claro.
-- ---------------------------------------------------------------------------
create or replace function evepay.admin_aprobar_lote(p_lote uuid, p_actor text, p_rol text)
returns void
language plpgsql
security definer
set search_path = evepay, audit, pg_temp
as $$
declare v record;
begin
  select * into v from evepay.lotes_dispersion where id = p_lote for update;
  if not found then
    raise exception 'El lote % no existe', p_lote using errcode = 'no_data_found';
  end if;
  if v.estado <> 'programado' then
    raise exception 'El lote está %; solo se aprueba un lote programado', v.estado using errcode = 'check_violation';
  end if;
  if v.preparado_por = p_actor then
    raise exception 'Cuatro ojos: % preparó este lote y no puede aprobarlo; debe aprobarlo otra persona', p_actor
      using errcode = 'check_violation';
  end if;

  update evepay.lotes_dispersion set estado = 'aprobado', aprobado_por = p_actor, aprobado_en = now() where id = p_lote;

  perform audit.registrar_accion_admin(
    p_actor, 'lote.aprobar', 'lote', p_lote::text,
    jsonb_build_object('tenantId', v.tenant_id, 'montoMinor', v.monto_minor, 'preparadoPor', v.preparado_por, 'rol', p_rol)
  );
end $$;

grant execute on function evepay.admin_aprobar_lote(uuid, text, text) to evepay_api;

-- ---------------------------------------------------------------------------
-- Registrar el pago (CA-5, CA-6): el lote pasa a pagado y el libro saca el
-- dinero de recaudo. Solo desde aprobado; nunca dos veces.
-- ---------------------------------------------------------------------------
create or replace function evepay.admin_registrar_pago_lote(
  p_lote        uuid,
  p_fecha       date,
  p_referencia  text,
  p_comprobante text,
  p_actor       text,
  p_rol         text
) returns void
language plpgsql
security definer
set search_path = evepay, audit, pg_temp
as $$
declare
  v       record;
  it      record;
  v_entry uuid;
  v_pay   record;
begin
  select * into v from evepay.lotes_dispersion where id = p_lote for update;
  if not found then
    raise exception 'El lote % no existe', p_lote using errcode = 'no_data_found';
  end if;
  if v.estado = 'pagado' then
    raise exception 'El lote ya está pagado: no se paga dos veces' using errcode = 'check_violation';
  end if;
  if v.estado <> 'aprobado' then
    raise exception 'El lote está %; solo se registra el pago de un lote aprobado', v.estado using errcode = 'check_violation';
  end if;
  if coalesce(trim(p_referencia), '') = '' then
    raise exception 'Falta la referencia del pago en el banco' using errcode = 'check_violation';
  end if;

  update evepay.lotes_dispersion
  set estado = 'pagado', fecha_pago = p_fecha, referencia_pago = trim(p_referencia),
      comprobante = p_comprobante, pagado_por = p_actor, pagado_en = now()
  where id = p_lote;

  for it in select * from evepay.lote_items where lote_id = p_lote loop
    if it.tipo = 'cobro' then
      select p.merchant_id, p.reference into v_pay from evepay.payments p where p.id = it.payment_id;

      insert into evepay.ledger_entries (tenant_id, payment_id, kind, memo)
      values (it.tenant_id, it.payment_id, 'cobro_dispersado', 'Dispersión ' || trim(p_referencia) || ' · ' || v_pay.reference)
      returning id into v_entry;

      insert into evepay.ledger_lines (entry_id, tenant_id, account, direction, amount_minor)
      values (v_entry, it.tenant_id, 'merchant_payable:' || v_pay.merchant_id, 'debit', it.monto_minor);
      if it.monto_minor - it.reserva_minor > 0 then
        insert into evepay.ledger_lines (entry_id, tenant_id, account, direction, amount_minor)
        values (v_entry, it.tenant_id, 'recaudo', 'credit', it.monto_minor - it.reserva_minor);
      end if;
      if it.reserva_minor > 0 then
        insert into evepay.ledger_lines (entry_id, tenant_id, account, direction, amount_minor)
        values (v_entry, it.tenant_id, 'retenido:' || v_pay.merchant_id, 'credit', it.reserva_minor);
      end if;
    else
      select p.merchant_id into v_pay
      from evepay.retenciones r
      join evepay.lote_items li0 on li0.lote_id = r.lote_id and li0.tipo = 'cobro'
      join evepay.payments p on p.id = li0.payment_id
      where r.id = it.retencion_id limit 1;

      insert into evepay.ledger_entries (tenant_id, payment_id, kind, memo)
      values (it.tenant_id, null, 'reserva_dispersada', 'Reserva liberada · ' || it.retencion_id::text || ' · ' || trim(p_referencia))
      returning id into v_entry;

      insert into evepay.ledger_lines (entry_id, tenant_id, account, direction, amount_minor)
      values (v_entry, it.tenant_id, 'retenido:' || v_pay.merchant_id, 'debit', it.monto_minor),
             (v_entry, it.tenant_id, 'recaudo', 'credit', it.monto_minor);

      update evepay.retenciones set pagada_en_lote = p_lote where id = it.retencion_id;
    end if;
  end loop;

  perform audit.registrar_accion_admin(
    p_actor, 'lote.pagar', 'lote', p_lote::text,
    jsonb_build_object('tenantId', v.tenant_id, 'montoMinor', v.monto_minor, 'reservaMinor', v.reserva_minor,
                       'referenciaPago', trim(p_referencia), 'fechaPago', p_fecha, 'aprobadoPor', v.aprobado_por, 'rol', p_rol)
  );
end $$;

grant execute on function evepay.admin_registrar_pago_lote(uuid, date, text, text, text, text) to evepay_api;

-- ---------------------------------------------------------------------------
-- Marcar fallido (CA-7): sus cobros vuelven a estar disponibles; su reserva
-- nunca existió (queda anulada por estar ligada a un lote fallido).
-- ---------------------------------------------------------------------------
create or replace function evepay.admin_marcar_lote_fallido(p_lote uuid, p_motivo text, p_actor text, p_rol text)
returns void
language plpgsql
security definer
set search_path = evepay, audit, pg_temp
as $$
declare v record;
begin
  select * into v from evepay.lotes_dispersion where id = p_lote for update;
  if not found then
    raise exception 'El lote % no existe', p_lote using errcode = 'no_data_found';
  end if;
  if v.estado not in ('programado', 'aprobado') then
    raise exception 'El lote está %; solo se marca fallido un lote abierto', v.estado using errcode = 'check_violation';
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Hay que decir por qué falló' using errcode = 'check_violation';
  end if;

  update evepay.lotes_dispersion
  set estado = 'fallido', fallo_motivo = trim(p_motivo), fallido_por = p_actor, fallido_en = now()
  where id = p_lote;

  perform audit.registrar_accion_admin(
    p_actor, 'lote.fallar', 'lote', p_lote::text,
    jsonb_build_object('tenantId', v.tenant_id, 'montoMinor', v.monto_minor, 'motivo', trim(p_motivo), 'rol', p_rol)
  );
end $$;

grant execute on function evepay.admin_marcar_lote_fallido(uuid, text, text, text) to evepay_api;

-- ---------------------------------------------------------------------------
-- Liberar una retención (CA-10). La reserva solo pasados sus días, salvo
-- super_admin; el primer cobro cuando alguien lo revisó.
-- ---------------------------------------------------------------------------
create or replace function evepay.admin_liberar_retencion(p_id uuid, p_motivo text, p_actor text, p_rol text)
returns void
language plpgsql
security definer
set search_path = evepay, audit, pg_temp
as $$
declare v record; v_lote record;
begin
  select * into v from evepay.retenciones where id = p_id for update;
  if not found then
    raise exception 'La retención % no existe', p_id using errcode = 'no_data_found';
  end if;
  if v.liberada_en is not null then
    raise exception 'La retención ya estaba liberada' using errcode = 'check_violation';
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Hay que decir por qué se libera' using errcode = 'check_violation';
  end if;
  if v.tipo = 'reserva' then
    select * into v_lote from evepay.lotes_dispersion where id = v.lote_id;
    if v_lote.estado <> 'pagado' then
      raise exception 'La reserva pertenece a un lote %: no hay nada retenido que liberar', v_lote.estado using errcode = 'check_violation';
    end if;
    if v.liberar_desde > (now() at time zone 'America/Bogota')::date and p_rol <> 'super_admin' then
      raise exception 'La reserva se puede liberar desde el %; antes solo super_admin', v.liberar_desde using errcode = 'check_violation';
    end if;
  end if;

  update evepay.retenciones set liberada_por = p_actor, liberada_en = now(), liberacion_motivo = trim(p_motivo) where id = p_id;

  perform audit.registrar_accion_admin(
    p_actor, 'retencion.liberar', 'retencion', p_id::text,
    jsonb_build_object('tenantId', v.tenant_id, 'tipo', v.tipo, 'montoMinor', v.monto_minor, 'motivo', trim(p_motivo), 'rol', p_rol)
  );
end $$;

grant execute on function evepay.admin_liberar_retencion(uuid, text, text, text) to evepay_api;

-- ---------------------------------------------------------------------------
-- Lecturas para la consola.
-- ---------------------------------------------------------------------------
create or replace function evepay.admin_listar_lotes(p_estado text default null, p_limite int default 50)
returns table (
  id uuid, tenant_id uuid, tenant_nombre text, estado text, monto_minor bigint, reserva_minor bigint,
  banco text, tipo_cuenta text, numero_cuenta text, titular_cuenta text, titular_documento text,
  preparado_por text, preparado_en timestamptz, aprobado_por text, aprobado_en timestamptz,
  fecha_pago date, referencia_pago text, comprobante text, pagado_por text, pagado_en timestamptz,
  fallo_motivo text, fallido_por text, fallido_en timestamptz, cobros bigint
)
language sql
security definer
set search_path = evepay, identity, pg_temp
stable
as $$
  select l.id, l.tenant_id, t.display_name, l.estado, l.monto_minor, l.reserva_minor,
         l.banco, l.tipo_cuenta, l.numero_cuenta, l.titular_cuenta, l.titular_documento,
         l.preparado_por, l.preparado_en, l.aprobado_por, l.aprobado_en,
         l.fecha_pago, l.referencia_pago, l.comprobante, l.pagado_por, l.pagado_en,
         l.fallo_motivo, l.fallido_por, l.fallido_en,
         (select count(*) from evepay.lote_items li where li.lote_id = l.id and li.tipo = 'cobro')
  from evepay.lotes_dispersion l
  join identity.tenants t on t.id = l.tenant_id
  where p_estado is null or l.estado = p_estado
  order by (l.estado in ('programado', 'aprobado')) desc, l.preparado_en desc
  limit least(greatest(coalesce(p_limite, 50), 1), 200);
$$;

grant execute on function evepay.admin_listar_lotes(text, int) to evepay_api;

create or replace function evepay.admin_lote_items(p_lote uuid)
returns table (
  id uuid, tipo text, payment_id uuid, reference text, amount_minor bigint, retencion_id uuid,
  monto_minor bigint, reserva_minor bigint
)
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  select li.id, li.tipo, li.payment_id, p.reference, p.amount_minor, li.retencion_id, li.monto_minor, li.reserva_minor
  from evepay.lote_items li
  left join evepay.payments p on p.id = li.payment_id
  where li.lote_id = p_lote
  order by li.tipo, p.created_at;
$$;

grant execute on function evepay.admin_lote_items(uuid) to evepay_api;

create or replace function evepay.admin_listar_retenciones(p_tenant uuid default null, p_limite int default 100)
returns table (
  id uuid, tenant_id uuid, tenant_nombre text, tipo text, payment_id uuid, reference text, lote_id uuid,
  monto_minor bigint, liberar_desde date, motivo text, creada_por text, creada_en timestamptz,
  liberada_por text, liberada_en timestamptz, liberacion_motivo text, pagada_en_lote uuid, estado text
)
language sql
security definer
set search_path = evepay, identity, pg_temp
stable
as $$
  select r.id, r.tenant_id, t.display_name, r.tipo, r.payment_id, p.reference, r.lote_id,
         r.monto_minor, r.liberar_desde, r.motivo, r.creada_por, r.creada_en,
         r.liberada_por, r.liberada_en, r.liberacion_motivo, r.pagada_en_lote,
         case
           when l.estado = 'fallido' then 'anulada'
           when r.pagada_en_lote is not null then 'pagada'
           when r.liberada_en is not null then 'liberada'
           when r.tipo = 'reserva' and l.estado <> 'pagado' then 'pendiente'
           else 'activa'
         end
  from evepay.retenciones r
  join identity.tenants t on t.id = r.tenant_id
  left join evepay.payments p on p.id = r.payment_id
  left join evepay.lotes_dispersion l on l.id = r.lote_id
  where p_tenant is null or r.tenant_id = p_tenant
  order by (r.liberada_en is null) desc, r.creada_en desc
  limit least(greatest(coalesce(p_limite, 100), 1), 500);
$$;

grant execute on function evepay.admin_listar_retenciones(uuid, int) to evepay_api;

create or replace function evepay.admin_retencion(p_id uuid)
returns table (
  id uuid, tenant_id uuid, tenant_nombre text, tipo text, payment_id uuid, reference text, lote_id uuid,
  monto_minor bigint, liberar_desde date, motivo text, creada_por text, creada_en timestamptz,
  liberada_por text, liberada_en timestamptz, liberacion_motivo text, pagada_en_lote uuid, estado text
)
language sql
security definer
set search_path = evepay, identity, pg_temp
stable
as $$
  select * from evepay.admin_listar_retenciones(null, 500) r where r.id = p_id;
$$;

grant execute on function evepay.admin_retencion(uuid) to evepay_api;

-- ---------------------------------------------------------------------------
-- El balance del comercio (0016) suma lo retenido y lo ya dispersado.
-- ---------------------------------------------------------------------------
drop function if exists evepay.admin_balance_comercio(uuid);
create function evepay.admin_balance_comercio(p_tenant uuid)
returns table (
  por_pagar           bigint,
  comision            bigint,
  iva_por_pagar       bigint,
  costo_proveedor     bigint,
  margen              bigint,
  en_transito         bigint,
  en_recaudo          bigint,
  por_pagar_proveedor bigint,
  retenido            bigint,
  dispersado          bigint
)
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  with s as (
    select l.account,
           coalesce(sum(case when l.direction = 'debit' then l.amount_minor else 0 end), 0)::bigint as deb,
           coalesce(sum(case when l.direction = 'credit' then l.amount_minor else 0 end), 0)::bigint as cred
    from evepay.ledger_lines l
    where l.tenant_id = p_tenant
    group by l.account
  )
  select
    coalesce(sum(cred - deb) filter (where account like 'merchant_payable:%'), 0)::bigint,
    coalesce(sum(cred - deb) filter (where account = 'comision:evepay'), 0)::bigint,
    coalesce(sum(cred - deb) filter (where account = 'iva_por_pagar'), 0)::bigint,
    coalesce(sum(deb - cred) filter (where account like 'costo_proveedor:%'), 0)::bigint,
    (coalesce(sum(cred - deb) filter (where account = 'comision:evepay'), 0)
     - coalesce(sum(deb - cred) filter (where account like 'costo_proveedor:%'), 0))::bigint,
    coalesce(sum(deb - cred) filter (where account like 'clearing:%' or account like '%\_clearing'), 0)::bigint,
    coalesce(sum(deb - cred) filter (where account in ('recaudo', 'banco')), 0)::bigint,
    coalesce(sum(cred - deb) filter (where account like 'por_pagar:%'), 0)::bigint,
    coalesce(sum(cred - deb) filter (where account like 'retenido:%'), 0)::bigint,
    coalesce(sum(deb) filter (where account like 'merchant_payable:%'), 0)::bigint
  from s;
$$;

grant execute on function evepay.admin_balance_comercio(uuid) to evepay_api;
