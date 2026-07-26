create schema if not exists conjuntos;

revoke all on schema conjuntos from anon;
grant usage on schema conjuntos to authenticated, service_role;

create type conjuntos.rol_miembro as enum (
  'super_admin',
  'admin_conjunto',
  'consejo',
  'residente'
);

create type conjuntos.tipo_unidad as enum (
  'apartamento',
  'casa',
  'local',
  'parqueadero',
  'deposito',
  'otro'
);

create type conjuntos.relacion_persona_unidad as enum (
  'propietario',
  'residente'
);

create type conjuntos.tipo_cuota as enum (
  'administracion',
  'extraordinaria',
  'multa'
);

create type conjuntos.tipo_movimiento_cuenta as enum (
  'cuota_generada',
  'interes_causado',
  'pago_aplicado',
  'ajuste_debito',
  'ajuste_credito',
  'reversion'
);

grant usage on type
  conjuntos.rol_miembro,
  conjuntos.tipo_unidad,
  conjuntos.relacion_persona_unidad,
  conjuntos.tipo_cuota,
  conjuntos.tipo_movimiento_cuenta
to authenticated, service_role;

create table conjuntos.conjuntos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null constraint conjuntos_nombre_no_vacio check (length(trim(nombre)) > 0),
  nit text,
  ciudad text,
  zona_horaria text not null default 'America/Bogota',
  moneda char(3) not null default 'COP' constraint conjuntos_moneda_cop check (moneda = 'COP'),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table conjuntos.miembros_conjunto (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos.conjuntos(id),
  usuario_id uuid not null,
  rol conjuntos.rol_miembro not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint miembros_conjunto_usuario_unico unique (conjunto_id, usuario_id)
);

create index miembros_conjunto_usuario_idx
  on conjuntos.miembros_conjunto(usuario_id);

create table conjuntos.unidades (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos.conjuntos(id),
  codigo text not null,
  tipo conjuntos.tipo_unidad not null,
  coeficiente numeric(9, 6) not null
    constraint unidades_coeficiente_valido check (coeficiente > 0 and coeficiente <= 100),
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint unidades_conjunto_codigo_unico unique (conjunto_id, codigo),
  constraint unidades_conjunto_id_unico unique (conjunto_id, id)
);

create table conjuntos.personas (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos.conjuntos(id),
  auth_usuario_id uuid,
  nombre text,
  email text,
  telefono text,
  autorizacion_tratamiento_en timestamptz,
  finalidad_autorizada text,
  anonimizada_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint personas_conjunto_id_unico unique (conjunto_id, id),
  constraint personas_anonimizacion_consistente check (
    anonimizada_en is null
    or (nombre is null and email is null and telefono is null)
  )
);

create unique index personas_conjunto_auth_usuario_unico
  on conjuntos.personas(conjunto_id, auth_usuario_id)
  where auth_usuario_id is not null;

create table conjuntos.personas_unidades (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null,
  persona_id uuid not null,
  unidad_id uuid not null,
  relacion conjuntos.relacion_persona_unidad not null,
  responsable_pago boolean not null default false,
  vigente_desde date not null default current_date,
  vigente_hasta date,
  creado_en timestamptz not null default now(),
  constraint personas_unidades_persona_fk
    foreign key (conjunto_id, persona_id)
    references conjuntos.personas(conjunto_id, id),
  constraint personas_unidades_unidad_fk
    foreign key (conjunto_id, unidad_id)
    references conjuntos.unidades(conjunto_id, id),
  constraint personas_unidades_vinculo_unico
    unique (conjunto_id, persona_id, unidad_id, relacion, vigente_desde),
  constraint personas_unidades_vigencia_valida
    check (vigente_hasta is null or vigente_hasta >= vigente_desde)
);

create index personas_unidades_unidad_idx
  on conjuntos.personas_unidades(conjunto_id, unidad_id);

