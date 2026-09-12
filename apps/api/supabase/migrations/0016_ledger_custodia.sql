-- Ledger con custodia. Spec: specs/evepay/ledger-custodia/ (Fase 6).
--
-- EvePay custodia dinero de terceros: ComboPay consigna TODO el recaudo a la
-- cuenta de EvePay y EvePay dispersa a cada comercio. Esta migración pone en
-- la base lo que ese modelo necesita y el código no puede garantizar solo:
--
--   1. Que ningún asiento quede descuadrado, aunque el servicio se equivoque
--      (trigger diferido: se comprueba al confirmar la transacción).
--   2. La consignación asistida: ComboPay no expone liquidaciones por API, así
--      que operación registra lo que ve en el extracto y marca qué cobros
--      cubre. Si el monto no cuadra con lo que el libro dice que el proveedor
--      debía, se rechaza entera. Todo en una transacción: cobros a
--      `conciliado`, asientos y rastro, o nada.
--   3. El saldo real de la cuenta de recaudo, registrado a mano, para
--      compararlo con el libro: el cuadre de custodia.
--   4. El balance de cada comercio con el signo de la naturaleza de cada cuenta.

-- ---------------------------------------------------------------------------
-- Tarifas por id: las versiones fijadas en cada cobro, que el ledger lee al
-- asentar. SECURITY DEFINER porque tarifas_proveedor no tiene lectura directa.
-- ---------------------------------------------------------------------------
create or replace function evepay.tarifa_por_id(p_id uuid)
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
  where t.id = p_id;
$$;

create or replace function evepay.tarifa_proveedor_por_id(p_id uuid)
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
  where t.id = p_id;
$$;

grant execute on function evepay.tarifa_por_id(uuid) to evepay_api;
grant execute on function evepay.tarifa_proveedor_por_id(uuid) to evepay_api;

-- ---------------------------------------------------------------------------
-- La misma regla de dinero que calcularTarifa en @evetev/shared:
-- redondeo_mitad_arriba(monto × bps / 10 000) + fijo, en enteros. El producto
-- se hace en numeric (como el BigInt de TypeScript) porque monto × bps puede
-- salirse de bigint; el resultado, siempre menor que el monto, vuelve a
-- bigint. Un test compara las dos implementaciones sobre los mismos montos.
-- ---------------------------------------------------------------------------
create or replace function evepay.calcular_tarifa(p_monto bigint, p_bps int, p_fijo bigint)
returns bigint
language sql
immutable
as $$
  select (floor((p_monto::numeric * p_bps + 5000) / 10000) + p_fijo)::bigint;
$$;

grant execute on function evepay.calcular_tarifa(bigint, int, bigint) to evepay_api;

-- ---------------------------------------------------------------------------
-- CA-10: ningún asiento confirma descuadrado.
--
-- Es un CONSTRAINT TRIGGER diferido: se evalúa al confirmar la transacción,
-- cuando ya están todas las líneas del asiento (una a una nunca cuadran).
-- SECURITY DEFINER para que la suma vea todas las líneas del asiento aunque
-- quien inserta esté bajo RLS.
-- ---------------------------------------------------------------------------
create or replace function evepay.ledger_asiento_balanceado() returns trigger
language plpgsql
security definer
set search_path = evepay, pg_temp
as $$
declare v_diferencia bigint;
begin
  select coalesce(sum(case when l.direction = 'debit' then l.amount_minor else -l.amount_minor end), 0)
  into v_diferencia
  from evepay.ledger_lines l
  where l.entry_id = new.entry_id;

  if v_diferencia <> 0 then
    raise exception 'El asiento % no cuadra: débitos − créditos = %', new.entry_id, v_diferencia
      using errcode = 'check_violation';
  end if;
  return null;
end $$;

drop trigger if exists ledger_lines_balance on evepay.ledger_lines;
create constraint trigger ledger_lines_balance
  after insert on evepay.ledger_lines
  deferrable initially deferred
  for each row execute function evepay.ledger_asiento_balanceado();

