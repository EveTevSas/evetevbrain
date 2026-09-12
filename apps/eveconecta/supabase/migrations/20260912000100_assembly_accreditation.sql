-- Poderes y acreditación de asistentes en asambleas. Convierte la etapa
-- "Asistencia y poderes" del expediente, hasta ahora decorativa, en un registro
-- real: quién asiste, en qué calidad y con qué coeficiente representa. El
-- quórum y la representación económica dejan de calcularse con una fórmula
-- fija y se derivan de estas acreditaciones (ver obtener_escenario_demo más
-- abajo). Detalle de las reglas en
-- specs/eve-conecta/poderes-y-acreditacion-asamblea/spec.md.

create type conjuntos.calidad_asistente_asamblea as enum (
  'propietario',
  'apoderado',
  'residente_con_voz',
  'invitado'
);

grant usage on type conjuntos.calidad_asistente_asamblea to authenticated, service_role;

create table conjuntos.asamblea_acreditaciones (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos.conjuntos(id),
  asamblea_id uuid not null,
  unidad_id uuid,
  persona_id uuid not null,
  calidad conjuntos.calidad_asistente_asamblea not null,
  representa_persona_id uuid,
  coeficiente_aplicado numeric(9, 6) not null default 0
    constraint asamblea_acreditaciones_coeficiente_valido check (coeficiente_aplicado >= 0),
  canal text not null default 'presencial'
    constraint asamblea_acreditaciones_canal_valido check (canal in ('presencial', 'virtual')),
  soporte_path text,
  acreditado_por_usuario_id uuid not null,
  acreditado_en timestamptz not null default now(),
  revocado_en timestamptz,
  revocado_por_usuario_id uuid,
  constraint asamblea_acreditaciones_asamblea_fk
    foreign key (conjunto_id, asamblea_id)
    references conjuntos.asambleas(conjunto_id, id),
  constraint asamblea_acreditaciones_unidad_fk
    foreign key (conjunto_id, unidad_id)
    references conjuntos.unidades(conjunto_id, id),
  constraint asamblea_acreditaciones_persona_fk
    foreign key (conjunto_id, persona_id)
    references conjuntos.personas(conjunto_id, id),
  constraint asamblea_acreditaciones_representa_fk
    foreign key (conjunto_id, representa_persona_id)
    references conjuntos.personas(conjunto_id, id),
  -- Solo el invitado no ocupa unidad; las otras tres calidades sí.
  constraint asamblea_acreditaciones_unidad_segun_calidad check (
    (calidad = 'invitado' and unidad_id is null)
    or (calidad <> 'invitado' and unidad_id is not null)
  ),
  -- Solo apoderado exige representa_persona_id, y nunca puede auto-representarse.
  constraint asamblea_acreditaciones_representa_segun_calidad check (
    (calidad = 'apoderado' and representa_persona_id is not null
      and representa_persona_id <> persona_id)
    or (calidad <> 'apoderado' and representa_persona_id is null)
  ),
  constraint asamblea_acreditaciones_revocacion_consistente check (
    (revocado_en is null and revocado_por_usuario_id is null)
    or (revocado_en is not null and revocado_por_usuario_id is not null)
  )
);

comment on table conjuntos.asamblea_acreditaciones is
  'Registro de asistencia y poderes por asamblea. Una unidad tiene como máximo una acreditación activa (ver índice único); corregirla es revocar y volver a acreditar, nunca editar ni borrar.';

-- El mecanismo real que impide la doble representación: solo puede existir una
-- fila activa por unidad y asamblea. Postgres trata cada NULL como distinto,
-- así que las filas de invitado (unidad_id null) nunca colisionan entre sí.
create unique index asamblea_acreditaciones_unidad_activa_unica
  on conjuntos.asamblea_acreditaciones(asamblea_id, unidad_id)
  where revocado_en is null;

create index asamblea_acreditaciones_asamblea_idx
  on conjuntos.asamblea_acreditaciones(asamblea_id)
  where revocado_en is null;

alter table conjuntos.asamblea_acreditaciones enable row level security;
alter table conjuntos.asamblea_acreditaciones force row level security;

-- Identifica personas reales de la copropiedad: mismo nivel de sensibilidad
-- que el censo, restringido a administración (nunca consejo ni residente).
create policy asamblea_acreditaciones_seleccionar
on conjuntos.asamblea_acreditaciones for select to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

grant select on conjuntos.asamblea_acreditaciones to authenticated, service_role;
grant insert, update on conjuntos.asamblea_acreditaciones to service_role;

