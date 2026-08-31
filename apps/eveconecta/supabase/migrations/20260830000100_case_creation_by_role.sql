-- Creación de casos PQRS por todos los roles del conjunto. El residente y el
-- consejo dejan de depender de la administración: cada rol crea el caso desde
-- una función con control de identidad. Para el residente, el solicitante y la
-- unidad se derivan del padrón y nunca del navegador.

create function conjuntos.crear_caso_demo(
  p_conjunto_id uuid,
  p_titulo text,
  p_categoria text,
  p_solicitante text,
  p_unidad text,
  p_prioridad text,
  p_imagenes text[] default array[]::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caso_id uuid := gen_random_uuid();
  v_rol conjuntos.rol_miembro;
  v_solicitante text := trim(coalesce(p_solicitante, ''));
  v_unidad text := trim(coalesce(p_unidad, ''));
  v_actor text;
  v_sla integer;
  v_codigo text;
  v_item jsonb;
  v_snapshot jsonb;
  v_auditoria jsonb;
  v_imagen text;
  v_total_casos integer;
begin
  select miembro.rol
    into v_rol
  from conjuntos.miembros_conjunto as miembro
  where miembro.conjunto_id = p_conjunto_id
    and miembro.usuario_id = auth.uid()
    and miembro.activo
  limit 1;

  if v_rol is null then
    raise insufficient_privilege using message = 'Tu usuario no pertenece a esta copropiedad';
  end if;

  if length(trim(coalesce(p_titulo, ''))) < 5 or length(trim(p_titulo)) > 120 then
    raise exception 'El asunto del caso debe tener entre 5 y 120 caracteres' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_categoria, ''))) < 2 or length(trim(p_categoria)) > 60 then
    raise exception 'La categoría del caso no es válida' using errcode = '22023';
  end if;
  if p_prioridad is null or p_prioridad not in ('low', 'medium', 'high') then
    raise exception 'La prioridad del caso no es válida' using errcode = '22023';
  end if;
  if coalesce(array_length(p_imagenes, 1), 0) > 3 then
    raise exception 'Puedes anexar máximo 3 imágenes por caso' using errcode = '22023';
  end if;

  if v_rol = 'residente' then
    select persona.nombre, unidad.codigo
      into v_solicitante, v_unidad
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
    -- Mismo criterio de selección que obtener_escenario_demo: lo que se escribe
    -- con una unidad debe leerse filtrando por esa misma unidad.
    order by vinculo.responsable_pago desc, vinculo.vigente_desde
    limit 1;

    if v_unidad is null or coalesce(v_solicitante, '') = '' then
      raise insufficient_privilege using message = 'El usuario no tiene una unidad vigente';
    end if;
    v_actor := v_solicitante;
  else
    if v_solicitante = '' or v_unidad = '' then
      raise exception 'Debes indicar el solicitante y la unidad del caso' using errcode = '22023';
    end if;
    if length(v_solicitante) > 100 or length(v_unidad) > 20 then
      raise exception 'El solicitante o la unidad del caso exceden la longitud permitida' using errcode = '22023';
    end if;
    select persona.nombre
      into v_actor
    from conjuntos.personas as persona
    where persona.conjunto_id = p_conjunto_id
      and persona.auth_usuario_id = auth.uid()
      and persona.anonimizada_en is null
    limit 1;
    v_actor := coalesce(
      v_actor,
      case v_rol
        when 'consejo' then 'Consejo de administración'
        else 'Administración del conjunto'
      end
    );
  end if;

  -- Las evidencias deben vivir bajo la carpeta privada de quien crea el caso y
  -- existir realmente en el bucket antes de referenciarlas.
  foreach v_imagen in array coalesce(p_imagenes, array[]::text[]) loop
    if v_imagen !~ (
      '^' || p_conjunto_id::text || '/' || auth.uid()::text || '/[0-9a-f-]{36}/[1-3]\.(jpg|png|webp)$'
    ) then
      raise insufficient_privilege using message = 'Una de las imágenes no pertenece a tu sesión';
    end if;
    if not exists (
      select 1
      from storage.objects as objeto
      where objeto.bucket_id = 'eveconecta-case-images'
        and objeto.name = v_imagen
    ) then
      raise exception 'No fue posible verificar una de las imágenes' using errcode = '22023';
    end if;
  end loop;

  select escenario.snapshot
    into v_snapshot
  from conjuntos.escenarios_demo as escenario
  where escenario.conjunto_id = p_conjunto_id
  for update;

  if v_snapshot is null then
    raise exception 'La copropiedad no tiene escenario de demostración' using errcode = 'P0002';
  end if;

  v_total_casos := jsonb_array_length(coalesce(v_snapshot -> 'cases', '[]'::jsonb));
  -- Tope del escenario: acota el crecimiento del snapshot compartido y evita
  -- que lpad trunque el consecutivo a partir de cuatro dígitos.
  if v_total_casos >= 999 then
    raise exception 'El escenario de demostración alcanzó el límite de casos' using errcode = '22023';
  end if;
  v_codigo := 'PQRS-'
    || to_char(now() at time zone 'America/Bogota', 'YYYY')
    || '-'
    || lpad((v_total_casos + 1)::text, 3, '0');
  v_sla := case p_prioridad when 'high' then 8 when 'medium' then 24 else 48 end;

  v_item := jsonb_build_object(
    'id', v_caso_id,
    'code', v_codigo,
    'title', trim(p_titulo),
    'category', trim(p_categoria),
    'requester', v_solicitante,
    'unit', v_unidad,
    'priority', p_prioridad,
    'imagePaths', to_jsonb(coalesce(p_imagenes, array[]::text[])),
    'status', 'open',
    'slaHours', v_sla,
    'elapsedHours', 0,
    'createdAt', now(),
    'createdBy', auth.uid()
  );

  v_snapshot := jsonb_set(
    v_snapshot,
    '{cases}',
    jsonb_build_array(v_item) || coalesce(v_snapshot -> 'cases', '[]'::jsonb),
    true
  );

  select coalesce(jsonb_agg(evento.value order by evento.ordinality), '[]'::jsonb)
    into v_auditoria
  from jsonb_array_elements(
    jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'occurredAt', now(),
        'actor', v_actor,
        'action', 'pqrs.caso_creado',
        'resource', v_codigo,
        'detail', v_codigo || ': ' || trim(p_titulo),
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
    'pqrs.caso_creado',
    'caso_pqrs',
    v_caso_id,
    jsonb_build_object(
      'codigo', v_codigo,
      'prioridad', p_prioridad,
      'unidad', v_unidad,
      'imagenes', coalesce(array_length(p_imagenes, 1), 0)
    )
  );

  return v_item;
