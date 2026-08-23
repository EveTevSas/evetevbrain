create function conjuntos.reservar_zona_residente_demo(
  p_conjunto_id uuid,
  p_zona text,
  p_fecha date,
  p_hora time
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reserva_id uuid := gen_random_uuid();
  v_residente_nombre text;
  v_unidad_codigo text;
  v_monto_minor bigint;
  v_item jsonb;
  v_snapshot jsonb;
  v_auditoria jsonb;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['residente']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Solo un residente puede reservar zonas comunes desde este perfil';
  end if;

  p_zona := trim(p_zona);
  if p_zona not in ('Salón social Arrayán', 'Cancha múltiple', 'BBQ terraza') then
    raise exception 'La zona común seleccionada no es válida' using errcode = '22023';
  end if;
  if p_fecha is null or p_hora is null then
    raise exception 'Debes indicar la fecha y la hora de la reserva' using errcode = '22023';
  end if;
  if p_fecha::timestamp + p_hora <= now() at time zone 'America/Bogota' then
    raise exception 'La reserva debe programarse para una fecha y hora futuras' using errcode = '22023';
  end if;

  select persona.nombre, unidad.codigo
  into v_residente_nombre, v_unidad_codigo
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
  order by vinculo.responsable_pago desc, vinculo.vigente_desde desc
  limit 1;

  if v_unidad_codigo is null then
    raise insufficient_privilege using message = 'El usuario no tiene una unidad vigente';
  end if;

  select escenario.snapshot
  into v_snapshot
  from conjuntos.escenarios_demo as escenario
  where escenario.conjunto_id = p_conjunto_id
  for update;

  if v_snapshot is null then
    raise exception 'La copropiedad no tiene escenario de demostración';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(v_snapshot -> 'reservations', '[]'::jsonb)) as reserva(value)
    where reserva.value ->> 'amenity' = p_zona
      and reserva.value ->> 'date' = p_fecha::text
      and reserva.value ->> 'time' = to_char(p_hora, 'HH24:MI')
      and coalesce(reserva.value ->> 'status', 'confirmed') <> 'cancelled'
  ) then
    raise unique_violation using message = 'La zona ya está reservada para esa fecha y hora';
  end if;

  v_monto_minor := case
    when lower(p_zona) like '%cancha%' then 0
    when lower(p_zona) like '%bbq%' then 12000000
    else 18000000
  end;

  v_item := jsonb_build_object(
    'id', v_reserva_id,
    'amenity', p_zona,
    'date', p_fecha,
    'time', to_char(p_hora, 'HH24:MI'),
    'resident', v_residente_nombre,
    'unit', v_unidad_codigo,
    'amountMinor', v_monto_minor,
    'status', 'confirmed'
  );

  v_snapshot := jsonb_set(
    v_snapshot,
    '{reservations}',
    jsonb_build_array(v_item) || coalesce(v_snapshot -> 'reservations', '[]'::jsonb),
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
        'action', 'reservas.reserva_confirmada',
        'resource', v_reserva_id,
        'detail', p_zona || ', ' || p_fecha::text || ' ' || to_char(p_hora, 'HH24:MI'),
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
    'reservas.reserva_confirmada',
    'reserva_zona_comun',
    v_reserva_id,
    jsonb_build_object(
      'zona', p_zona,
      'fecha', p_fecha,
      'hora', to_char(p_hora, 'HH24:MI'),
      'unidad', v_unidad_codigo,
      'monto_minor', v_monto_minor
    )
  );

  return v_item;
end;
$$;

revoke all on function conjuntos.reservar_zona_residente_demo(uuid, text, date, time) from public;

grant execute on function conjuntos.reservar_zona_residente_demo(uuid, text, date, time)
to authenticated, service_role;