-- ---------------------------------------------------------------------------
-- Consignaciones del proveedor a la cuenta de recaudo (CA-4 a CA-7).
--
-- Es un movimiento de la cuenta de Evetev que cruza comercios: RLS activo sin
-- políticas y se entra solo por la función de abajo. Inmutable: registrar una
-- consignación es un hecho; si estuvo mal, se compensa, no se edita.
-- ---------------------------------------------------------------------------
create table if not exists evepay.consignaciones (
  id                  uuid primary key default gen_random_uuid(),
  provider            text not null,
  /* Lo que identifica el movimiento en el extracto del banco. */
  referencia_bancaria text not null check (length(trim(referencia_bancaria)) > 0),
  fecha               date not null,
  monto_minor         bigint not null check (monto_minor > 0),
  nota                text,
  registrada_por      text not null,
  registrada_en       timestamptz not null default now(),
  /* CA-7: la misma referencia de un proveedor no entra dos veces. */
  unique (provider, referencia_bancaria)
);

create index if not exists consignaciones_fecha_idx on evepay.consignaciones (fecha desc, registrada_en desc);

drop trigger if exists consignaciones_inmutable on evepay.consignaciones;
create trigger consignaciones_inmutable before update or delete on evepay.consignaciones
  for each row execute function audit.registro_inmutable();

alter table evepay.consignaciones enable row level security;

/* Qué cobros cubre cada consignación y cuánto se esperaba de cada uno. El
   payment_id es ÚNICO: un cobro no puede estar en dos consignaciones (CA-6). */
create table if not exists evepay.consignacion_cobros (
  consignacion_id uuid not null references evepay.consignaciones(id),
  payment_id      uuid not null unique references evepay.payments(id),
  tenant_id       uuid not null references identity.tenants(id),
  /* Lo que el proveedor debía por este cobro: M − P si descuenta su tarifa, M si no. */
  esperado_minor  bigint not null check (esperado_minor >= 0),
  primary key (consignacion_id, payment_id)
);

create index if not exists consignacion_cobros_tenant_idx on evepay.consignacion_cobros (tenant_id);

drop trigger if exists consignacion_cobros_inmutable on evepay.consignacion_cobros;
create trigger consignacion_cobros_inmutable before update or delete on evepay.consignacion_cobros
  for each row execute function audit.registro_inmutable();

alter table evepay.consignacion_cobros enable row level security;

-- Lo que el proveedor debe por un cobro, con la tarifa fijada en él. Sin
-- tarifa (cobros anteriores a la Fase 6) debe el monto completo.
create or replace function evepay.esperado_del_proveedor(
  p_monto bigint, p_bps int, p_fijo bigint, p_descuenta boolean
) returns bigint
language sql
immutable
as $$
  select case
    when p_bps is null then p_monto
    when p_descuenta then p_monto - evepay.calcular_tarifa(p_monto, p_bps, p_fijo)
    else p_monto
  end;
$$;

-- ---------------------------------------------------------------------------
-- Registrar una consignación: TODO o NADA.
--
-- Bloquea los cobros, comprueba que cada uno esté aprobado y sea del
-- proveedor, suma lo que el proveedor debía por ellos con las tarifas fijadas
-- y exige que el monto consignado sea EXACTAMENTE eso. Si cuadra, en la misma
-- transacción: guarda la consignación y sus cobros, pasa cada cobro a
-- `conciliado` con su fila de auditoría, asienta débito `recaudo` / crédito
-- `clearing:<proveedor>` por lo esperado de cada uno, y deja el rastro admin.
-- Cualquier excepción deshace todo, incluida la del trigger de balance.
-- ---------------------------------------------------------------------------
create or replace function evepay.admin_registrar_consignacion(
  p_provider    text,
  p_referencia  text,
  p_fecha       date,
  p_monto       bigint,
  p_payment_ids uuid[],
  p_actor       text,
  p_nota        text default null
) returns uuid
language plpgsql
security definer
set search_path = evepay, audit, pg_temp
as $$
declare
  v_id        uuid;
  v_entry     uuid;
  v_total     bigint := 0;
  v_esperado  bigint;
  v_vistos    int := 0;
  v_tenants   int;
  r           record;