create table conjuntos.generaciones_cuotas (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos.conjuntos(id),
  periodo date not null
    constraint generaciones_cuotas_periodo_valido check (extract(day from periodo) = 1),
  tipo conjuntos.tipo_cuota not null,
  concepto text not null,
  presupuesto_minor bigint not null
    constraint generaciones_cuotas_presupuesto_valido check (presupuesto_minor >= 0),
  idempotencia_clave text not null,
  creado_por_usuario_id uuid not null,
  creado_en timestamptz not null default now(),
  constraint generaciones_cuotas_conjunto_id_unico unique (conjunto_id, id),
  constraint generaciones_cuotas_idempotencia_unica
    unique (conjunto_id, idempotencia_clave)
);

create unique index generaciones_cuotas_administracion_periodo_unica
  on conjuntos.generaciones_cuotas(conjunto_id, periodo)
  where tipo = 'administracion';

create table conjuntos.cuotas (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null,
  generacion_id uuid not null,
  unidad_id uuid not null,
  concepto text not null,
  monto_minor bigint not null constraint cuotas_monto_valido check (monto_minor > 0),
  coeficiente_aplicado numeric(9, 6),
  vence_en date not null,
  evepay_cobro_id uuid,
  creado_en timestamptz not null default now(),
  constraint cuotas_generacion_fk
    foreign key (conjunto_id, generacion_id)
    references conjuntos.generaciones_cuotas(conjunto_id, id),
  constraint cuotas_unidad_fk
    foreign key (conjunto_id, unidad_id)
    references conjuntos.unidades(conjunto_id, id),
  constraint cuotas_conjunto_id_unico unique (conjunto_id, id),
  constraint cuotas_generacion_unidad_unica
    unique (conjunto_id, generacion_id, unidad_id)
);

create unique index cuotas_evepay_cobro_unico
  on conjuntos.cuotas(evepay_cobro_id)
  where evepay_cobro_id is not null;

comment on column conjuntos.cuotas.evepay_cobro_id is
  'Identificador externo de EvePay. Deliberadamente no tiene llave foránea.';

create table conjuntos.movimientos_cuenta (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null,
  unidad_id uuid not null,
  cuota_id uuid,
  tipo conjuntos.tipo_movimiento_cuenta not null,
  monto_minor bigint not null
    constraint movimientos_cuenta_monto_no_cero check (monto_minor <> 0),
  idempotencia_clave text not null,
  evepay_cobro_id uuid,
  actor_usuario_id uuid,
  motivo text not null,
  metadata jsonb not null default '{}'::jsonb,
  ocurrido_en timestamptz not null default now(),
  constraint movimientos_cuenta_unidad_fk
    foreign key (conjunto_id, unidad_id)
    references conjuntos.unidades(conjunto_id, id),
  constraint movimientos_cuenta_cuota_fk
    foreign key (conjunto_id, cuota_id)
    references conjuntos.cuotas(conjunto_id, id),
  constraint movimientos_cuenta_idempotencia_unica
    unique (conjunto_id, idempotencia_clave)
);

create index movimientos_cuenta_unidad_fecha_idx
  on conjuntos.movimientos_cuenta(conjunto_id, unidad_id, ocurrido_en);

create table conjuntos.eventos_auditoria (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos.conjuntos(id),
  actor_usuario_id uuid,
  accion text not null,
  recurso_tipo text not null,
  recurso_id uuid,
  datos jsonb not null default '{}'::jsonb,
  ocurrido_en timestamptz not null default now()
);

create index eventos_auditoria_conjunto_fecha_idx
  on conjuntos.eventos_auditoria(conjunto_id, ocurrido_en);

create function conjuntos.actualizar_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger conjuntos_actualizar_timestamp
before update on conjuntos.conjuntos
for each row execute function conjuntos.actualizar_timestamp();

create trigger miembros_conjunto_actualizar_timestamp
before update on conjuntos.miembros_conjunto
for each row execute function conjuntos.actualizar_timestamp();

create trigger unidades_actualizar_timestamp
before update on conjuntos.unidades
for each row execute function conjuntos.actualizar_timestamp();

create trigger personas_actualizar_timestamp
before update on conjuntos.personas
for each row execute function conjuntos.actualizar_timestamp();