end;
$$;

revoke all on function conjuntos.crear_caso_demo(uuid, text, text, text, text, text, text[]) from public;

grant execute on function conjuntos.crear_caso_demo(uuid, text, text, text, text, text, text[])
to authenticated, service_role;

-- Las evidencias dejan de ser exclusivas de la administración: cualquier
-- miembro activo escribe bajo su propia carpeta. La lectura distingue roles:
-- la administración consulta todas las evidencias del conjunto; consejo y
-- residente solo las que ellos mismos cargaron.

drop policy casos_imagenes_insertar_administracion on storage.objects;

create policy casos_imagenes_insertar_miembros
on storage.objects for insert to authenticated
with check (
  bucket_id = 'eveconecta-case-images'
  and (storage.foldername(name))[2] = auth.uid()::text
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/[1-3]\.(jpg|png|webp)$'
  and exists (
    select 1
    from conjuntos.miembros_conjunto as miembro
    where miembro.conjunto_id::text = (storage.foldername(name))[1]
      and miembro.usuario_id = auth.uid()
      and miembro.activo
      and miembro.rol = any (
        array[
          'super_admin',
          'admin_conjunto',
          'consejo',
          'residente'
        ]::conjuntos.rol_miembro[]
      )
  )
);

drop policy casos_imagenes_eliminar_administracion on storage.objects;