begin
  if p_payment_ids is null or cardinality(p_payment_ids) = 0 then
    raise exception 'La consignación debe cubrir al menos un cobro' using errcode = 'check_violation';
  end if;
  if (select count(distinct x) from unnest(p_payment_ids) x) <> cardinality(p_payment_ids) then
    raise exception 'Hay cobros repetidos en la consignación' using errcode = 'check_violation';
  end if;

  -- CA-7: la misma referencia no entra dos veces. El índice único lo garantiza
  -- bajo concurrencia; esta comprobación da un mensaje que operación entiende.
  if exists (select 1 from evepay.consignaciones c where c.provider = p_provider and c.referencia_bancaria = trim(p_referencia)) then
    raise exception 'La referencia bancaria "%" de % ya está registrada', trim(p_referencia), p_provider
      using errcode = 'unique_violation';
  end if;

  insert into evepay.consignaciones (provider, referencia_bancaria, fecha, monto_minor, nota, registrada_por)
  values (p_provider, trim(p_referencia), p_fecha, p_monto, p_nota, p_actor)
  returning id into v_id;

  for r in
    select p.id, p.tenant_id, p.amount_minor, p.status, p.provider, p.reference,
           tp.bps, tp.fijo_minor, tp.descuenta_en_consignacion
    from unnest(p_payment_ids) as ids(id)
    join evepay.payments p on p.id = ids.id
    left join evepay.tarifas_proveedor tp on tp.id = p.tarifa_proveedor_id
    for update of p
  loop
    v_vistos := v_vistos + 1;

    if r.status <> 'aprobado' then
      raise exception 'El cobro % (%) está en "%": solo se consignan cobros aprobados', r.id, r.reference, r.status
        using errcode = 'check_violation';
    end if;
    if r.provider <> p_provider then
      raise exception 'El cobro % (%) es de "%", no de "%"', r.id, r.reference, r.provider, p_provider
        using errcode = 'check_violation';
    end if;

    v_esperado := evepay.esperado_del_proveedor(r.amount_minor, r.bps, r.fijo_minor, r.descuenta_en_consignacion);
    if v_esperado < 0 then
      raise exception 'La tarifa del proveedor supera el monto del cobro % (%)', r.id, r.reference
        using errcode = 'check_violation';
    end if;
    v_total := v_total + v_esperado;

    -- CA-6: un cobro no puede estar en dos consignaciones. El UNIQUE de
    -- payment_id lo garantiza; esto lo dice con nombre y apellido.
    if exists (select 1 from evepay.consignacion_cobros c where c.payment_id = r.id) then
      raise exception 'El cobro % (%) ya pertenece a otra consignación', r.id, r.reference
        using errcode = 'check_violation';
    end if;

    insert into evepay.consignacion_cobros (consignacion_id, payment_id, tenant_id, esperado_minor)
    values (v_id, r.id, r.tenant_id, v_esperado);

    update evepay.payments set status = 'conciliado', updated_at = now() where id = r.id;

    insert into evepay.payment_audit (tenant_id, payment_id, from_status, to_status, actor, data)
    values (r.tenant_id, r.id, 'aprobado', 'conciliado', p_actor,
            jsonb_build_object('consignacionId', v_id, 'referenciaBancaria', trim(p_referencia), 'esperadoMinor', v_esperado));

    if v_esperado > 0 then
      insert into evepay.ledger_entries (tenant_id, payment_id, kind, memo)
      values (r.tenant_id, r.id, 'cobro_conciliado', 'Consignación ' || trim(p_referencia) || ' · ' || r.reference)
      returning id into v_entry;

      insert into evepay.ledger_lines (entry_id, tenant_id, account, direction, amount_minor)
      values (v_entry, r.tenant_id, 'recaudo', 'debit', v_esperado),
             (v_entry, r.tenant_id, 'clearing:' || p_provider, 'credit', v_esperado);
    end if;
  end loop;

  if v_vistos <> cardinality(p_payment_ids) then
    raise exception 'Alguno de los cobros no existe' using errcode = 'no_data_found';
  end if;

  -- CA-5: el monto consignado tiene que ser exactamente lo que el proveedor debía.
  if v_total <> p_monto then
    raise exception 'La consignación no cuadra: por estos cobros el proveedor debía % y consignó % (diferencia %)',
      v_total, p_monto, p_monto - v_total
      using errcode = 'check_violation';
  end if;

  select count(distinct tenant_id) into v_tenants from evepay.consignacion_cobros where consignacion_id = v_id;

  perform audit.registrar_accion_admin(
    p_actor, 'consignacion.registrar', 'consignacion', v_id::text,
    jsonb_build_object(
      'provider', p_provider, 'referenciaBancaria', trim(p_referencia), 'fecha', p_fecha,
      'montoMinor', p_monto, 'cobros', v_vistos, 'comercios', v_tenants
    )
  );

  return v_id;