create function conjuntos.acreditar_asistente_asamblea_demo(
  p_conjunto_id uuid,
  p_asamblea_id uuid,
  p_calidad text,
  p_persona_id uuid,
  p_unidad_codigo text default null,
  p_representa_persona_id uuid default null,
  p_canal text default 'presencial',
  p_soporte_path text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
  v_estado conjuntos.estado_asamblea;
  v_unidad_id uuid;
  v_coeficiente numeric(9, 6) := 0;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite acreditar asistentes';
  end if;

  if p_calidad not in ('propietario', 'apoderado', 'residente_con_voz', 'invitado') then
    raise exception 'La calidad del asistente no es válida' using errcode = '22023';
  end if;
  if p_canal not in ('presencial', 'virtual') then
    raise exception 'El canal de asistencia no es válido' using errcode = '22023';
  end if;

  select asamblea.estado
  into v_estado
  from conjuntos.asambleas as asamblea
  where asamblea.conjunto_id = p_conjunto_id
    and asamblea.id = p_asamblea_id;

  if v_estado is null then
    raise exception 'La asamblea no existe en esta copropiedad' using errcode = 'P0002';
  end if;
  if v_estado = 'cerrada' then
    raise exception 'La asamblea ya está cerrada' using errcode = '22023';
  end if;

  if p_calidad = 'invitado' then
    if p_unidad_codigo is not null or p_representa_persona_id is not null then
      raise exception 'El invitado no referencia unidad ni representación' using errcode = '22023';
    end if;
    if not exists (
      select 1 from conjuntos.personas
      where conjunto_id = p_conjunto_id and id = p_persona_id and anonimizada_en is null
    ) then
      raise exception 'La persona indicada no existe en esta copropiedad' using errcode = '22023';
    end if;
  else
    if p_unidad_codigo is null then
      raise exception 'Esta calidad exige indicar la unidad' using errcode = '22023';
    end if;

    select unidad.id, unidad.coeficiente
    into v_unidad_id, v_coeficiente
    from conjuntos.unidades as unidad
    where unidad.conjunto_id = p_conjunto_id and unidad.codigo = trim(p_unidad_codigo);

    if v_unidad_id is null then
      raise exception 'La unidad indicada no existe en esta copropiedad' using errcode = '22023';
    end if;

    if p_calidad = 'apoderado' then
      if p_representa_persona_id is null or p_representa_persona_id = p_persona_id then
        raise exception 'El apoderado exige un representado distinto de quien asiste'
          using errcode = '22023';
      end if;
      if not exists (
        select 1
        from conjuntos.personas_unidades as vinculo
        inner join conjuntos.personas as persona
          on persona.conjunto_id = vinculo.conjunto_id
          and persona.id = vinculo.persona_id
        where vinculo.conjunto_id = p_conjunto_id
          and vinculo.persona_id = p_representa_persona_id
          and vinculo.unidad_id = v_unidad_id
          and vinculo.relacion = 'propietario'
          and vinculo.vigente_desde <= current_date
          and (vinculo.vigente_hasta is null or vinculo.vigente_hasta >= current_date)
          and persona.anonimizada_en is null
      ) then
        raise exception 'El representado no es propietario vigente de esa unidad'
          using errcode = '22023';
      end if;
      if not exists (
        select 1 from conjuntos.personas
        where conjunto_id = p_conjunto_id and id = p_persona_id and anonimizada_en is null
      ) then
        raise exception 'La persona que asiste no existe en esta copropiedad'
          using errcode = '22023';
      end if;
    else
      if p_representa_persona_id is not null then
        raise exception 'Esta calidad no admite representación' using errcode = '22023';
      end if;
      -- "propietario" exige que el vínculo vigente sea justamente de propiedad;
      -- "residente_con_voz" acepta cualquier vínculo vigente (propietario o
      -- residente), pero nunca aporta coeficiente (ver obtener_escenario_demo).
      if not exists (
        select 1
        from conjuntos.personas_unidades as vinculo
        inner join conjuntos.personas as persona
          on persona.conjunto_id = vinculo.conjunto_id
          and persona.id = vinculo.persona_id
        where vinculo.conjunto_id = p_conjunto_id
          and vinculo.persona_id = p_persona_id
          and vinculo.unidad_id = v_unidad_id
          and (p_calidad <> 'propietario' or vinculo.relacion = 'propietario')
          and vinculo.vigente_desde <= current_date
          and (vinculo.vigente_hasta is null or vinculo.vigente_hasta >= current_date)
          and persona.anonimizada_en is null
      ) then
        if p_calidad = 'propietario' then
          raise exception 'Quien asiste no es propietario vigente de esa unidad'
            using errcode = '22023';
        else
          raise exception 'Quien asiste no tiene un vínculo vigente con esa unidad'
            using errcode = '22023';
        end if;
      end if;
    end if;
  end if;

  begin
    insert into conjuntos.asamblea_acreditaciones (
      id,
      conjunto_id,
      asamblea_id,
      unidad_id,
      persona_id,
      calidad,
      representa_persona_id,
      coeficiente_aplicado,
      canal,
      soporte_path,
      acreditado_por_usuario_id
    ) values (
      v_id,
      p_conjunto_id,
      p_asamblea_id,
      v_unidad_id,
      p_persona_id,
      p_calidad::conjuntos.calidad_asistente_asamblea,
      p_representa_persona_id,
      v_coeficiente,
      p_canal,
      p_soporte_path,
      auth.uid()
    );
  exception
    when unique_violation then
      raise exception 'Esa unidad ya tiene una acreditación activa en esta asamblea'
        using errcode = '23505';
  end;

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
    'asambleas.asistente_acreditado',
    'acreditacion_asamblea',
    v_id,
    jsonb_build_object(
      'asamblea_id', p_asamblea_id,
      'calidad', p_calidad,
      'unidad_id', v_unidad_id
    )
  );

  return jsonb_build_object(
    'id', v_id,
    'asambleaId', p_asamblea_id,
    'unidadId', v_unidad_id,
    'unidadCodigo', p_unidad_codigo,
    'personaId', p_persona_id,
    'personaNombre', (select nombre from conjuntos.personas where id = p_persona_id),
    'calidad', p_calidad,
    'representaPersonaId', p_representa_persona_id,
    'representaNombre',
    (select nombre from conjuntos.personas where id = p_representa_persona_id),
    'coeficienteAplicado', v_coeficiente,
    'canal', p_canal,
    'soportePath', p_soporte_path,
    'acreditadoEn', now()
  );
