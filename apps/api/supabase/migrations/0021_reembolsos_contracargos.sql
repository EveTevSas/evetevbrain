-- Reembolsos y contracargos. Spec: specs/evepay/reembolsos-contracargos/ (Fase 11).
--
-- Con custodia, EvePay devuelve el dinero al pagador y responde ante la red.
-- Aquí viven los reembolsos (inmutables), los contracargos (solo avanzan),
-- el reparto proporcional que dice cuánto devuelve cada quien (misma fórmula
-- que repartirReembolso en @evetev/shared), el asiento que saca el dinero de
-- recaudo, el estado `reembolsado`, y la deuda del comercio cuando lo que se
-- devuelve ya se le había pagado: el siguiente lote la descuenta.

-- ---------------------------------------------------------------------------
-- Reembolsos: un hecho por devolución, parcial o total.
-- ---------------------------------------------------------------------------
create table if not exists evepay.reembolsos (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references identity.tenants(id),
  payment_id      uuid not null references evepay.payments(id),
  monto_minor     bigint not null check (monto_minor > 0),
  origen          text not null check (origen in ('reembolso', 'contracargo')),
  contracargo_id  uuid,
  motivo          text not null,
  fecha_pago      date not null,
  referencia_pago text not null,
  comprobante     text,
  parte_comercio  bigint not null check (parte_comercio >= 0),
  parte_comision  bigint not null check (parte_comision >= 0),
  parte_iva       bigint not null check (parte_iva >= 0),
  registrado_por  text not null,
  registrado_en   timestamptz not null default now(),
  constraint reembolsos_partes check (parte_comercio + parte_comision + parte_iva = monto_minor)
);

create index if not exists reembolsos_payment_idx on evepay.reembolsos (payment_id);
create index if not exists reembolsos_tenant_idx on evepay.reembolsos (tenant_id, registrado_en desc);

drop trigger if exists reembolsos_inmutable on evepay.reembolsos;
create trigger reembolsos_inmutable before update or delete on evepay.reembolsos
  for each row execute function audit.registro_inmutable();

alter table evepay.reembolsos enable row level security;

-- ---------------------------------------------------------------------------
-- Contracargos: recibido → en_evidencia → ganado | perdido.
-- ---------------------------------------------------------------------------
create table if not exists evepay.contracargos (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null references identity.tenants(id),
  payment_id             uuid not null references evepay.payments(id),
  monto_minor            bigint not null check (monto_minor > 0),
  motivo_red             text not null,
  referencia_red         text,
  fecha_limite_evidencia date not null,
  estado                 text not null default 'recibido'
                         check (estado in ('recibido', 'en_evidencia', 'ganado', 'perdido')),
  evidencia              text,
  recibido_por           text not null,
  recibido_en            timestamptz not null default now(),
  evidencia_por          text,
  evidencia_en           timestamptz,
  resuelto_por           text,
  resuelto_en            timestamptz,
  resolucion_nota        text
);

create index if not exists contracargos_payment_idx on evepay.contracargos (payment_id);
create index if not exists contracargos_estado_idx on evepay.contracargos (estado, fecha_limite_evidencia);
/* Un contracargo abierto por cobro. */
create unique index if not exists contracargos_abierto_uq
  on evepay.contracargos (payment_id) where estado in ('recibido', 'en_evidencia');

create or replace function evepay.contracargo_solo_avanza() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Los contracargos no se borran' using errcode = 'check_violation';
  end if;
  if old.estado in ('ganado', 'perdido') then
    raise exception 'El contracargo % ya está % y no se modifica', old.id, old.estado using errcode = 'check_violation';
  end if;
  if new.estado <> old.estado and not (
    (old.estado = 'recibido' and new.estado in ('en_evidencia', 'ganado', 'perdido')) or
    (old.estado = 'en_evidencia' and new.estado in ('ganado', 'perdido'))
  ) then
    raise exception 'Transición de contracargo no permitida: % → %', old.estado, new.estado using errcode = 'check_violation';
  end if;
  if new.payment_id <> old.payment_id or new.monto_minor <> old.monto_minor or new.tenant_id <> old.tenant_id then
    raise exception 'Los datos del contracargo % son inmutables', old.id using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists contracargos_avanza on evepay.contracargos;
