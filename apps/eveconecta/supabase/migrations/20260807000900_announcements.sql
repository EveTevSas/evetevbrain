create type conjuntos.estado_comunicado as enum ('borrador', 'programado', 'publicado');

grant usage on type conjuntos.estado_comunicado to authenticated, service_role;

create table conjuntos.comunicados (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos.conjuntos(id),
  titulo text not null,
  mensaje text not null,
  audiencia text not null,
  canales text[] not null,
  publicado_en timestamptz not null,
  entrega_porcentaje integer not null default 0,
  estado conjuntos.estado_comunicado not null,
  creado_por_usuario_id uuid not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint comunicados_conjunto_id_unico unique (conjunto_id, id),
  constraint comunicados_titulo_valido check (length(trim(titulo)) between 5 and 120),
  constraint comunicados_mensaje_valido check (length(trim(mensaje)) between 10 and 2000),
  constraint comunicados_audiencia_valida check (
    audiencia in ('all_residents', 'owners', 'residents_with_pets')
  ),
  constraint comunicados_canales_validos check (
    cardinality(canales) between 1 and 3
    and canales <@ array['app', 'email', 'whatsapp']::text[]
  ),
  constraint comunicados_entrega_valida check (entrega_porcentaje between 0 and 100)
);

create index comunicados_conjunto_publicacion_idx
  on conjuntos.comunicados(conjunto_id, publicado_en desc);

create trigger comunicados_actualizar_timestamp
before update on conjuntos.comunicados
for each row execute function conjuntos.actualizar_timestamp();

alter table conjuntos.comunicados enable row level security;
alter table conjuntos.comunicados force row level security;

create policy comunicados_seleccionar
on conjuntos.comunicados for select to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto', 'consejo', 'residente']::conjuntos.rol_miembro[]
  )
);

create policy comunicados_insertar_administracion
on conjuntos.comunicados for insert to authenticated
with check (
  creado_por_usuario_id = auth.uid()
  and conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

grant select, insert on conjuntos.comunicados to authenticated, service_role;
grant update on conjuntos.comunicados to service_role;

create function conjuntos.registrar_comunicado_demo(
  p_conjunto_id uuid,
  p_titulo text,
  p_mensaje text,
  p_audiencia text,
  p_canales text[],
  p_estado text,
  p_publicado_en timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comunicado_id uuid := gen_random_uuid();
  v_audiencia_label text;
  v_canal_label text;
  v_item jsonb;
  v_snapshot jsonb;
  v_auditoria jsonb;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite crear comunicados';
  end if;

  if length(trim(p_titulo)) not between 5 and 120
    or length(trim(p_mensaje)) not between 10 and 2000 then
    raise exception 'El título o el mensaje no son válidos' using errcode = '22023';
  end if;
  if p_audiencia not in ('all_residents', 'owners', 'residents_with_pets') then
    raise exception 'La audiencia no es válida' using errcode = '22023';
  end if;
  if cardinality(p_canales) not between 1 and 3
    or exists (
      select 1 from unnest(p_canales) as canal(valor)
      where canal.valor not in ('app', 'email', 'whatsapp')
    ) then
    raise exception 'Los canales no son válidos' using errcode = '22023';
  end if;
  if p_estado not in ('borrador', 'programado', 'publicado') then
    raise exception 'El estado no es válido' using errcode = '22023';
  end if;
  if p_estado = 'programado' and p_publicado_en <= now() then
    raise exception 'La publicación programada debe estar en el futuro' using errcode = '22023';
  end if;

  v_audiencia_label := case p_audiencia
    when 'all_residents' then 'Todos los residentes'
    when 'owners' then 'Propietarios'
    else 'Residentes con mascotas'
  end;

  select string_agg(
    case canal.valor
      when 'app' then 'App'
      when 'email' then 'correo'
      else 'WhatsApp'
    end,
    ' + '
    order by canal.ordinalidad
  )
  into v_canal_label
  from unnest(p_canales) with ordinality as canal(valor, ordinalidad);

  insert into conjuntos.comunicados (
    id,
    conjunto_id,
    titulo,
    mensaje,
    audiencia,
    canales,
    publicado_en,
    entrega_porcentaje,
    estado,
    creado_por_usuario_id
  ) values (
    v_comunicado_id,
    p_conjunto_id,
    trim(p_titulo),
    trim(p_mensaje),
    p_audiencia,
    p_canales,
    p_publicado_en,
    0,
    p_estado::conjuntos.estado_comunicado,
    auth.uid()
  );

  v_item := jsonb_build_object(
    'id', v_comunicado_id,
    'title', trim(p_titulo),
    'message', trim(p_mensaje),
    'audience', v_audiencia_label,
    'channel', v_canal_label,
    'publishedAt', p_publicado_en,
    'deliveryRate', 0,
    'status', case p_estado
      when 'borrador' then 'draft'
      when 'programado' then 'scheduled'
      else 'published'
    end
  );

  select escenario.snapshot
  into v_snapshot
  from conjuntos.escenarios_demo as escenario
  where escenario.conjunto_id = p_conjunto_id
  for update;

  if v_snapshot is null then
    raise exception 'La copropiedad no tiene escenario de demostración';
  end if;

  v_snapshot := jsonb_set(
    v_snapshot,
    '{announcements}',
    jsonb_build_array(v_item) || coalesce(v_snapshot -> 'announcements', '[]'::jsonb),
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
        'action', 'comunicaciones.comunicado_creado',
        'resource', v_comunicado_id,
        'detail', 'Comunicado registrado para entrega multicanal',
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
    'comunicaciones.comunicado_creado',
    'comunicado',
    v_comunicado_id,
    jsonb_build_object(
      'audiencia', p_audiencia,
      'canales', p_canales,
      'estado', p_estado
    )
  );

  return v_item;
exception
  when invalid_text_representation then
    raise exception 'Los datos del comunicado no son válidos' using errcode = '22023';
end;
$$;

revoke all on function conjuntos.registrar_comunicado_demo(
  uuid,
  text,
  text,
  text,
  text[],
  text,
  timestamptz
) from public;

grant execute on function conjuntos.registrar_comunicado_demo(
  uuid,
  text,
  text,
  text,
  text[],
  text,
  timestamptz
) to authenticated, service_role;