end $$;

grant execute on function evepay.admin_registrar_consignacion(text, text, date, bigint, uuid[], text, text) to evepay_api;

-- Cobros aprobados del proveedor que aún no están en ninguna consignación:
-- lo que operación puede marcar al registrar una. Trae lo esperado de cada uno
-- para que la consola sume en vivo y solo confirme si cuadra.
create or replace function evepay.admin_cobros_por_consignar(p_provider text)
returns table (
  payment_id          uuid,
  tenant_id           uuid,
  tenant_nombre       text,
  reference           text,
  provider_payment_id text,
  amount_minor        bigint,
  esperado_minor      bigint,
  created_at          timestamptz
)
language sql
security definer
set search_path = evepay, identity, pg_temp
stable
as $$
  select p.id, p.tenant_id, t.display_name, p.reference, p.provider_payment_id, p.amount_minor,
         evepay.esperado_del_proveedor(p.amount_minor, tp.bps, tp.fijo_minor, tp.descuenta_en_consignacion),
         p.created_at
  from evepay.payments p
  join identity.tenants t on t.id = p.tenant_id
  left join evepay.tarifas_proveedor tp on tp.id = p.tarifa_proveedor_id
  where p.status = 'aprobado'
    and p.provider = p_provider
    and not exists (select 1 from evepay.consignacion_cobros c where c.payment_id = p.id)
  order by p.created_at;
$$;

grant execute on function evepay.admin_cobros_por_consignar(text) to evepay_api;

create or replace function evepay.admin_listar_consignaciones(p_limite int default 50)
returns table (
  id                  uuid,
  provider            text,
  referencia_bancaria text,
  fecha               date,
  monto_minor         bigint,
  nota                text,
  cobros              bigint,
  comercios           bigint,
  registrada_por      text,
  registrada_en       timestamptz
)
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  select c.id, c.provider, c.referencia_bancaria, c.fecha, c.monto_minor, c.nota,
         count(cc.payment_id), count(distinct cc.tenant_id), c.registrada_por, c.registrada_en
  from evepay.consignaciones c
  left join evepay.consignacion_cobros cc on cc.consignacion_id = c.id
  group by c.id
  order by c.fecha desc, c.registrada_en desc
  limit least(greatest(coalesce(p_limite, 50), 1), 200);
$$;

grant execute on function evepay.admin_listar_consignaciones(int) to evepay_api;

-- ---------------------------------------------------------------------------
-- Saldo real de la cuenta de recaudo, tomado del extracto (CA-8). Inmutable:
-- una corrección es un registro nuevo para la misma fecha, y vale el último.
-- ---------------------------------------------------------------------------
create table if not exists evepay.saldos_recaudo (
  id             uuid primary key default gen_random_uuid(),
  fecha          date not null,
  saldo_minor    bigint not null check (saldo_minor >= 0),
  nota           text,
  registrado_por text not null,
  registrado_en  timestamptz not null default now(),
  /* Desempate: dos registros en la misma transacción comparten now(). */
  secuencia      bigint generated always as identity
);