create trigger contracargos_avanza before update or delete on evepay.contracargos
  for each row execute function evepay.contracargo_solo_avanza();

alter table evepay.contracargos enable row level security;

-- ---------------------------------------------------------------------------
-- Reparto de un reembolso R sobre un cobro de monto M, comisión C e IVA V:
-- proporcional, mitad arriba, la parte del comercio absorbe el resto. Misma
-- fórmula que repartirReembolso en @evetev/shared.
-- ---------------------------------------------------------------------------
create or replace function evepay.repartir_reembolso(p_r bigint, p_m bigint, p_c bigint, p_v bigint)
returns table (comercio bigint, comision bigint, iva bigint)
language sql
immutable
as $$
  with partes as (
    select least(floor((p_c::numeric * p_r * 2 + p_m) / (2 * p_m)), p_c)::bigint as comision,
           least(floor((p_v::numeric * p_r * 2 + p_m) / (2 * p_m)), p_v)::bigint as iva
  )
  select (p_r - comision - iva)::bigint, comision, iva from partes;
$$;

grant execute on function evepay.repartir_reembolso(bigint, bigint, bigint, bigint) to evepay_api;

/* Comisión e IVA fijados en un cobro (0 si no tiene tarifas). */
create or replace function evepay.comision_de_cobro(p_payment uuid)
returns table (monto bigint, comision bigint, iva bigint)
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  select p.amount_minor,
         case when tc.id is null then 0 else evepay.calcular_tarifa(p.amount_minor, tc.bps, tc.fijo_minor) end,
         case when tc.id is null then 0 else evepay.calcular_tarifa(evepay.calcular_tarifa(p.amount_minor, tc.bps, tc.fijo_minor), tc.iva_bps, 0) end
  from evepay.payments p left join evepay.tarifas_comercio tc on tc.id = p.tarifa_id
  where p.id = p_payment;
$$;

create or replace function evepay.reembolsado_de_cobro(p_payment uuid)
returns bigint
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  select coalesce(sum(monto_minor), 0)::bigint from evepay.reembolsos where payment_id = p_payment;
$$;

grant execute on function evepay.comision_de_cobro(uuid) to evepay_api;
grant execute on function evepay.reembolsado_de_cobro(uuid) to evepay_api;

-- ---------------------------------------------------------------------------
-- Aplicar un reembolso (interna): valida, reparte, asienta, cambia el estado
-- si completa el monto. La llaman el reembolso y el contracargo perdido.
-- ---------------------------------------------------------------------------
create or replace function evepay.aplicar_reembolso(
  p_payment     uuid,
  p_monto       bigint,
  p_origen      text,
  p_contracargo uuid,
  p_motivo      text,
  p_fecha       date,
  p_referencia  text,
  p_comprobante text,
  p_actor       text
) returns uuid
language plpgsql
security definer
set search_path = evepay, pg_temp
as $$
declare
  p          record;
  d          record;
  rep        record;
  v_restante bigint;
  v_id       uuid;
  v_entry    uuid;
  v_cuenta   text;
