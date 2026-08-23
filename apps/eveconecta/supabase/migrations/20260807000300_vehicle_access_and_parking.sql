create type conjuntos.tipo_parqueadero as enum ('zona', 'unidad');
create type conjuntos.estado_parqueadero as enum ('disponible', 'asignado', 'mantenimiento');
create type conjuntos.clase_vehiculo as enum ('automovil', 'motocicleta', 'otro');
create type conjuntos.estado_acceso_vehiculo as enum ('autorizado', 'suspendido', 'vencido');
create type conjuntos.direccion_acceso_vehicular as enum ('ingreso', 'salida');
create type conjuntos.decision_acceso_vehicular as enum ('autorizado', 'denegado');
create type conjuntos.origen_acceso_vehicular as enum ('permanente', 'visitante', 'desconocido');

grant usage on type
  conjuntos.tipo_parqueadero,
  conjuntos.estado_parqueadero,
  conjuntos.clase_vehiculo,
  conjuntos.estado_acceso_vehiculo,
  conjuntos.direccion_acceso_vehicular,
  conjuntos.decision_acceso_vehicular,
  conjuntos.origen_acceso_vehicular
to authenticated, service_role;

create table conjuntos.parqueaderos (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos.conjuntos(id),
  codigo text not null,
  codigo_normalizado text not null,
  tipo conjuntos.tipo_parqueadero not null,
  sector text,
  numero text not null,
  unidad_base_id uuid,
  estado conjuntos.estado_parqueadero not null default 'disponible',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint parqueaderos_conjunto_id_unico unique (conjunto_id, id),
  constraint parqueaderos_unidad_base_fk
    foreign key (conjunto_id, unidad_base_id)
    references conjuntos.unidades(conjunto_id, id),
  constraint parqueaderos_codigo_no_vacio check (length(trim(codigo)) > 0),
  constraint parqueaderos_codigo_normalizado_valido check (
    codigo_normalizado = upper(regexp_replace(codigo, '[^A-Za-z0-9]', '', 'g'))
  ),
  constraint parqueaderos_tipo_consistente check (
    (tipo = 'zona' and sector is not null and unidad_base_id is null)
    or (tipo = 'unidad' and sector is null and unidad_base_id is not null)
  )
);

create unique index parqueaderos_conjunto_codigo_unico
  on conjuntos.parqueaderos(conjunto_id, codigo_normalizado);

create index parqueaderos_unidad_base_idx
  on conjuntos.parqueaderos(conjunto_id, unidad_base_id)
  where unidad_base_id is not null;

create table conjuntos.vehiculos (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos.conjuntos(id),
  persona_id uuid not null,
  unidad_id uuid not null,
  placa text not null,
  placa_normalizada text not null,
  clase conjuntos.clase_vehiculo not null,
  marca text not null,
  color text not null,
  estado_acceso conjuntos.estado_acceso_vehiculo not null default 'autorizado',
  vigente_desde timestamptz not null default now(),
  vigente_hasta date,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint vehiculos_conjunto_id_unico unique (conjunto_id, id),
  constraint vehiculos_persona_fk
    foreign key (conjunto_id, persona_id)
    references conjuntos.personas(conjunto_id, id),
  constraint vehiculos_unidad_fk
    foreign key (conjunto_id, unidad_id)
    references conjuntos.unidades(conjunto_id, id),
  constraint vehiculos_placa_normalizada_valida check (
    placa_normalizada = upper(regexp_replace(placa, '[^A-Za-z0-9]', '', 'g'))
    and placa_normalizada ~ '^[A-Z0-9]{5,8}$'
  ),
  constraint vehiculos_vigencia_valida check (
    vigente_hasta is null or vigente_hasta >= vigente_desde::date
  )
);

create unique index vehiculos_placa_activa_unica
  on conjuntos.vehiculos(conjunto_id, placa_normalizada)
  where estado_acceso <> 'vencido';

create index vehiculos_unidad_idx
  on conjuntos.vehiculos(conjunto_id, unidad_id);

create table conjuntos.asignaciones_parqueadero (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos.conjuntos(id),
  parqueadero_id uuid not null,
  unidad_id uuid not null,
  vehiculo_id uuid,
  vigente_desde date not null default current_date,
  vigente_hasta date,
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint asignaciones_parqueadero_conjunto_id_unico unique (conjunto_id, id),
  constraint asignaciones_parqueadero_parqueadero_fk
    foreign key (conjunto_id, parqueadero_id)
    references conjuntos.parqueaderos(conjunto_id, id),
  constraint asignaciones_parqueadero_unidad_fk
    foreign key (conjunto_id, unidad_id)
    references conjuntos.unidades(conjunto_id, id),
  constraint asignaciones_parqueadero_vehiculo_fk
    foreign key (conjunto_id, vehiculo_id)
    references conjuntos.vehiculos(conjunto_id, id),
  constraint asignaciones_parqueadero_vigencia_valida check (
    vigente_hasta is null or vigente_hasta >= vigente_desde
  )
);

create unique index asignaciones_parqueadero_activa_unica
  on conjuntos.asignaciones_parqueadero(conjunto_id, parqueadero_id)
  where activa;

create unique index asignaciones_vehiculo_activa_unica
  on conjuntos.asignaciones_parqueadero(conjunto_id, vehiculo_id)
  where activa and vehiculo_id is not null;