create function conjuntos.impedir_mutacion_inmutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Los registros de %.% son inmutables', tg_table_schema, tg_table_name;
end;
$$;

create trigger movimientos_cuenta_inmutables
before update or delete on conjuntos.movimientos_cuenta
for each row execute function conjuntos.impedir_mutacion_inmutable();

create trigger eventos_auditoria_inmutables
before update or delete on conjuntos.eventos_auditoria
for each row execute function conjuntos.impedir_mutacion_inmutable();

create function conjuntos.usuario_es_miembro(p_conjunto_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from conjuntos.miembros_conjunto as miembro
    where miembro.conjunto_id = p_conjunto_id
      and miembro.usuario_id = auth.uid()
      and miembro.activo
  );
$$;

create function conjuntos.usuario_tiene_rol(
  p_conjunto_id uuid,
  p_roles conjuntos.rol_miembro[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from conjuntos.miembros_conjunto as miembro
    where miembro.conjunto_id = p_conjunto_id
      and miembro.usuario_id = auth.uid()
      and miembro.activo
      and miembro.rol = any(p_roles)
  );
$$;

create function conjuntos.usuario_puede_ver_unidad(
  p_conjunto_id uuid,
  p_unidad_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    conjuntos.usuario_tiene_rol(
      p_conjunto_id,
      array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
    )
    or exists (
      select 1
      from conjuntos.personas as persona
      inner join conjuntos.personas_unidades as vinculo
        on vinculo.conjunto_id = persona.conjunto_id
        and vinculo.persona_id = persona.id
      where persona.conjunto_id = p_conjunto_id
        and persona.auth_usuario_id = auth.uid()
        and persona.anonimizada_en is null
        and vinculo.unidad_id = p_unidad_id
        and vinculo.vigente_desde <= current_date
        and (vinculo.vigente_hasta is null or vinculo.vigente_hasta >= current_date)
    );
$$;

revoke all on function conjuntos.usuario_es_miembro(uuid) from public;
revoke all on function conjuntos.usuario_tiene_rol(uuid, conjuntos.rol_miembro[]) from public;
revoke all on function conjuntos.usuario_puede_ver_unidad(uuid, uuid) from public;

grant execute on function conjuntos.usuario_es_miembro(uuid)
  to authenticated, service_role;
grant execute on function conjuntos.usuario_tiene_rol(uuid, conjuntos.rol_miembro[])
  to authenticated, service_role;
grant execute on function conjuntos.usuario_puede_ver_unidad(uuid, uuid)
  to authenticated, service_role;

alter table conjuntos.conjuntos enable row level security;
alter table conjuntos.miembros_conjunto enable row level security;
alter table conjuntos.unidades enable row level security;
alter table conjuntos.personas enable row level security;
alter table conjuntos.personas_unidades enable row level security;
alter table conjuntos.generaciones_cuotas enable row level security;
alter table conjuntos.cuotas enable row level security;
alter table conjuntos.movimientos_cuenta enable row level security;
alter table conjuntos.eventos_auditoria enable row level security;

alter table conjuntos.conjuntos force row level security;
alter table conjuntos.miembros_conjunto force row level security;
alter table conjuntos.unidades force row level security;
alter table conjuntos.personas force row level security;
alter table conjuntos.personas_unidades force row level security;
alter table conjuntos.generaciones_cuotas force row level security;
alter table conjuntos.cuotas force row level security;
alter table conjuntos.movimientos_cuenta force row level security;
alter table conjuntos.eventos_auditoria force row level security;

create policy conjuntos_seleccionar
on conjuntos.conjuntos for select to authenticated
using (conjuntos.usuario_es_miembro(id));

create policy conjuntos_actualizar
on conjuntos.conjuntos for update to authenticated
using (
  conjuntos.usuario_tiene_rol(
    id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
)
with check (
  conjuntos.usuario_tiene_rol(
    id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

create policy miembros_seleccionar
on conjuntos.miembros_conjunto for select to authenticated
using (
  usuario_id = auth.uid()
  or conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

create policy miembros_insertar
on conjuntos.miembros_conjunto for insert to authenticated
with check (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
  and (
    rol <> 'super_admin'
    or conjuntos.usuario_tiene_rol(
      conjunto_id,
      array['super_admin']::conjuntos.rol_miembro[]
    )
  )
);

create policy miembros_actualizar
on conjuntos.miembros_conjunto for update to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin']::conjuntos.rol_miembro[]
  )
  or (
    rol <> 'super_admin'
    and conjuntos.usuario_tiene_rol(
      conjunto_id,
      array['admin_conjunto']::conjuntos.rol_miembro[]
    )
  )
)
with check (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin']::conjuntos.rol_miembro[]
  )
  or (
    rol <> 'super_admin'
    and conjuntos.usuario_tiene_rol(
      conjunto_id,
      array['admin_conjunto']::conjuntos.rol_miembro[]
    )
  )
);

create policy unidades_seleccionar
on conjuntos.unidades for select to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto', 'consejo']::conjuntos.rol_miembro[]
  )
  or conjuntos.usuario_puede_ver_unidad(conjunto_id, id)
);

create policy unidades_insertar
on conjuntos.unidades for insert to authenticated
with check (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

create policy unidades_actualizar
on conjuntos.unidades for update to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
)
with check (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

create policy personas_seleccionar
on conjuntos.personas for select to authenticated
using (
  auth_usuario_id = auth.uid()
  or conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

create policy personas_insertar
on conjuntos.personas for insert to authenticated
with check (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

create policy personas_actualizar
on conjuntos.personas for update to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
)
with check (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

create policy personas_unidades_seleccionar
on conjuntos.personas_unidades for select to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
  or exists (
    select 1
    from conjuntos.personas as persona
    where persona.conjunto_id = personas_unidades.conjunto_id
      and persona.id = personas_unidades.persona_id
      and persona.auth_usuario_id = auth.uid()
  )
);

create policy personas_unidades_insertar
on conjuntos.personas_unidades for insert to authenticated
with check (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

create policy personas_unidades_actualizar
on conjuntos.personas_unidades for update to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
)
with check (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

create policy generaciones_cuotas_seleccionar
on conjuntos.generaciones_cuotas for select to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto', 'consejo']::conjuntos.rol_miembro[]
  )
);

create policy generaciones_cuotas_insertar
on conjuntos.generaciones_cuotas for insert to authenticated
with check (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

create policy cuotas_seleccionar
on conjuntos.cuotas for select to authenticated
using (conjuntos.usuario_puede_ver_unidad(conjunto_id, unidad_id));

create policy cuotas_insertar
on conjuntos.cuotas for insert to authenticated
with check (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

create policy cuotas_actualizar
on conjuntos.cuotas for update to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
)
with check (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

create policy movimientos_cuenta_seleccionar
on conjuntos.movimientos_cuenta for select to authenticated
using (conjuntos.usuario_puede_ver_unidad(conjunto_id, unidad_id));

create policy movimientos_cuenta_insertar
on conjuntos.movimientos_cuenta for insert to authenticated
with check (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

create policy eventos_auditoria_seleccionar
on conjuntos.eventos_auditoria for select to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

create policy eventos_auditoria_insertar
on conjuntos.eventos_auditoria for insert to authenticated
with check (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

grant select on all tables in schema conjuntos to authenticated;
grant insert, update on
  conjuntos.miembros_conjunto,
  conjuntos.unidades,
  conjuntos.personas,
  conjuntos.personas_unidades
to authenticated;
grant insert on
  conjuntos.generaciones_cuotas,
  conjuntos.cuotas,
  conjuntos.movimientos_cuenta,
  conjuntos.eventos_auditoria
to authenticated;
grant update (evepay_cobro_id) on conjuntos.cuotas to authenticated;
grant update on conjuntos.conjuntos to authenticated;

grant all privileges on all tables in schema conjuntos to service_role;
grant all privileges on all sequences in schema conjuntos to service_role;
grant execute on all functions in schema conjuntos to service_role;