begin
  select * into p from evepay.payments where id = p_payment for update;
  if not found then
    raise exception 'El cobro % no existe', p_payment using errcode = 'no_data_found';
  end if;
  if p.status not in ('aprobado', 'conciliado') then
    raise exception 'El cobro está "%": solo se reembolsa un cobro aprobado o conciliado', p.status using errcode = 'check_violation';
  end if;
  if coalesce(trim(p_referencia), '') = '' then
    raise exception 'Falta la referencia del pago del reembolso' using errcode = 'check_violation';
  end if;

  v_restante := p.amount_minor - evepay.reembolsado_de_cobro(p_payment);
  if p_monto > v_restante then
    raise exception 'El reembolso (%) supera lo que queda por devolver del cobro (%)', p_monto, v_restante using errcode = 'check_violation';
  end if;

  select * into d from evepay.comision_de_cobro(p_payment);
  select * into rep from evepay.repartir_reembolso(p_monto, d.monto, d.comision, d.iva);

  insert into evepay.reembolsos (tenant_id, payment_id, monto_minor, origen, contracargo_id, motivo, fecha_pago, referencia_pago, comprobante,
                                 parte_comercio, parte_comision, parte_iva, registrado_por)
  values (p.tenant_id, p_payment, p_monto, p_origen, p_contracargo, trim(p_motivo), p_fecha, trim(p_referencia), p_comprobante,
          rep.comercio, rep.comision, rep.iva, p_actor)
  returning id into v_id;

  -- El dinero sale de donde esté: de recaudo si ya se consignó, de la
  -- compensación del proveedor si aún la tiene él.
  v_cuenta := case when p.status = 'conciliado' then 'recaudo' else 'clearing:' || p.provider end;

  insert into evepay.ledger_entries (tenant_id, payment_id, kind, memo)
  values (p.tenant_id, p_payment, 'cobro_reembolsado:' || left(v_id::text, 8),
          case when p_origen = 'contracargo' then 'Contracargo perdido ' else 'Reembolso ' end || trim(p_referencia) || ' · ' || p.reference)
  returning id into v_entry;

  if rep.comercio > 0 then
    insert into evepay.ledger_lines (entry_id, tenant_id, account, direction, amount_minor)
    values (v_entry, p.tenant_id, 'merchant_payable:' || p.merchant_id, 'debit', rep.comercio);
  end if;
  if rep.comision > 0 then
    insert into evepay.ledger_lines (entry_id, tenant_id, account, direction, amount_minor)
    values (v_entry, p.tenant_id, 'comision:evepay', 'debit', rep.comision);
  end if;
  if rep.iva > 0 then
    insert into evepay.ledger_lines (entry_id, tenant_id, account, direction, amount_minor)
    values (v_entry, p.tenant_id, 'iva_por_pagar', 'debit', rep.iva);
  end if;
  insert into evepay.ledger_lines (entry_id, tenant_id, account, direction, amount_minor)
  values (v_entry, p.tenant_id, v_cuenta, 'credit', p_monto);

  if p_monto = v_restante then
    update evepay.payments set status = 'reembolsado', updated_at = now() where id = p_payment;
    insert into evepay.payment_audit (tenant_id, payment_id, from_status, to_status, actor, data)
    values (p.tenant_id, p_payment, p.status, 'reembolsado', p_actor,
            jsonb_build_object('origen', p_origen, 'reembolsoId', v_id, 'referenciaPago', trim(p_referencia)));
  end if;

  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Reembolso asistido (finanzas): se pagó desde el banco y se registra.
-- ---------------------------------------------------------------------------
create or replace function evepay.admin_registrar_reembolso(
  p_payment uuid, p_monto bigint, p_motivo text, p_fecha date, p_referencia text, p_comprobante text, p_actor text, p_rol text
) returns uuid
language plpgsql
security definer
set search_path = evepay, audit, pg_temp
as $$
declare v_id uuid; v_tenant uuid;
begin
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Hay que decir por qué se reembolsa' using errcode = 'check_violation';
  end if;
  v_id := evepay.aplicar_reembolso(p_payment, p_monto, 'reembolso', null, p_motivo, p_fecha, p_referencia, p_comprobante, p_actor);
  select tenant_id into v_tenant from evepay.payments where id = p_payment;
  perform audit.registrar_accion_admin(p_actor, 'reembolso.registrar', 'reembolso', v_id::text,
    jsonb_build_object('paymentId', p_payment, 'tenantId', v_tenant, 'montoMinor', p_monto, 'referenciaPago', trim(p_referencia), 'rol', p_rol));
  return v_id;