end;
$$;

revoke all on function conjuntos.acreditar_asistente_asamblea_demo(
  uuid, uuid, text, uuid, text, uuid, text, text
) from public;

grant execute on function conjuntos.acreditar_asistente_asamblea_demo(
  uuid, uuid, text, uuid, text, uuid, text, text
) to authenticated, service_role;

create function conjuntos.revocar_acreditacion_asamblea_demo(
  p_conjunto_id uuid,
  p_asamblea_id uuid,
  p_acreditacion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_revocada boolean;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite revocar acreditaciones';
  end if;

  update conjuntos.asamblea_acreditaciones
  set revocado_en = now(), revocado_por_usuario_id = auth.uid()
  where conjunto_id = p_conjunto_id
    and asamblea_id = p_asamblea_id
    and id = p_acreditacion_id
    and revocado_en is null
  returning true into v_revocada;

  if v_revocada is null then
    raise exception 'La acreditación no existe o ya estaba revocada' using errcode = 'P0002';
  end if;

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
    'asambleas.acreditacion_revocada',
    'acreditacion_asamblea',
    p_acreditacion_id,
    jsonb_build_object('asamblea_id', p_asamblea_id)
  );

  return jsonb_build_object('id', p_acreditacion_id, 'asambleaId', p_asamblea_id);
end;
$$;

revoke all on function conjuntos.revocar_acreditacion_asamblea_demo(uuid, uuid, uuid) from public;

grant execute on function conjuntos.revocar_acreditacion_asamblea_demo(uuid, uuid, uuid)
to authenticated, service_role;