-- Una evidencia ya referenciada por un caso es prueba del expediente: consejo y
-- residente solo pueden retirar archivos que ningún caso referencia (la
-- reversión tras un fallo de creación). La consulta corre como security definer
-- porque el snapshot no es legible directamente por esos roles.
create function conjuntos.evidencia_caso_referenciada(p_ruta text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from conjuntos.escenarios_demo as escenario,
      jsonb_array_elements(coalesce(escenario.snapshot -> 'cases', '[]'::jsonb)) as caso(value)
    where escenario.conjunto_id::text = (storage.foldername(p_ruta))[1]
      and coalesce(caso.value -> 'imagePaths', '[]'::jsonb) ? p_ruta
  );
$$;

revoke all on function conjuntos.evidencia_caso_referenciada(text) from public;

grant execute on function conjuntos.evidencia_caso_referenciada(text)
to authenticated, service_role;

create policy casos_imagenes_eliminar_propias
on storage.objects for delete to authenticated
using (
  bucket_id = 'eveconecta-case-images'
  and (storage.foldername(name))[2] = auth.uid()::text
  and (
    exists (
      select 1
      from conjuntos.miembros_conjunto as miembro
      where miembro.conjunto_id::text = (storage.foldername(name))[1]
        and miembro.usuario_id = auth.uid()
        and miembro.activo
        and miembro.rol = any (
          array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
        )
    )
    or (
      not conjuntos.evidencia_caso_referenciada(name)
      and exists (
        select 1
        from conjuntos.miembros_conjunto as miembro
        where miembro.conjunto_id::text = (storage.foldername(name))[1]
          and miembro.usuario_id = auth.uid()
          and miembro.activo
          and miembro.rol = any (
            array['consejo', 'residente']::conjuntos.rol_miembro[]
          )
      )
    )
  )
);

drop policy casos_imagenes_consultar on storage.objects;

create policy casos_imagenes_consultar
on storage.objects for select to authenticated
using (
  bucket_id = 'eveconecta-case-images'
  and (
    exists (
      select 1
      from conjuntos.miembros_conjunto as miembro
      where miembro.conjunto_id::text = (storage.foldername(name))[1]
        and miembro.usuario_id = auth.uid()
        and miembro.activo
        and miembro.rol = any (
          array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
        )
    )
    or (
      (storage.foldername(name))[2] = auth.uid()::text
      and exists (
        select 1
        from conjuntos.miembros_conjunto as miembro
        where miembro.conjunto_id::text = (storage.foldername(name))[1]
          and miembro.usuario_id = auth.uid()
          and miembro.activo
          and miembro.rol = any (
            array['consejo', 'residente']::conjuntos.rol_miembro[]
          )
      )
    )
  )
);

-- El consejo ahora ve los casos que él mismo creó (antes la proyección los
-- vaciaba por completo). Se mantiene la regla de no exponerle el censo
-- identificado, la cartera individual ni la portería.

create or replace function conjuntos.obtener_escenario_demo(p_conjunto_id uuid)
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

  select coalesce(jsonb_agg(item), '[]'::jsonb)
    into v_filtered
  from jsonb_array_elements(coalesce(v_snapshot -> 'cases', '[]'::jsonb)) as item
  where item ->> 'createdBy' = auth.uid()::text;
  v_snapshot := jsonb_set(v_snapshot, '{cases}', v_filtered);

  v_snapshot := jsonb_set(v_snapshot, '{fees}', '[]'::jsonb);
  v_snapshot := jsonb_set(v_snapshot, '{people}', '[]'::jsonb);
  v_snapshot := jsonb_set(v_snapshot, '{reservations}', '[]'::jsonb);
  v_snapshot := jsonb_set(v_snapshot, '{visitors}', '[]'::jsonb);
  v_snapshot := jsonb_set(v_snapshot, '{audit}', '[]'::jsonb);
  return v_snapshot;
end;
$$;

-- Aprobación de gastos con identidad en la base: se exigen dos personas
-- distintas y el consejo participa como aprobador (la interfaz ya le ofrecía el
-- botón y el servidor lo rechazaba). El registro del gasto sigue siendo de la
-- administración.