end $$;

grant execute on function evepay.admin_registrar_reembolso(uuid, bigint, text, date, text, text, text, text) to evepay_api;

-- ---------------------------------------------------------------------------
-- Contracargos.
-- ---------------------------------------------------------------------------
create or replace function evepay.admin_registrar_contracargo(
  p_payment uuid, p_monto bigint, p_motivo_red text, p_referencia_red text, p_fecha_limite date, p_actor text, p_rol text
) returns uuid
language plpgsql
security definer
set search_path = evepay, audit, pg_temp
as $$
declare p record; v_id uuid; v_restante bigint;
begin
  select * into p from evepay.payments where id = p_payment for update;
  if not found then
    raise exception 'El cobro % no existe', p_payment using errcode = 'no_data_found';
  end if;
  if p.status not in ('aprobado', 'conciliado') then
    raise exception 'El cobro está "%": un contracargo solo aplica a un cobro aprobado o conciliado', p.status using errcode = 'check_violation';
  end if;
  v_restante := p.amount_minor - evepay.reembolsado_de_cobro(p_payment);
  if p_monto > v_restante then
    raise exception 'El contracargo (%) supera lo que queda del cobro (%)', p_monto, v_restante using errcode = 'check_violation';
  end if;
  if exists (select 1 from evepay.contracargos where payment_id = p_payment and estado in ('recibido', 'en_evidencia')) then
    raise exception 'El cobro ya tiene un contracargo abierto' using errcode = 'check_violation';
  end if;

  insert into evepay.contracargos (tenant_id, payment_id, monto_minor, motivo_red, referencia_red, fecha_limite_evidencia, recibido_por)
  values (p.tenant_id, p_payment, p_monto, trim(p_motivo_red), p_referencia_red, p_fecha_limite, p_actor)
  returning id into v_id;

  perform audit.registrar_accion_admin(p_actor, 'contracargo.registrar', 'contracargo', v_id::text,
    jsonb_build_object('paymentId', p_payment, 'tenantId', p.tenant_id, 'montoMinor', p_monto, 'fechaLimite', p_fecha_limite, 'rol', p_rol));
  return v_id;
end $$;

create or replace function evepay.admin_contracargo_evidencia(p_id uuid, p_evidencia text, p_actor text, p_rol text)
returns void
language plpgsql
security definer
set search_path = evepay, audit, pg_temp
as $$
declare c record;
begin
  select * into c from evepay.contracargos where id = p_id for update;
  if not found then
    raise exception 'El contracargo % no existe', p_id using errcode = 'no_data_found';
  end if;
  if c.estado not in ('recibido', 'en_evidencia') then
    raise exception 'El contracargo está %: ya no admite evidencia', c.estado using errcode = 'check_violation';
  end if;
  if coalesce(trim(p_evidencia), '') = '' then
    raise exception 'La evidencia no puede estar vacía' using errcode = 'check_violation';
  end if;
  update evepay.contracargos
  set estado = 'en_evidencia', evidencia = trim(p_evidencia), evidencia_por = p_actor, evidencia_en = now()
  where id = p_id;
  perform audit.registrar_accion_admin(p_actor, 'contracargo.evidencia', 'contracargo', p_id::text,
    jsonb_build_object('tenantId', c.tenant_id, 'paymentId', c.payment_id, 'rol', p_rol));
end $$;