create index if not exists saldos_recaudo_fecha_idx on evepay.saldos_recaudo (fecha desc, secuencia desc);

drop trigger if exists saldos_recaudo_inmutable on evepay.saldos_recaudo;
create trigger saldos_recaudo_inmutable before update or delete on evepay.saldos_recaudo
  for each row execute function audit.registro_inmutable();

alter table evepay.saldos_recaudo enable row level security;

create or replace function evepay.admin_registrar_saldo_recaudo(
  p_fecha date,
  p_saldo bigint,
  p_actor text,
  p_nota  text default null
) returns uuid
language plpgsql
security definer
set search_path = evepay, audit, pg_temp
as $$
declare v_id uuid;
begin
  insert into evepay.saldos_recaudo (fecha, saldo_minor, nota, registrado_por)
  values (p_fecha, p_saldo, p_nota, p_actor)
  returning id into v_id;

  perform audit.registrar_accion_admin(
    p_actor, 'recaudo.registrar_saldo', 'saldo_recaudo', v_id::text,
    jsonb_build_object('fecha', p_fecha, 'saldoMinor', p_saldo)
  );
  return v_id;
end $$;

grant execute on function evepay.admin_registrar_saldo_recaudo(date, bigint, text, text) to evepay_api;

-- Cuadre de custodia (CA-8): lo que el libro dice que hay en la cuenta de
-- recaudo al cierre de esa fecha (hora de Colombia, que es la del extracto),
-- sumando todos los comercios y la cuenta `banco` de antes de la Fase 6,
-- contra el último saldo registrado para esa fecha. Sin saldo registrado la
-- diferencia es null: no se sabe, que no es lo mismo que cuadrar.
create or replace function evepay.admin_cuadre_custodia(p_fecha date default current_date)
returns table (
  fecha          date,
  saldo_libro    bigint,
  saldo_banco    bigint,
  diferencia     bigint,
  registrado_por text,
  registrado_en  timestamptz
)
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  with libro as (
    select coalesce(sum(case when l.direction = 'debit' then l.amount_minor else -l.amount_minor end), 0)::bigint as saldo
    from evepay.ledger_lines l
    join evepay.ledger_entries e on e.id = l.entry_id
    where l.account in ('recaudo', 'banco')
      and e.posted_at < ((p_fecha + 1)::timestamp at time zone 'America/Bogota')
  ),
  banco as (
    select s.saldo_minor, s.registrado_por, s.registrado_en
    from evepay.saldos_recaudo s
    where s.fecha = p_fecha
    order by s.secuencia desc
    limit 1
  )
  select p_fecha, libro.saldo, banco.saldo_minor, banco.saldo_minor - libro.saldo,
         banco.registrado_por, banco.registrado_en
  from libro left join banco on true;
$$;

grant execute on function evepay.admin_cuadre_custodia(date) to evepay_api;

-- ---------------------------------------------------------------------------
-- Balance del comercio (CA-9), reconstruido desde las líneas y con el signo de
-- la naturaleza de cada cuenta: un activo crece con débitos, un pasivo y un
-- ingreso con créditos, un gasto con débitos. Así "por pagar $48.572" se lee
-- como lo que es, sin que nadie tenga que recordar qué lado es cuál.
-- ---------------------------------------------------------------------------
create or replace function evepay.admin_balance_comercio(p_tenant uuid)
returns table (
  por_pagar           bigint,
  comision            bigint,
  iva_por_pagar       bigint,
  costo_proveedor     bigint,
  margen              bigint,
  en_transito         bigint,
  en_recaudo          bigint,
  por_pagar_proveedor bigint
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
    coalesce(sum(cred - deb) filter (where account like 'por_pagar:%'), 0)::bigint
  from s;
$$;

grant execute on function evepay.admin_balance_comercio(uuid) to evepay_api;
