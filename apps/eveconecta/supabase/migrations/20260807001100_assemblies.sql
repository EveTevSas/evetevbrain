create type conjuntos.tipo_asamblea as enum ('ordinaria', 'extraordinaria', 'informativa');
create type conjuntos.modalidad_asamblea as enum ('presencial', 'virtual', 'hibrida');
create type conjuntos.estado_asamblea as enum ('programada', 'en_curso', 'cerrada');

grant usage on type conjuntos.tipo_asamblea to authenticated, service_role;
grant usage on type conjuntos.modalidad_asamblea to authenticated, service_role;
grant usage on type conjuntos.estado_asamblea to authenticated, service_role;

create table conjuntos.asambleas (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos.conjuntos(id),
  titulo text not null,
  tipo conjuntos.tipo_asamblea not null,
  modalidad conjuntos.modalidad_asamblea not null,
  inicia_en timestamptz not null,
  ubicacion text not null,
  orden_del_dia text not null,
  estado conjuntos.estado_asamblea not null default 'programada',
  creado_por_usuario_id uuid not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint asambleas_conjunto_id_unico unique (conjunto_id, id),
  constraint asambleas_titulo_valido check (length(trim(titulo)) between 5 and 140),
  constraint asambleas_ubicacion_valida check (length(trim(ubicacion)) between 3 and 240),
  constraint asambleas_orden_valido check (length(trim(orden_del_dia)) between 10 and 3000)
);

create index asambleas_conjunto_fecha_idx
  on conjuntos.asambleas(conjunto_id, inicia_en);

create trigger asambleas_actualizar_timestamp
before update on conjuntos.asambleas
for each row execute function conjuntos.actualizar_timestamp();

alter table conjuntos.asambleas enable row level security;
alter table conjuntos.asambleas force row level security;

create policy asambleas_seleccionar
on conjuntos.asambleas for select to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto', 'consejo', 'residente']::conjuntos.rol_miembro[]
  )
);

create policy asambleas_insertar_administracion
on conjuntos.asambleas for insert to authenticated
with check (
  creado_por_usuario_id = auth.uid()
  and conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

grant select, insert on conjuntos.asambleas to authenticated, service_role;
grant update on conjuntos.asambleas to service_role;

create function conjuntos.programar_asamblea_demo(
  p_conjunto_id uuid,
  p_titulo text,
  p_tipo text,
  p_modalidad text,
  p_inicia_en timestamptz,
  p_ubicacion text,
  p_orden_del_dia text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asamblea_id uuid := gen_random_uuid();
  v_item jsonb;
  v_snapshot jsonb;
  v_auditoria jsonb;
  v_total_unidades integer;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite programar asambleas';
  end if;

  if length(trim(p_titulo)) not between 5 and 140
    or length(trim(p_ubicacion)) not between 3 and 240
    or length(trim(p_orden_del_dia)) not between 10 and 3000 then
    raise exception 'Los datos de la asamblea no son válidos' using errcode = '22023';
  end if;
  if p_tipo not in ('ordinaria', 'extraordinaria', 'informativa') then
    raise exception 'El tipo de asamblea no es válido' using errcode = '22023';
  end if;
  if p_modalidad not in ('presencial', 'virtual', 'hibrida') then
    raise exception 'La modalidad de asamblea no es válida' using errcode = '22023';
  end if;
  if p_inicia_en <= now() then
    raise exception 'La asamblea debe programarse para una fecha futura' using errcode = '22023';
  end if;
  if p_modalidad = 'virtual' and trim(p_ubicacion) !~* '^https://' then
    raise exception 'La asamblea virtual requiere un enlace HTTPS' using errcode = '22023';
  end if;

  insert into conjuntos.asambleas (
    id,
    conjunto_id,
    titulo,
    tipo,
    modalidad,
    inicia_en,
    ubicacion,
    orden_del_dia,
    estado,
    creado_por_usuario_id
  ) values (
    v_asamblea_id,
    p_conjunto_id,
    trim(p_titulo),
    p_tipo::conjuntos.tipo_asamblea,
    p_modalidad::conjuntos.modalidad_asamblea,
    p_inicia_en,
    trim(p_ubicacion),
    trim(p_orden_del_dia),
    'programada',
    auth.uid()
  );

  select escenario.snapshot
  into v_snapshot
  from conjuntos.escenarios_demo as escenario
  where escenario.conjunto_id = p_conjunto_id
  for update;

  if v_snapshot is null then
    raise exception 'La copropiedad no tiene escenario de demostración';
  end if;

  v_total_unidades := coalesce((v_snapshot #>> '{tenant,units}')::integer, 0);
  v_item := jsonb_build_object(
    'id', v_asamblea_id,
    'title', trim(p_titulo),
    'date', p_inicia_en,
    'mode', case p_modalidad
      when 'presencial' then 'Presencial'
      when 'virtual' then 'Virtual'
      else 'Híbrida'
    end,
    'type', case p_tipo
      when 'ordinaria' then 'ordinary'
      when 'extraordinaria' then 'extraordinary'
      else 'informative'
    end,
    'location', trim(p_ubicacion),
    'agenda', trim(p_orden_del_dia),
    'quorumPercent', 0,
    'representedUnits', 0,
    'totalUnits', v_total_unidades,
    'status', 'scheduled',
    'openVotes', 0
  );

  v_snapshot := jsonb_set(
    v_snapshot,
    '{assemblies}',
    jsonb_build_array(v_item) || coalesce(v_snapshot -> 'assemblies', '[]'::jsonb),
    true
  );

  select coalesce(jsonb_agg(evento.value order by evento.ordinality), '[]'::jsonb)
  into v_auditoria
  from jsonb_array_elements(
    jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'occurredAt', now(),
        'actor', 'Administración',
        'action', 'asambleas.convocatoria_programada',
        'resource', v_asamblea_id,
        'detail', 'Asamblea programada y convocatoria preparada',
        'result', 'success'
      )
    ) || coalesce(v_snapshot -> 'audit', '[]'::jsonb)
  ) with ordinality as evento(value, ordinality)
  where evento.ordinality <= 40;

  v_snapshot := jsonb_set(v_snapshot, '{audit}', v_auditoria, true);

  update conjuntos.escenarios_demo
  set snapshot = v_snapshot, actualizado_en = now()
  where conjunto_id = p_conjunto_id;

  insert into conjuntos.eventos_auditoria (
    conjunto_id,
    actor_usuario_id,
    accion,
    recurso_tipo,
    recurso_id,
    datos
  ) values (
    p_conjunto_id,
    auth.uid(),
    'asambleas.convocatoria_programada',
    'asamblea',
    v_asamblea_id,
    jsonb_build_object(
      'tipo', p_tipo,
      'modalidad', p_modalidad,
      'inicia_en', p_inicia_en
    )
  );

  return v_item;
exception
  when invalid_text_representation then
    raise exception 'Los datos de la asamblea no son válidos' using errcode = '22023';
end;
$$;

revoke all on function conjuntos.programar_asamblea_demo(
  uuid,
  text,
  text,
  text,
  timestamptz,
  text,
  text
) from public;

grant execute on function conjuntos.programar_asamblea_demo(
  uuid,
  text,
  text,
  text,
  timestamptz,
  text,
  text
) to authenticated, service_role;