create index asignaciones_parqueadero_unidad_idx
  on conjuntos.asignaciones_parqueadero(conjunto_id, unidad_id)
  where activa;

create table conjuntos.eventos_acceso_vehicular (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos.conjuntos(id),
  vehiculo_id uuid,
  placa_normalizada text not null,
  direccion conjuntos.direccion_acceso_vehicular not null,
  decision conjuntos.decision_acceso_vehicular not null,
  motivo text not null,
  origen conjuntos.origen_acceso_vehicular not null,
  unidad_id uuid,
  parqueadero_id uuid,
  actor_usuario_id uuid,
  ocurrido_en timestamptz not null default now(),
  constraint eventos_acceso_vehicular_vehiculo_fk
    foreign key (conjunto_id, vehiculo_id)
    references conjuntos.vehiculos(conjunto_id, id),
  constraint eventos_acceso_vehicular_unidad_fk
    foreign key (conjunto_id, unidad_id)
    references conjuntos.unidades(conjunto_id, id),
  constraint eventos_acceso_vehicular_parqueadero_fk
    foreign key (conjunto_id, parqueadero_id)
    references conjuntos.parqueaderos(conjunto_id, id),
  constraint eventos_acceso_vehicular_placa_valida check (
    placa_normalizada = upper(regexp_replace(placa_normalizada, '[^A-Za-z0-9]', '', 'g'))
    and placa_normalizada ~ '^[A-Z0-9]{5,8}$'
  ),
  constraint eventos_acceso_vehicular_motivo_valido check (
    motivo in (
      'registered_vehicle',
      'authorized_visitor',
      'suspended_vehicle',
      'expired_vehicle',
      'expired_visitor',
      'unknown_vehicle'
    )
  )
);

create index eventos_acceso_vehicular_fecha_idx
  on conjuntos.eventos_acceso_vehicular(conjunto_id, ocurrido_en desc);

create trigger parqueaderos_actualizar_timestamp
before update on conjuntos.parqueaderos
for each row execute function conjuntos.actualizar_timestamp();

create trigger vehiculos_actualizar_timestamp
before update on conjuntos.vehiculos
for each row execute function conjuntos.actualizar_timestamp();

create trigger asignaciones_parqueadero_actualizar_timestamp
before update on conjuntos.asignaciones_parqueadero
for each row execute function conjuntos.actualizar_timestamp();

create trigger eventos_acceso_vehicular_inmutables
before update or delete on conjuntos.eventos_acceso_vehicular
for each row execute function conjuntos.impedir_mutacion_inmutable();

alter table conjuntos.parqueaderos enable row level security;
alter table conjuntos.vehiculos enable row level security;
alter table conjuntos.asignaciones_parqueadero enable row level security;
alter table conjuntos.eventos_acceso_vehicular enable row level security;

alter table conjuntos.parqueaderos force row level security;
alter table conjuntos.vehiculos force row level security;
alter table conjuntos.asignaciones_parqueadero force row level security;
alter table conjuntos.eventos_acceso_vehicular force row level security;

create policy parqueaderos_seleccionar
on conjuntos.parqueaderos for select to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto', 'consejo']::conjuntos.rol_miembro[]
  )
  or (unidad_base_id is not null and conjuntos.usuario_puede_ver_unidad(conjunto_id, unidad_base_id))
  or exists (
    select 1
    from conjuntos.asignaciones_parqueadero as asignacion
    where asignacion.conjunto_id = parqueaderos.conjunto_id
      and asignacion.parqueadero_id = parqueaderos.id
      and asignacion.activa
      and conjuntos.usuario_puede_ver_unidad(asignacion.conjunto_id, asignacion.unidad_id)
  )
);

create policy parqueaderos_insertar
on conjuntos.parqueaderos for insert to authenticated
with check (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

create policy parqueaderos_actualizar
on conjuntos.parqueaderos for update to authenticated
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

create policy vehiculos_seleccionar
on conjuntos.vehiculos for select to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
  or conjuntos.usuario_puede_ver_unidad(conjunto_id, unidad_id)
);

create policy vehiculos_insertar
on conjuntos.vehiculos for insert to authenticated
with check (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

create policy vehiculos_actualizar
on conjuntos.vehiculos for update to authenticated
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

create policy asignaciones_parqueadero_seleccionar
on conjuntos.asignaciones_parqueadero for select to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto', 'consejo']::conjuntos.rol_miembro[]
  )
  or conjuntos.usuario_puede_ver_unidad(conjunto_id, unidad_id)
);

create policy asignaciones_parqueadero_insertar
on conjuntos.asignaciones_parqueadero for insert to authenticated
with check (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

create policy asignaciones_parqueadero_actualizar
on conjuntos.asignaciones_parqueadero for update to authenticated
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

create policy eventos_acceso_vehicular_seleccionar
on conjuntos.eventos_acceso_vehicular for select to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
  or (unidad_id is not null and conjuntos.usuario_puede_ver_unidad(conjunto_id, unidad_id))
);

create policy eventos_acceso_vehicular_insertar
on conjuntos.eventos_acceso_vehicular for insert to authenticated
with check (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

grant select, insert, update on
  conjuntos.parqueaderos,
  conjuntos.vehiculos,
  conjuntos.asignaciones_parqueadero
to authenticated, service_role;

grant select, insert on conjuntos.eventos_acceso_vehicular
to authenticated, service_role;