-- Ganado: nada cambia en el libro. Perdido: sale el dinero como un reembolso
-- por el monto del contracargo, con la referencia con que la red lo debitó.
create or replace function evepay.admin_resolver_contracargo(
  p_id uuid, p_resultado text, p_nota text, p_fecha date, p_referencia text, p_actor text, p_rol text
) returns void
language plpgsql
security definer
set search_path = evepay, audit, pg_temp
as $$
declare c record; v_reembolso uuid;
begin
  select * into c from evepay.contracargos where id = p_id for update;
  if not found then
    raise exception 'El contracargo % no existe', p_id using errcode = 'no_data_found';
  end if;
  if c.estado not in ('recibido', 'en_evidencia') then
    raise exception 'El contracargo ya está %', c.estado using errcode = 'check_violation';
  end if;
  if p_resultado not in ('ganado', 'perdido') then
    raise exception 'El resultado es ganado o perdido' using errcode = 'check_violation';
  end if;

  if p_resultado = 'perdido' then
    v_reembolso := evepay.aplicar_reembolso(
      c.payment_id, c.monto_minor, 'contracargo', c.id,
      'Contracargo perdido: ' || c.motivo_red, coalesce(p_fecha, (now() at time zone 'America/Bogota')::date),
      coalesce(p_referencia, c.referencia_red, 'contracargo ' || left(c.id::text, 8)), null, p_actor
    );
  end if;

  update evepay.contracargos
  set estado = p_resultado, resuelto_por = p_actor, resuelto_en = now(), resolucion_nota = p_nota
  where id = p_id;

  perform audit.registrar_accion_admin(p_actor, 'contracargo.resolver', 'contracargo', p_id::text,
    jsonb_build_object('tenantId', c.tenant_id, 'paymentId', c.payment_id, 'resultado', p_resultado,
                       'montoMinor', c.monto_minor, 'reembolsoId', v_reembolso, 'rol', p_rol));
end $$;

grant execute on function evepay.admin_registrar_contracargo(uuid, bigint, text, text, date, text, text) to evepay_api;
grant execute on function evepay.admin_contracargo_evidencia(uuid, text, text, text) to evepay_api;
grant execute on function evepay.admin_resolver_contracargo(uuid, text, text, date, text, text, text) to evepay_api;

create or replace function evepay.admin_listar_reembolsos(p_payment uuid default null, p_limite int default 100)
returns table (
  id uuid, tenant_id uuid, tenant_nombre text, payment_id uuid, reference text, monto_minor bigint, origen text,
  contracargo_id uuid, motivo text, fecha_pago date, referencia_pago text, comprobante text,
  parte_comercio bigint, parte_comision bigint, parte_iva bigint, registrado_por text, registrado_en timestamptz
)
language sql
security definer
set search_path = evepay, identity, pg_temp
stable
as $$
  select r.id, r.tenant_id, t.display_name, r.payment_id, p.reference, r.monto_minor, r.origen, r.contracargo_id,
         r.motivo, r.fecha_pago, r.referencia_pago, r.comprobante, r.parte_comercio, r.parte_comision, r.parte_iva,
         r.registrado_por, r.registrado_en
  from evepay.reembolsos r
  join identity.tenants t on t.id = r.tenant_id
  join evepay.payments p on p.id = r.payment_id
  where p_payment is null or r.payment_id = p_payment
  order by r.registrado_en desc
  limit least(greatest(coalesce(p_limite, 100), 1), 500);
$$;

create or replace function evepay.admin_listar_contracargos(p_estado text default null, p_payment uuid default null, p_limite int default 100)
returns table (
  id uuid, tenant_id uuid, tenant_nombre text, payment_id uuid, reference text, payment_status text, amount_minor bigint,
  monto_minor bigint, motivo_red text, referencia_red text, fecha_limite_evidencia date, estado text, evidencia text,
  recibido_por text, recibido_en timestamptz, evidencia_por text, evidencia_en timestamptz,
  resuelto_por text, resuelto_en timestamptz, resolucion_nota text, dias_para_evidencia int
)
language sql
security definer
set search_path = evepay, identity, pg_temp
stable
as $$
  select c.id, c.tenant_id, t.display_name, c.payment_id, p.reference, p.status, p.amount_minor,
         c.monto_minor, c.motivo_red, c.referencia_red, c.fecha_limite_evidencia, c.estado, c.evidencia,
         c.recibido_por, c.recibido_en, c.evidencia_por, c.evidencia_en, c.resuelto_por, c.resuelto_en, c.resolucion_nota,
         (c.fecha_limite_evidencia - (now() at time zone 'America/Bogota')::date)::int
  from evepay.contracargos c
  join identity.tenants t on t.id = c.tenant_id
  join evepay.payments p on p.id = c.payment_id
  where (p_estado is null or c.estado = p_estado) and (p_payment is null or c.payment_id = p_payment)
  order by (c.estado in ('recibido', 'en_evidencia')) desc, c.fecha_limite_evidencia, c.recibido_en desc
  limit least(greatest(coalesce(p_limite, 100), 1), 500);
