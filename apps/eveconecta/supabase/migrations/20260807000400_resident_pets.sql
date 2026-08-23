create type conjuntos.tipo_mascota as enum ('perro', 'gato');
create type conjuntos.tamano_mascota as enum ('grande', 'mediano', 'pequeno');
create type conjuntos.estado_mascota as enum ('activo', 'inactivo');

grant usage on type
  conjuntos.tipo_mascota,
  conjuntos.tamano_mascota,
  conjuntos.estado_mascota
to authenticated, service_role;

create table conjuntos.mascotas (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos.conjuntos(id),
  persona_id uuid not null,
  unidad_id uuid not null,
  tipo conjuntos.tipo_mascota not null,
  anio_nacimiento integer not null,
  tamano conjuntos.tamano_mascota not null,
  nombre text not null,
  estado conjuntos.estado_mascota not null default 'activo',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint mascotas_conjunto_id_unico unique (conjunto_id, id),
  constraint mascotas_persona_fk
    foreign key (conjunto_id, persona_id)
    references conjuntos.personas(conjunto_id, id),
  constraint mascotas_unidad_fk
    foreign key (conjunto_id, unidad_id)
    references conjuntos.unidades(conjunto_id, id),
  constraint mascotas_nombre_no_vacio check (length(trim(nombre)) >= 2),
  constraint mascotas_anio_nacimiento_valido check (
    anio_nacimiento between 1900 and extract(year from current_date)::integer
  )
);

create index mascotas_unidad_estado_idx
  on conjuntos.mascotas(conjunto_id, unidad_id, estado);

create index mascotas_persona_idx
  on conjuntos.mascotas(conjunto_id, persona_id);

create trigger mascotas_actualizar_timestamp
before update on conjuntos.mascotas
for each row execute function conjuntos.actualizar_timestamp();

alter table conjuntos.mascotas enable row level security;
alter table conjuntos.mascotas force row level security;

create policy mascotas_seleccionar
on conjuntos.mascotas for select to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
  or conjuntos.usuario_puede_ver_unidad(conjunto_id, unidad_id)
);

create policy mascotas_insertar_residente
on conjuntos.mascotas for insert to authenticated
with check (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['residente']::conjuntos.rol_miembro[]
  )
  and conjuntos.usuario_puede_ver_unidad(conjunto_id, unidad_id)
  and exists (
    select 1
    from conjuntos.personas as persona
    where persona.conjunto_id = mascotas.conjunto_id
      and persona.id = mascotas.persona_id
      and persona.auth_usuario_id = auth.uid()
      and persona.anonimizada_en is null
  )
);

create policy mascotas_actualizar_residente
on conjuntos.mascotas for update to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['residente']::conjuntos.rol_miembro[]
  )
  and conjuntos.usuario_puede_ver_unidad(conjunto_id, unidad_id)
  and exists (
    select 1
    from conjuntos.personas as persona
    where persona.conjunto_id = mascotas.conjunto_id
      and persona.id = mascotas.persona_id
      and persona.auth_usuario_id = auth.uid()
      and persona.anonimizada_en is null
  )
)
with check (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['residente']::conjuntos.rol_miembro[]
  )
  and conjuntos.usuario_puede_ver_unidad(conjunto_id, unidad_id)
  and exists (
    select 1
    from conjuntos.personas as persona
    where persona.conjunto_id = mascotas.conjunto_id
      and persona.id = mascotas.persona_id
      and persona.auth_usuario_id = auth.uid()
      and persona.anonimizada_en is null
  )
);

grant select, insert on conjuntos.mascotas to authenticated, service_role;
grant update (estado) on conjuntos.mascotas to authenticated;
grant update on conjuntos.mascotas to service_role;
