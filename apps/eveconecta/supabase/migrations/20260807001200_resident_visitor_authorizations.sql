create function conjuntos.autorizar_visitante_residente_demo(
  p_conjunto_id uuid,
  p_nombre text,
  p_documento_ultimos4 text,
  p_placa text,
  p_vigente_desde timestamptz,
  p_vigente_hasta timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_visitante_id uuid := gen_random_uuid();
  v_unidad_codigo text;
  v_placa text;
  v_codigo_acceso text;
  v_item jsonb;
  v_snapshot jsonb;
  v_auditoria jsonb;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['residente']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Solo un residente puede autorizar visitantes desde este perfil';
  end if;

  if length(trim(p_nombre)) < 3 or length(trim(p_nombre)) > 100 then
    raise exception 'El nombre del visitante no es válido' using errcode = '22023';
  end if;
  if p_documento_ultimos4 !~ '^\d{4}$' then
    raise exception 'Debes indicar los últimos cuatro dígitos del documento' using errcode = '22023';
  end if;
  if p_vigente_desde is null or p_vigente_hasta is null or p_vigente_hasta <= p_vigente_desde then
    raise exception 'La fecha final debe ser posterior a la fecha inicial' using errcode = '22023';
  end if;
  if p_vigente_hasta <= now() then
    raise exception 'La autorización debe finalizar en el futuro' using errcode = '22023';
  end if;

  v_placa := nullif(upper(regexp_replace(trim(coalesce(p_placa, '')), '[^A-Za-z0-9]', '', 'g')), '');
  if v_placa is not null and v_placa !~ '^[A-Z0-9]{5,8}$' then
    raise exception 'La placa no es válida' using errcode = '22023';
  end if;

  select unidad.codigo
  into v_unidad_codigo
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

  if v_unidad_codigo is null then
    raise insufficient_privilege using message = 'El usuario no tiene una unidad vigente';
  end if;

  v_codigo_acceso := (100000 + floor(random() * 900000)::integer)::text;
  v_item := jsonb_build_object(
    'id', v_visitante_id,
    'name', trim(p_nombre),
    'documentSuffix', p_documento_ultimos4,
    'unit', v_unidad_codigo,
    'vehiclePlate', v_placa,
    'validFrom', p_vigente_desde,
    'validUntil', p_vigente_hasta,
    'status', 'expected',
    'accessCode', v_codigo_acceso,
    'offlineCreated', false
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
    '{visitors}',
    jsonb_build_array(v_item) || coalesce(v_snapshot -> 'visitors', '[]'::jsonb),
    true
  );

  select coalesce(jsonb_agg(evento.value order by evento.ordinality), '[]'::jsonb)
  into v_auditoria
  from jsonb_array_elements(
    jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'occurredAt', now(),
        'actor', 'Residente de la unidad',
        'action', 'porteria.visitante_autorizado',
        'resource', v_visitante_id,
        'detail', 'Autorización de visitante creada para ' || v_unidad_codigo,
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
    'porteria.visitante_autorizado',
    'visitante',
    v_visitante_id,
    jsonb_build_object(
      'unidad', v_unidad_codigo,
      'vigente_desde', p_vigente_desde,
      'vigente_hasta', p_vigente_hasta,
      'tiene_vehiculo', v_placa is not null
    )
  );

  return v_item;
end;
$$;

revoke all on function conjuntos.autorizar_visitante_residente_demo(
  uuid,
  text,
  text,
  text,
  timestamptz,
  timestamptz
) from public;

grant execute on function conjuntos.autorizar_visitante_residente_demo(
  uuid,
  text,
  text,
  text,
  timestamptz,
  timestamptz
) to authenticated, service_role;