$$;

grant execute on function evepay.admin_listar_reembolsos(uuid, int) to evepay_api;
grant execute on function evepay.admin_listar_contracargos(text, uuid, int) to evepay_api;

-- ---------------------------------------------------------------------------
-- La deuda del comercio (merchant_payable en negativo) se descuenta del
-- siguiente lote: el lote transfiere disponible − deuda y un item `deuda`
-- deja el rastro; al pagar, débito recaudo / crédito merchant_payable por la
-- deuda hace que la cuenta vuelva a cero.
-- ---------------------------------------------------------------------------
alter table evepay.lotes_dispersion add column if not exists deuda_minor bigint not null default 0 check (deuda_minor >= 0);

alter table evepay.lote_items drop constraint if exists lote_items_tipo_check;
alter table evepay.lote_items add constraint lote_items_tipo_check check (tipo in ('cobro', 'reserva_liberada', 'deuda'));
alter table evepay.lote_items drop constraint if exists lote_items_forma;
alter table evepay.lote_items add constraint lote_items_forma check (
  (tipo = 'cobro' and payment_id is not null and retencion_id is null) or
  (tipo = 'reserva_liberada' and retencion_id is not null and payment_id is null) or
  (tipo = 'deuda' and payment_id is null and retencion_id is null)
);

-- Deuda del comercio: lo que se le debe por los cobros que aún no se le han
-- dispersado (neto de lo ya reembolsado de cada uno), menos lo que dice su
-- cuenta. Si la cuenta dice menos, es porque se le devolvió al pagador dinero
-- que ya se le había pagado a él. No basta mirar si merchant_payable es
-- negativa: un cobro nuevo la vuelve positiva sin que la deuda se haya saldado.
create or replace function evepay.deuda_de_comercio(p_tenant uuid)
returns bigint
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  with sin_dispersar as (
    select coalesce(sum(
      evepay.al_comercio(p.amount_minor, tc.bps, tc.fijo_minor, tc.iva_bps)
      - coalesce((select sum(r.parte_comercio) from evepay.reembolsos r where r.payment_id = p.id), 0)
    ), 0)::bigint as total
    from evepay.payments p
    left join evepay.tarifas_comercio tc on tc.id = p.tarifa_id
    where p.tenant_id = p_tenant
      and p.status in ('aprobado', 'conciliado', 'reembolsado')
      and not exists (
        select 1 from evepay.lote_items li join evepay.lotes_dispersion l on l.id = li.lote_id
        where li.payment_id = p.id and l.estado = 'pagado'
      )
  ),
  cuenta as (
    select coalesce(sum(case when l.direction = 'credit' then l.amount_minor else -l.amount_minor end), 0)::bigint as saldo
    from evepay.ledger_lines l
    where l.tenant_id = p_tenant and l.account like 'merchant_payable:%'
  )
  select greatest(0, sin_dispersar.total - cuenta.saldo)::bigint from sin_dispersar, cuenta;
$$;

grant execute on function evepay.deuda_de_comercio(uuid) to evepay_api;

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
  v_deuda      bigint := 0;
  v_saldado    bigint := 0;
  v_n          int := 0;
  v_acum       bigint := 0;
  v_parte      bigint;
  v_i          int := 0;
  v_primer     record;
  r            record;