create function conjuntos.listar_asistentes_asamblea_demo(
  p_conjunto_id uuid,
  p_asamblea_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_resultado jsonb;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite consultar los asistentes';
  end if;

  select coalesce(jsonb_agg(fila.item order by fila.acreditado_en desc), '[]'::jsonb)
  into v_resultado
  from (
    select
      jsonb_build_object(
        'id', acreditacion.id,
        'unidadId', acreditacion.unidad_id,
        'unidadCodigo', unidad.codigo,
        'personaId', acreditacion.persona_id,
        'personaNombre', persona.nombre,
        'calidad', acreditacion.calidad,
        'representaPersonaId', acreditacion.representa_persona_id,
        'representaNombre', representado.nombre,
        'coeficienteAplicado', acreditacion.coeficiente_aplicado,
        'canal', acreditacion.canal,
        'soportePath', acreditacion.soporte_path,
        'acreditadoEn', acreditacion.acreditado_en
      ) as item,
      acreditacion.acreditado_en
    from conjuntos.asamblea_acreditaciones as acreditacion
    left join conjuntos.unidades as unidad
      on unidad.conjunto_id = acreditacion.conjunto_id
      and unidad.id = acreditacion.unidad_id
    left join conjuntos.personas as persona
      on persona.conjunto_id = acreditacion.conjunto_id
      and persona.id = acreditacion.persona_id
    left join conjuntos.personas as representado
      on representado.conjunto_id = acreditacion.conjunto_id
      and representado.id = acreditacion.representa_persona_id
    where acreditacion.conjunto_id = p_conjunto_id
      and acreditacion.asamblea_id = p_asamblea_id
      and acreditacion.revocado_en is null
  ) as fila;

  return v_resultado;
end;
$$;

revoke all on function conjuntos.listar_asistentes_asamblea_demo(uuid, uuid) from public;

grant execute on function conjuntos.listar_asistentes_asamblea_demo(uuid, uuid)
to authenticated, service_role;

-- El quórum y la representación económica dejan de ser una fórmula fija sobre
-- assembly.status y pasan a sumarse desde las acreditaciones reales. Solo se
-- recalcula para quienes ya reciben el escenario completo (administración);
-- las proyecciones de consejo/residente conservan su propio recorte, sin
-- exponer acreditaciones identificadas.
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
  v_assemblies jsonb;
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
    -- Solo se enriquece el dossier si YA existía uno persistido: cuando la
    -- asamblea nunca tuvo dossier (datos de demo antiguos, o cualquier fila
    -- creada antes de este bloque), inyectar la clave igual la habría dejado
    -- con solo tres campos y sin delivery/checklist/agendaItems/etc., rompiendo
    -- el fallback del cliente `assembly.dossier ?? createAssemblyDossier(...)`
    -- (normalizeAssembly en lib/assemblies.ts), que depende de que la clave
    -- esté completamente ausente para sintetizar el dossier completo.
    select coalesce(
      jsonb_agg(
        asamblea.item
        || jsonb_build_object(
          'quorumPercent',
          round(coalesce(resumen.coeficiente_voto, 0))::int,
          'representedUnits',
          coalesce(resumen.unidades_representadas, 0)
        )
        || case
          when asamblea.item ? 'dossier' then
            jsonb_build_object(
              'dossier',
              (asamblea.item -> 'dossier')
              || jsonb_build_object(
                'representedCoefficientPercent', coalesce(resumen.coeficiente_voto, 0),
                'validatedProxies', coalesce(resumen.apoderados, 0),
                'residentsWithoutVote', coalesce(resumen.con_voz_sin_voto, 0)
              )
            )
          else '{}'::jsonb
        end
        order by asamblea.ordinality
      ),
      '[]'::jsonb
    )
    into v_assemblies
    from jsonb_array_elements(coalesce(v_snapshot -> 'assemblies', '[]'::jsonb))
      with ordinality as asamblea(item, ordinality)
    left join lateral (
      select
        count(*) filter (where acreditacion.unidad_id is not null) as unidades_representadas,
        sum(acreditacion.coeficiente_aplicado)
          filter (where acreditacion.calidad in ('propietario', 'apoderado')) as coeficiente_voto,
        count(*) filter (where acreditacion.calidad = 'apoderado') as apoderados,
        count(*) filter (where acreditacion.calidad = 'residente_con_voz') as con_voz_sin_voto
      from conjuntos.asamblea_acreditaciones as acreditacion
      where acreditacion.conjunto_id = p_conjunto_id
        and acreditacion.asamblea_id = (asamblea.item ->> 'id')::uuid
        and acreditacion.revocado_en is null
    ) as resumen on true;

    v_snapshot := jsonb_set(v_snapshot, '{assemblies}', v_assemblies);
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
  -- nunca al censo identificado, la cartera individual, eventos de portería ni
  -- las acreditaciones de asamblea (misma sensibilidad que el censo).
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

-- Bucket privado para la evidencia opcional del poder. Acceso exclusivo de
-- administración: identifica personas reales, misma sensibilidad que el censo.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'eveconecta-assembly-proxies',
  'eveconecta-assembly-proxies',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy poderes_asamblea_consultar
on storage.objects for select to authenticated
using (
  bucket_id = 'eveconecta-assembly-proxies'
  and exists (
    select 1
    from conjuntos.miembros_conjunto as miembro
    where miembro.conjunto_id::text = (storage.foldername(name))[1]
      and miembro.usuario_id = auth.uid()
      and miembro.activo
      and miembro.rol = any (
        array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
      )
  )
);

create policy poderes_asamblea_insertar
on storage.objects for insert to authenticated
with check (
  bucket_id = 'eveconecta-assembly-proxies'
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|jpg|png)$'
  and exists (
    select 1
    from conjuntos.miembros_conjunto as miembro
    where miembro.conjunto_id::text = (storage.foldername(name))[1]
      and miembro.usuario_id = auth.uid()
      and miembro.activo
      and miembro.rol = any (
        array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
      )
  )
);

create policy poderes_asamblea_eliminar
on storage.objects for delete to authenticated
using (
  bucket_id = 'eveconecta-assembly-proxies'
  and exists (
    select 1
    from conjuntos.miembros_conjunto as miembro
    where miembro.conjunto_id::text = (storage.foldername(name))[1]
      and miembro.usuario_id = auth.uid()
      and miembro.activo
      and miembro.rol = any (
        array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
      )
  )
);
