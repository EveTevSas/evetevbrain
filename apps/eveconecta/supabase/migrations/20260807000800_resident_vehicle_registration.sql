drop policy vehiculos_insertar on conjuntos.vehiculos;

create policy vehiculos_insertar_residente
on conjuntos.vehiculos for insert to authenticated
with check (
  estado_acceso = 'autorizado'
  and conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['residente']::conjuntos.rol_miembro[]
  )
  and conjuntos.usuario_puede_ver_unidad(conjunto_id, unidad_id)
  and exists (
    select 1
    from conjuntos.personas as persona
    where persona.conjunto_id = vehiculos.conjunto_id
      and persona.id = vehiculos.persona_id
      and persona.auth_usuario_id = auth.uid()
      and persona.anonimizada_en is null
  )
);

create function conjuntos.registrar_vehiculo_residente_demo(
  p_conjunto_id uuid,
  p_placa text,
  p_clase text,
  p_marca text,
  p_color text,
  p_vigente_hasta date
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
  v_vehiculo_id uuid := gen_random_uuid();
  v_placa text;
  v_item jsonb;
  v_snapshot jsonb;
  v_personas jsonb;
  v_auditoria jsonb;
  v_vehiculos integer;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['residente']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Solo un residente puede registrar vehículos';
  end if;

  v_placa := upper(regexp_replace(trim(p_placa), '[^A-Za-z0-9]', '', 'g'));
  if v_placa !~ '^[A-Z0-9]{5,8}$' then
    raise exception 'La placa no es válida' using errcode = '22023';
  end if;
  if length(trim(p_marca)) < 2 or length(trim(p_color)) < 2 then
    raise exception 'La marca y el color no son válidos' using errcode = '22023';
  end if;
  if p_vigente_hasta is not null and p_vigente_hasta < current_date then
    raise exception 'La vigencia no puede estar en el pasado' using errcode = '22023';
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

  insert into conjuntos.vehiculos (
    id,
    conjunto_id,
    persona_id,
    unidad_id,
    placa,
    placa_normalizada,
    clase,
    marca,
    color,
    estado_acceso,
    vigente_desde,
    vigente_hasta
  ) values (
    v_vehiculo_id,
    p_conjunto_id,
    v_persona_id,
    v_unidad_id,
    v_placa,
    v_placa,
    p_clase::conjuntos.clase_vehiculo,
    trim(p_marca),
    trim(p_color),
    'autorizado',
    now(),
    p_vigente_hasta
  );

  v_item := jsonb_build_object(
    'id', v_vehiculo_id,
    'plate', v_placa,
    'kind', case p_clase
      when 'automovil' then 'car'
      when 'motocicleta' then 'motorcycle'
      else 'other'
    end,
    'brand', trim(p_marca),
    'color', trim(p_color),
    'personId', v_persona_id,
    'resident', v_residente_nombre,
    'unit', v_unidad_codigo,
    'parkingSpotId', null,
    'parkingCode', null,
    'accessStatus', 'authorized',
    'validFrom', now(),
    'validUntil', p_vigente_hasta
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
  into v_vehiculos
  from conjuntos.vehiculos as vehiculo
  where vehiculo.conjunto_id = p_conjunto_id
    and vehiculo.persona_id = v_persona_id;

  select coalesce(
    jsonb_agg(
      case
        when persona.value ->> 'id' = v_persona_id::text
          then jsonb_set(persona.value, '{vehicles}', to_jsonb(v_vehiculos), true)
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
    '{vehicles}',
    coalesce(v_snapshot -> 'vehicles', '[]'::jsonb) || jsonb_build_array(v_item),
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
        'action', 'comunidad.vehiculo_registrado',
        'resource', v_vehiculo_id,
        'detail', 'Vehículo permanente registrado por el residente',
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
    'comunidad.vehiculo_registrado',
    'vehiculo',
    v_vehiculo_id,
    jsonb_build_object('clase', p_clase, 'vigente_hasta', p_vigente_hasta)
  );

  return v_item;
exception
  when invalid_text_representation then
    raise exception 'Los datos del vehículo no son válidos' using errcode = '22023';
end;
$$;

revoke all on function conjuntos.registrar_vehiculo_residente_demo(
  uuid,
  text,
  text,
  text,
  text,
  date
) from public;

grant execute on function conjuntos.registrar_vehiculo_residente_demo(
  uuid,
  text,
  text,
  text,
  text,
  date
) to authenticated, service_role;
