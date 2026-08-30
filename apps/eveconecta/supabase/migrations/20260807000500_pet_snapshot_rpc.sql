create function conjuntos.registrar_mascota_demo(
  p_conjunto_id uuid,
  p_tipo text,
  p_anio_nacimiento integer,
  p_tamano text,
  p_nombre text,
  p_estado text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_persona_id uuid;
  v_unidad_id uuid;
  v_unidad_codigo text;
  v_residente_nombre text;
  v_mascota_id uuid := gen_random_uuid();
  v_item jsonb;
  v_snapshot jsonb;
  v_personas jsonb;
  v_auditoria jsonb;
  v_activas integer;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['residente']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Solo un residente puede registrar mascotas';
  end if;

  select persona.id, unidad.id, unidad.codigo, persona.nombre
  into v_persona_id, v_unidad_id, v_unidad_codigo, v_residente_nombre
  from conjuntos.personas as persona
  inner join conjuntos.personas_unidades as vinculo
    on vinculo.conjunto_id = persona.conjunto_id
    and vinculo.persona_id = persona.id
  inner join conjuntos.unidades as unidad
    on unidad.conjunto_id = vinculo.conjunto_id
    and unidad.id = vinculo.unidad_id
  where persona.conjunto_id = p_conjunto_id
    and persona.auth_usuario_id = auth.uid()
    and persona.anonimizada_en is null
    and vinculo.vigente_desde <= current_date
    and (vinculo.vigente_hasta is null or vinculo.vigente_hasta >= current_date)
  order by vinculo.vigente_desde desc
  limit 1;

  if v_persona_id is null then
    raise insufficient_privilege using message = 'El usuario no tiene una unidad vigente';
  end if;

  insert into conjuntos.mascotas (
    id,
    conjunto_id,
    persona_id,
    unidad_id,
    tipo,
    anio_nacimiento,
    tamano,
    nombre,
    estado
  ) values (
    v_mascota_id,
    p_conjunto_id,
    v_persona_id,
    v_unidad_id,
    p_tipo::conjuntos.tipo_mascota,
    p_anio_nacimiento,
    p_tamano::conjuntos.tamano_mascota,
    trim(p_nombre),
    p_estado::conjuntos.estado_mascota
  );

  v_item := jsonb_build_object(
    'id', v_mascota_id,
    'personId', v_persona_id,
    'resident', v_residente_nombre,
    'unit', v_unidad_codigo,
    'type', case p_tipo when 'perro' then 'dog' else 'cat' end,
    'birthYear', p_anio_nacimiento,
    'size', case p_tamano when 'grande' then 'large' when 'mediano' then 'medium' else 'small' end,
    'name', trim(p_nombre),
    'status', case p_estado when 'activo' then 'active' else 'inactive' end,
    'createdAt', now()
  );

  select escenario.snapshot
  into v_snapshot
  from conjuntos.escenarios_demo as escenario
  where escenario.conjunto_id = p_conjunto_id
  for update;

  if v_snapshot is null then
    raise exception 'La copropiedad no tiene escenario de demostración';
  end if;

  select count(*)::integer
  into v_activas
  from conjuntos.mascotas as mascota
  where mascota.conjunto_id = p_conjunto_id
    and mascota.persona_id = v_persona_id
    and mascota.estado = 'activo';

  select coalesce(
    jsonb_agg(
      case
        when persona.value ->> 'id' = v_persona_id::text
          then jsonb_set(persona.value, '{pets}', to_jsonb(v_activas), true)
        else persona.value
      end
      order by persona.ordinality
    ),
    '[]'::jsonb
  )
  into v_personas
  from jsonb_array_elements(coalesce(v_snapshot -> 'people', '[]'::jsonb))
    with ordinality as persona(value, ordinality);

  v_snapshot := jsonb_set(
    v_snapshot,
    '{pets}',
    coalesce(v_snapshot -> 'pets', '[]'::jsonb) || jsonb_build_array(v_item),
    true
  );
  v_snapshot := jsonb_set(v_snapshot, '{people}', v_personas, true);

  select coalesce(jsonb_agg(evento.value order by evento.ordinality), '[]'::jsonb)
  into v_auditoria
  from jsonb_array_elements(
    jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'occurredAt', now(),
        'actor', 'Residente de la unidad',
        'action', 'comunidad.mascota_registrada',
        'resource', v_mascota_id,
        'detail', 'Registro de mascota creado por el residente',
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
    'comunidad.mascota_registrada',
    'mascota',
    v_mascota_id,
    jsonb_build_object('estado', p_estado)
  );

  return v_item;
exception
  when invalid_text_representation then
    raise exception 'Los datos de la mascota no son válidos' using errcode = '22023';
end;
$$;

create function conjuntos.actualizar_estado_mascota_demo(
  p_conjunto_id uuid,
  p_mascota_id uuid,
  p_estado text
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
  v_personas jsonb;
  v_auditoria jsonb;
  v_activas integer;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['residente']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Solo un residente puede actualizar mascotas';
  end if;

  update conjuntos.mascotas as mascota
  set estado = p_estado::conjuntos.estado_mascota
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

  select count(*)::integer
  into v_activas
  from conjuntos.mascotas as mascota
  where mascota.conjunto_id = p_conjunto_id
    and mascota.persona_id = v_persona_id
    and mascota.estado = 'activo';

  select coalesce(
    jsonb_agg(
      case
        when mascota.value ->> 'id' = p_mascota_id::text
          then jsonb_set(
            mascota.value,
            '{status}',
            to_jsonb(case p_estado when 'activo' then 'active' else 'inactive' end),
            true
          )
        else mascota.value
      end
      order by mascota.ordinality
    ),
    '[]'::jsonb
  )
  into v_mascotas
  from jsonb_array_elements(coalesce(v_snapshot -> 'pets', '[]'::jsonb))
    with ordinality as mascota(value, ordinality);

  select coalesce(
    jsonb_agg(
      case
        when persona.value ->> 'id' = v_persona_id::text
          then jsonb_set(persona.value, '{pets}', to_jsonb(v_activas), true)
        else persona.value
      end
      order by persona.ordinality
    ),
    '[]'::jsonb
  )
  into v_personas
  from jsonb_array_elements(coalesce(v_snapshot -> 'people', '[]'::jsonb))
    with ordinality as persona(value, ordinality);

  v_snapshot := jsonb_set(v_snapshot, '{pets}', v_mascotas, true);
  v_snapshot := jsonb_set(v_snapshot, '{people}', v_personas, true);

  select mascota.value
  into v_item
  from jsonb_array_elements(v_mascotas) as mascota(value)
  where mascota.value ->> 'id' = p_mascota_id::text;

  select coalesce(jsonb_agg(evento.value order by evento.ordinality), '[]'::jsonb)
  into v_auditoria
  from jsonb_array_elements(
    jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'occurredAt', now(),
        'actor', 'Residente de la unidad',
        'action', case p_estado when 'activo'
          then 'comunidad.mascota_reactivada'
          else 'comunidad.mascota_inactivada'
        end,
        'resource', p_mascota_id,
        'detail', 'Estado del registro de mascota actualizado',
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
    case p_estado when 'activo'
      then 'comunidad.mascota_reactivada'
      else 'comunidad.mascota_inactivada'
    end,
    'mascota',
    p_mascota_id,
    jsonb_build_object('estado', p_estado)
  );

  return v_item;
exception
  when invalid_text_representation then
    raise exception 'El estado de la mascota no es válido' using errcode = '22023';
end;
$$;

revoke all on function conjuntos.registrar_mascota_demo(uuid, text, integer, text, text, text)
  from public;
revoke all on function conjuntos.actualizar_estado_mascota_demo(uuid, uuid, text)
  from public;

grant execute on function conjuntos.registrar_mascota_demo(uuid, text, integer, text, text, text)
  to authenticated, service_role;
grant execute on function conjuntos.actualizar_estado_mascota_demo(uuid, uuid, text)
  to authenticated, service_role;