begin
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

  select coalesce(sum(al_comercio), 0), count(*) into v_total, v_n
  from evepay.cobros_dispersables(p_tenant) where elegible and al_comercio > 0;
  select coalesce(sum(monto_minor), 0) into v_liberadas from evepay.reservas_por_pagar(p_tenant);

  if v_n = 0 and v_liberadas = 0 then
    return null;
  end if;

  v_reserva := evepay.calcular_tarifa(v_total, v_pol.reserva_bps, 0);
  -- Deuda por reembolsos o contracargos de cobros ya pagados: se salda antes
  -- de transferir un peso más, hasta donde alcance este lote.
  v_deuda := evepay.deuda_de_comercio(p_tenant);
  v_saldado := least(v_deuda, v_total - v_reserva + v_liberadas);

  insert into evepay.lotes_dispersion (
    tenant_id, monto_minor, reserva_minor, deuda_minor, banco, tipo_cuenta, numero_cuenta, titular_cuenta, titular_documento, preparado_por
  ) values (
    p_tenant, v_total - v_reserva + v_liberadas - v_saldado, v_reserva, v_saldado,
    v_perfil.banco, coalesce(v_perfil.tipo_cuenta, ''), v_perfil.numero_cuenta,
    coalesce(v_perfil.titular_cuenta, ''), v_perfil.titular_documento, p_actor
  ) returning id into v_lote;

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

  if v_saldado > 0 then
    insert into evepay.lote_items (lote_id, tenant_id, tipo, monto_minor)
    values (v_lote, p_tenant, 'deuda', v_saldado);
  end if;

  if v_reserva > 0 then
    insert into evepay.retenciones (tenant_id, tipo, lote_id, monto_minor, liberar_desde, motivo, creada_por)
    values (p_tenant, 'reserva', v_lote, v_reserva,
            (now() at time zone 'America/Bogota')::date + v_pol.dias_reserva,
            format('Reserva del %s %% del lote', (v_pol.reserva_bps::numeric / 100)), p_actor);
  end if;

  perform audit.registrar_accion_admin(
    p_actor, 'lote.preparar', 'lote', v_lote::text,
    jsonb_build_object('tenantId', p_tenant, 'montoMinor', v_total - v_reserva + v_liberadas - v_saldado,
                       'reservaMinor', v_reserva, 'deudaMinor', v_saldado, 'cobros', v_n, 'rol', p_rol)
  );
  return v_lote;
end $$;

-- El pago del lote asienta también el item de deuda.
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
  v_merchant uuid;
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

  select m.id into v_merchant from evepay.merchants m where m.tenant_id = v.tenant_id limit 1;

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
    elsif it.tipo = 'reserva_liberada' then
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
    else
      -- Deuda saldada: el dinero se queda en recaudo y la cuenta del comercio vuelve a cero.
      insert into evepay.ledger_entries (tenant_id, payment_id, kind, memo)
      values (it.tenant_id, null, 'deuda_saldada', 'Deuda por reembolsos saldada en el lote ' || trim(p_referencia))
      returning id into v_entry;

      insert into evepay.ledger_lines (entry_id, tenant_id, account, direction, amount_minor)
      values (v_entry, it.tenant_id, 'recaudo', 'debit', it.monto_minor),
             (v_entry, it.tenant_id, 'merchant_payable:' || v_merchant, 'credit', it.monto_minor);
    end if;
  end loop;

  perform audit.registrar_accion_admin(
    p_actor, 'lote.pagar', 'lote', p_lote::text,
    jsonb_build_object('tenantId', v.tenant_id, 'montoMinor', v.monto_minor, 'reservaMinor', v.reserva_minor, 'deudaMinor', v.deuda_minor,
                       'referenciaPago', trim(p_referencia), 'fechaPago', p_fecha, 'aprobadoPor', v.aprobado_por, 'rol', p_rol)
  );