create function conjuntos.aprobar_gasto_demo(
  p_conjunto_id uuid,
  p_gasto_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol conjuntos.rol_miembro;
  v_actor text;
  v_snapshot jsonb;
  v_gasto jsonb;
  v_indice integer;
  v_aprobadores jsonb;
  v_aprobaciones integer;
  v_requeridas integer;
  v_auditoria jsonb;
begin
  select miembro.rol
    into v_rol
  from conjuntos.miembros_conjunto as miembro
  where miembro.conjunto_id = p_conjunto_id
    and miembro.usuario_id = auth.uid()
    and miembro.activo
  limit 1;

  if v_rol is null then
    raise insufficient_privilege using message = 'Tu usuario no pertenece a esta copropiedad';
  end if;
  if v_rol not in ('super_admin', 'admin_conjunto', 'consejo') then
    raise insufficient_privilege using message = 'Tu rol no permite aprobar gastos';
  end if;

  select persona.nombre
    into v_actor
  from conjuntos.personas as persona
  where persona.conjunto_id = p_conjunto_id
    and persona.auth_usuario_id = auth.uid()
    and persona.anonimizada_en is null
  limit 1;
  v_actor := coalesce(
    v_actor,
    case v_rol
      when 'consejo' then 'Consejo de administración'
      else 'Administración del conjunto'
    end
  );

  select escenario.snapshot
    into v_snapshot
  from conjuntos.escenarios_demo as escenario
  where escenario.conjunto_id = p_conjunto_id
  for update;

  if v_snapshot is null then
    raise exception 'La copropiedad no tiene escenario de demostración' using errcode = 'P0002';
  end if;

  select gasto.value, gasto.ordinality::integer
    into v_gasto, v_indice
  from jsonb_array_elements(coalesce(v_snapshot -> 'expenses', '[]'::jsonb))
    with ordinality as gasto(value, ordinality)
  where gasto.value ->> 'id' = p_gasto_id::text
  limit 1;

  if v_gasto is null then
    raise exception 'La solicitud de gasto no existe' using errcode = 'P0002';
  end if;
  if v_gasto ->> 'status' <> 'pending_approval' then
    raise exception 'La solicitud ya no está pendiente de aprobación' using errcode = '55000';
  end if;

  v_aprobadores := coalesce(v_gasto -> 'approvedBy', '[]'::jsonb);
  if v_aprobadores ? auth.uid()::text then
    raise unique_violation using message = 'Ya registraste tu aprobación; falta la de otra persona';
  end if;

  v_aprobadores := v_aprobadores || to_jsonb(auth.uid()::text);
  v_requeridas := coalesce((v_gasto ->> 'approvalsRequired')::integer, 2);
  v_aprobaciones := least(coalesce((v_gasto ->> 'approvals')::integer, 0) + 1, v_requeridas);

  v_gasto := jsonb_set(v_gasto, '{approvedBy}', v_aprobadores, true);
  v_gasto := jsonb_set(v_gasto, '{approvals}', to_jsonb(v_aprobaciones), true);
  if v_aprobaciones >= v_requeridas then
    v_gasto := jsonb_set(v_gasto, '{status}', to_jsonb('approved'::text), true);
  end if;

  v_snapshot := jsonb_set(
    v_snapshot,
    array['expenses', (v_indice - 1)::text],
    v_gasto,
    false
  );

  select coalesce(jsonb_agg(evento.value order by evento.ordinality), '[]'::jsonb)
    into v_auditoria
  from jsonb_array_elements(
    jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'occurredAt', now(),
        'actor', v_actor,
        'action', 'presupuesto.gasto_aprobado',
        'resource', p_gasto_id,
        'detail', (v_gasto ->> 'concept') || ': ' || v_aprobaciones || ' de ' || v_requeridas || ' aprobaciones',
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
    'presupuesto.gasto_aprobado',
    'gasto',
    p_gasto_id,
    jsonb_build_object(
      'aprobaciones', v_aprobaciones,
      'requeridas', v_requeridas,
      'estado', v_gasto ->> 'status'
    )
  );

  return v_gasto;
end;
$$;

revoke all on function conjuntos.aprobar_gasto_demo(uuid, uuid) from public;

grant execute on function conjuntos.aprobar_gasto_demo(uuid, uuid)
to authenticated, service_role;
