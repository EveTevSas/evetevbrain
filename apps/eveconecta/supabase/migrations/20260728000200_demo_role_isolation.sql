-- La proyección completa contiene datos operativos identificados y solo puede
-- consultarse directamente por la administración. Los demás roles reciben una
-- proyección depurada desde una función security definer que sigue validando
-- auth.uid() y la membresía activa.

drop policy escenarios_demo_seleccionar
  on conjuntos.escenarios_demo;

create policy escenarios_demo_seleccionar_administracion
on conjuntos.escenarios_demo for select to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

create function conjuntos.obtener_escenario_demo(p_conjunto_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role conjuntos.rol_miembro;
  v_snapshot jsonb;
  v_unit text;
  v_filtered jsonb;
begin
  select miembro.rol
    into v_role
  from conjuntos.miembros_conjunto as miembro
  where miembro.conjunto_id = p_conjunto_id
    and miembro.usuario_id = auth.uid()
    and miembro.activo
  limit 1;

  if v_role is null then
    raise insufficient_privilege
      using message = 'El usuario no pertenece a la copropiedad solicitada';
  end if;

  select escenario.snapshot
    into v_snapshot
  from conjuntos.escenarios_demo as escenario
  where escenario.conjunto_id = p_conjunto_id;

  if v_snapshot is null then
    return null;
  end if;

  if v_role in ('super_admin', 'admin_conjunto') then
    return v_snapshot;
  end if;

  if v_role = 'residente' then
    select unidad.codigo
      into v_unit
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
    order by vinculo.responsable_pago desc, vinculo.vigente_desde
    limit 1;

    if v_unit is null then
      raise insufficient_privilege
        using message = 'El residente no tiene una unidad vigente';
    end if;

    select coalesce(jsonb_agg(item), '[]'::jsonb)
      into v_filtered
    from jsonb_array_elements(coalesce(v_snapshot -> 'fees', '[]'::jsonb)) as item
    where item ->> 'unit' = v_unit;
    v_snapshot := jsonb_set(v_snapshot, '{fees}', v_filtered);

    select coalesce(jsonb_agg(item), '[]'::jsonb)
      into v_filtered
    from jsonb_array_elements(coalesce(v_snapshot -> 'people', '[]'::jsonb)) as item
    where item ->> 'unit' = v_unit;
    v_snapshot := jsonb_set(v_snapshot, '{people}', v_filtered);

    select coalesce(jsonb_agg(item), '[]'::jsonb)
      into v_filtered
    from jsonb_array_elements(coalesce(v_snapshot -> 'cases', '[]'::jsonb)) as item
    where item ->> 'unit' = v_unit;
    v_snapshot := jsonb_set(v_snapshot, '{cases}', v_filtered);

    select coalesce(jsonb_agg(item), '[]'::jsonb)
      into v_filtered
    from jsonb_array_elements(coalesce(v_snapshot -> 'reservations', '[]'::jsonb)) as item
    where item ->> 'unit' = v_unit;
    v_snapshot := jsonb_set(v_snapshot, '{reservations}', v_filtered);

    select coalesce(jsonb_agg(item), '[]'::jsonb)
      into v_filtered
    from jsonb_array_elements(coalesce(v_snapshot -> 'visitors', '[]'::jsonb)) as item
    where item ->> 'unit' = v_unit;
    v_snapshot := jsonb_set(v_snapshot, '{visitors}', v_filtered);

    select coalesce(jsonb_agg(item), '[]'::jsonb)
      into v_filtered
    from jsonb_array_elements(coalesce(v_snapshot -> 'documents', '[]'::jsonb)) as item
    where item ->> 'visibility' = 'residents';
    v_snapshot := jsonb_set(v_snapshot, '{documents}', v_filtered);

    v_snapshot := jsonb_set(v_snapshot, '{metrics}', '[]'::jsonb);
    v_snapshot := jsonb_set(v_snapshot, '{portfolio}', '[]'::jsonb);
    v_snapshot := jsonb_set(v_snapshot, '{workOrders}', '[]'::jsonb);
    v_snapshot := jsonb_set(v_snapshot, '{expenses}', '[]'::jsonb);
    v_snapshot := jsonb_set(v_snapshot, '{audit}', '[]'::jsonb);
    return v_snapshot;
  end if;

  -- El consejo accede a gobierno, presupuesto agregado y mantenimiento, pero
  -- nunca al censo identificado, la cartera individual ni eventos de portería.
  select coalesce(jsonb_agg(item), '[]'::jsonb)
    into v_filtered
  from jsonb_array_elements(coalesce(v_snapshot -> 'documents', '[]'::jsonb)) as item
  where item ->> 'visibility' in ('residents', 'council');
  v_snapshot := jsonb_set(v_snapshot, '{documents}', v_filtered);
  v_snapshot := jsonb_set(v_snapshot, '{fees}', '[]'::jsonb);
  v_snapshot := jsonb_set(v_snapshot, '{people}', '[]'::jsonb);
  v_snapshot := jsonb_set(v_snapshot, '{cases}', '[]'::jsonb);
  v_snapshot := jsonb_set(v_snapshot, '{reservations}', '[]'::jsonb);
  v_snapshot := jsonb_set(v_snapshot, '{visitors}', '[]'::jsonb);
  v_snapshot := jsonb_set(v_snapshot, '{audit}', '[]'::jsonb);
  return v_snapshot;
end;
$$;

revoke all on function conjuntos.obtener_escenario_demo(uuid) from public;
grant execute on function conjuntos.obtener_escenario_demo(uuid)
  to authenticated, service_role;