end $$;

-- El listado y los items muestran la deuda.
drop function if exists evepay.admin_listar_lotes(text, int);
create function evepay.admin_listar_lotes(p_estado text default null, p_limite int default 50)
returns table (
  id uuid, tenant_id uuid, tenant_nombre text, estado text, monto_minor bigint, reserva_minor bigint, deuda_minor bigint,
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
  select l.id, l.tenant_id, t.display_name, l.estado, l.monto_minor, l.reserva_minor, l.deuda_minor,
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

-- El balance de dispersión muestra la deuda.
drop function if exists evepay.admin_balances_dispersion();
drop function if exists evepay.admin_balance_dispersion(uuid);
create function evepay.admin_balance_dispersion(p_tenant uuid)
returns table (
  disponible_minor   bigint,
  pendiente_minor    bigint,
  retenido_minor     bigint,
  en_lote_minor      bigint,
  deuda_minor        bigint,
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
    evepay.deuda_de_comercio(p_tenant),
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

create function evepay.admin_balances_dispersion()
returns table (
  tenant_id          uuid,
  tenant_nombre      text,
  tenant_estado      text,
  disponible_minor   bigint,
  pendiente_minor    bigint,
  retenido_minor     bigint,
  en_lote_minor      bigint,
  deuda_minor        bigint,
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
  select t.id, t.display_name, t.status, b.*, l.id, l.estado
  from identity.tenants t
  cross join lateral evepay.admin_balance_dispersion(t.id) b
  left join evepay.lotes_dispersion l on l.tenant_id = t.id and l.estado in ('programado', 'aprobado')
  order by b.disponible_minor desc, t.display_name;
$$;

grant execute on function evepay.admin_balance_dispersion(uuid) to evepay_api;
grant execute on function evepay.admin_balances_dispersion() to evepay_api;

-- Las reglas de tarjeta traen otros parámetros.
alter table evepay.reglas_riesgo drop constraint if exists reglas_riesgo_tipo_check;
alter table evepay.reglas_riesgo add constraint reglas_riesgo_tipo_check
  check (tipo in ('limite_transaccion', 'limite_diario', 'limite_mensual', 'monto_atipico', 'geo_mismatch', 'intentos_tarjeta', 'score_proveedor'));
alter table evepay.reglas_riesgo drop constraint if exists reglas_riesgo_parametros;
alter table evepay.reglas_riesgo add constraint reglas_riesgo_parametros check (
  (tipo = 'monto_atipico' and (parametros->>'factor') is not null and (parametros->>'minimoCobros') is not null)
  or (tipo in ('limite_transaccion', 'limite_diario', 'limite_mensual') and (parametros->>'limiteMinor') is not null)
  or (tipo = 'geo_mismatch' and (parametros->>'montoMinimoMinor') is not null)
  or (tipo = 'intentos_tarjeta' and (parametros->>'maxIntentos') is not null)
  or (tipo = 'score_proveedor' and (parametros->>'scoreMaximo') is not null)
);

insert into evepay.reglas_riesgo (nombre, tipo, tenant_id, parametros, accion, modo, prioridad, creada_por, actualizada_por)
select v.nombre, v.tipo, null, v.parametros::jsonb, 'retener', 'shadow', v.prioridad, 'migracion-0021', 'migracion-0021'
from (values
  ('País de la tarjeta distinto al de la IP', 'geo_mismatch', '{"montoMinimoMinor": 200000}', 50),
  ('Muchos intentos con la misma tarjeta', 'intentos_tarjeta', '{"maxIntentos": 3}', 60),
  ('Score alto del proveedor', 'score_proveedor', '{"scoreMaximo": 80}', 70)
) as v(nombre, tipo, parametros, prioridad)
where not exists (select 1 from evepay.reglas_riesgo r where r.tenant_id is null and r.tipo = v.tipo);
