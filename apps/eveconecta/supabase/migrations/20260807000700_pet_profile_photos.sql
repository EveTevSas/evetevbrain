alter table conjuntos.mascotas
add column foto_path text;

alter table conjuntos.mascotas
add constraint mascotas_foto_path_valido check (
  foto_path is null
  or foto_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/perfil\.(jpg|png|webp)$'
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'eveconecta-pet-photos',
  'eveconecta-pet-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy mascotas_fotos_consultar
on storage.objects for select to authenticated
using (
  bucket_id = 'eveconecta-pet-photos'
  and exists (
    select 1
    from conjuntos.miembros_conjunto as miembro
    where miembro.conjunto_id::text = (storage.foldername(name))[1]
      and miembro.usuario_id = auth.uid()
      and miembro.activo
      and miembro.rol = any (
        array['super_admin', 'admin_conjunto', 'residente']::conjuntos.rol_miembro[]
      )
  )
);

create policy mascotas_fotos_insertar_residente
on storage.objects for insert to authenticated
with check (
  bucket_id = 'eveconecta-pet-photos'
  and (storage.foldername(name))[2] = auth.uid()::text
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/perfil\.(jpg|png|webp)$'
  and exists (
    select 1
    from conjuntos.miembros_conjunto as miembro
    where miembro.conjunto_id::text = (storage.foldername(name))[1]
      and miembro.usuario_id = auth.uid()
      and miembro.activo
      and miembro.rol = 'residente'
  )
);

create policy mascotas_fotos_actualizar_residente
on storage.objects for update to authenticated
using (
  bucket_id = 'eveconecta-pet-photos'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists (
    select 1
    from conjuntos.miembros_conjunto as miembro
    where miembro.conjunto_id::text = (storage.foldername(name))[1]
      and miembro.usuario_id = auth.uid()
      and miembro.activo
      and miembro.rol = 'residente'
  )
)
with check (
  bucket_id = 'eveconecta-pet-photos'
  and (storage.foldername(name))[2] = auth.uid()::text
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/perfil\.(jpg|png|webp)$'
  and exists (
    select 1
    from conjuntos.miembros_conjunto as miembro
    where miembro.conjunto_id::text = (storage.foldername(name))[1]
      and miembro.usuario_id = auth.uid()
      and miembro.activo
      and miembro.rol = 'residente'
  )
);

create policy mascotas_fotos_eliminar_residente
on storage.objects for delete to authenticated
using (
  bucket_id = 'eveconecta-pet-photos'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists (
    select 1
    from conjuntos.miembros_conjunto as miembro
    where miembro.conjunto_id::text = (storage.foldername(name))[1]
      and miembro.usuario_id = auth.uid()
      and miembro.activo
      and miembro.rol = 'residente'
  )
);

create function conjuntos.actualizar_foto_mascota_demo(
  p_conjunto_id uuid,
  p_mascota_id uuid,
  p_foto_path text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_persona_id uuid;
  v_item jsonb;
  v_snapshot jsonb;
  v_mascotas jsonb;
  v_auditoria jsonb;
  v_prefijo text;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['residente']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Solo un residente puede actualizar la foto';
  end if;

  v_prefijo := p_conjunto_id::text || '/' || auth.uid()::text || '/' || p_mascota_id::text || '/perfil.';
  if p_foto_path not in (
    v_prefijo || 'jpg',
    v_prefijo || 'png',
    v_prefijo || 'webp'
  ) then
    raise exception 'La ruta de la foto no es válida' using errcode = '22023';
  end if;

  update conjuntos.mascotas as mascota
  set foto_path = p_foto_path
  from conjuntos.personas as persona
  where mascota.id = p_mascota_id
    and mascota.conjunto_id = p_conjunto_id
    and persona.conjunto_id = mascota.conjunto_id
    and persona.id = mascota.persona_id
    and persona.auth_usuario_id = auth.uid()
    and persona.anonimizada_en is null
  returning mascota.persona_id into v_persona_id;

  if v_persona_id is null then
    raise no_data_found using message = 'La mascota no pertenece a la unidad del residente';
  end if;

  select escenario.snapshot
  into v_snapshot
  from conjuntos.escenarios_demo as escenario
  where escenario.conjunto_id = p_conjunto_id
  for update;

  if v_snapshot is null then
    raise exception 'La copropiedad no tiene escenario de demostración';
  end if;

  select coalesce(
    jsonb_agg(
      case
        when mascota.value ->> 'id' = p_mascota_id::text
          then jsonb_set(mascota.value, '{photoPath}', to_jsonb(p_foto_path), true)
        else mascota.value
      end
      order by mascota.ordinality
    ),
    '[]'::jsonb
  )
  into v_mascotas
  from jsonb_array_elements(coalesce(v_snapshot -> 'pets', '[]'::jsonb))
    with ordinality as mascota(value, ordinality);

  v_snapshot := jsonb_set(v_snapshot, '{pets}', v_mascotas, true);

  select mascota.value
  into v_item
  from jsonb_array_elements(v_mascotas) as mascota(value)
  where mascota.value ->> 'id' = p_mascota_id::text;

  if v_item is null then
    raise no_data_found using message = 'La mascota no existe en el escenario de demostración';
  end if;

  select coalesce(jsonb_agg(evento.value order by evento.ordinality), '[]'::jsonb)
  into v_auditoria
  from jsonb_array_elements(
    jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'occurredAt', now(),
        'actor', 'Residente de la unidad',
        'action', 'comunidad.mascota_foto_actualizada',
        'resource', p_mascota_id,
        'detail', 'Foto de perfil de la mascota actualizada',
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
    'comunidad.mascota_foto_actualizada',
    'mascota',
    p_mascota_id,
    jsonb_build_object('foto_configurada', true)
  );

  return v_item;
end;
$$;

revoke all on function conjuntos.actualizar_foto_mascota_demo(uuid, uuid, text)
  from public;

grant execute on function conjuntos.actualizar_foto_mascota_demo(uuid, uuid, text)
  to authenticated, service_role;
