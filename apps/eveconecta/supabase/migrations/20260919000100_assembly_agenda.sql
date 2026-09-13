-- Orden del día editable. Convierte los tres puntos fijos que generaba
-- lib/assemblies.ts (defaultAgendaItems) en una lista real que administración
-- crea, edita, reordena y bloquea. Es el prerrequisito de la votación real:
-- cada voto colgará de un punto concreto de esta tabla, no de un id sintético.
-- Detalle de las reglas en specs/eve-conecta/orden-del-dia-editable/spec.md.

create type conjuntos.tipo_decision_orden_dia as enum (
  'informativa',
  'economica',
  'no_economica',
  'calificada'
);

create type conjuntos.regla_votacion_orden_dia as enum (
  'ninguna',
  'unidad',
  'coeficiente',
  'coeficiente_calificado'
);

create type conjuntos.estado_punto_orden_dia as enum (
  'borrador',
  'listo',
  'votado'
);

grant usage on type conjuntos.tipo_decision_orden_dia to authenticated, service_role;
grant usage on type conjuntos.regla_votacion_orden_dia to authenticated, service_role;
grant usage on type conjuntos.estado_punto_orden_dia to authenticated, service_role;

create table conjuntos.asamblea_orden_dia (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null,
  asamblea_id uuid not null,
  posicion integer not null,
  titulo text not null,
  tipo_decision conjuntos.tipo_decision_orden_dia not null,
  regla_votacion conjuntos.regla_votacion_orden_dia not null default 'ninguna',
  umbral_porcentaje numeric(5, 2),
  estado conjuntos.estado_punto_orden_dia not null default 'borrador',
  creado_por_usuario_id uuid not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint asamblea_orden_dia_asamblea_fk
    foreign key (conjunto_id, asamblea_id)
    references conjuntos.asambleas(conjunto_id, id),
  constraint asamblea_orden_dia_titulo_valido
    check (length(trim(titulo)) between 5 and 200),
  constraint asamblea_orden_dia_umbral_rango
    check (umbral_porcentaje is null or (umbral_porcentaje > 0 and umbral_porcentaje <= 100)),
  -- Solo lo informativo carece de regla/umbral; cualquier otro tipo de
  -- decisión los exige ambos.
  constraint asamblea_orden_dia_regla_segun_tipo check (
    (tipo_decision = 'informativa' and regla_votacion = 'ninguna')
    or (tipo_decision <> 'informativa' and regla_votacion <> 'ninguna')
  ),
  constraint asamblea_orden_dia_umbral_segun_regla check (
    (regla_votacion = 'ninguna' and umbral_porcentaje is null)
    or (regla_votacion <> 'ninguna' and umbral_porcentaje is not null)
  ),
  -- Una mayoría calificada es, por definición, más exigente que la mayoría
  -- simple; no se fija la cifra exacta (cada reglamento la define), solo que
  -- supere el 50%.
  constraint asamblea_orden_dia_calificada_supera_mitad check (
    tipo_decision <> 'calificada' or umbral_porcentaje > 50
  )
);

comment on table conjuntos.asamblea_orden_dia is
  'Orden del día real de una asamblea: puntos, tipo de decisión, regla de votación y umbral. El estado "votado" lo fija el bloque de votación, no se establece manualmente.';

-- Diferible: reordenar reescribe la posición de varios puntos en una sola
-- transacción y momentáneamente podría repetir valores antes de terminar.
-- DEFERRABLE solo aplica a constraints, no a "create index" directo.
alter table conjuntos.asamblea_orden_dia
  add constraint asamblea_orden_dia_posicion_unica
  unique (asamblea_id, posicion)
  deferrable initially deferred;

create index asamblea_orden_dia_asamblea_idx
  on conjuntos.asamblea_orden_dia(asamblea_id, posicion);

create trigger asamblea_orden_dia_actualizar_timestamp
before update on conjuntos.asamblea_orden_dia
for each row execute function conjuntos.actualizar_timestamp();

alter table conjuntos.asamblea_orden_dia enable row level security;
alter table conjuntos.asamblea_orden_dia force row level security;

-- El orden del día no identifica personas: visible a los cuatro roles con
-- membresía activa, igual que la propia asamblea.
create policy asamblea_orden_dia_seleccionar
on conjuntos.asamblea_orden_dia for select to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto', 'consejo', 'residente']::conjuntos.rol_miembro[]
  )
);

grant select on conjuntos.asamblea_orden_dia to authenticated, service_role;
grant insert, update, delete on conjuntos.asamblea_orden_dia to service_role;

-- Único punto de verdad sobre si el orden del día admite cambios. Lo usan las
-- cuatro funciones mutadoras para no duplicar la regla.
create function conjuntos.orden_dia_bloqueado(
  p_conjunto_id uuid,
  p_asamblea_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_estado conjuntos.estado_asamblea;
  v_tipo conjuntos.tipo_asamblea;
  v_convocatoria_enviada boolean;
begin
  select asamblea.estado, asamblea.tipo
  into v_estado, v_tipo
  from conjuntos.asambleas as asamblea
  where asamblea.conjunto_id = p_conjunto_id and asamblea.id = p_asamblea_id;

  if v_estado is null then
    return 'not_found';
  end if;
  if v_estado = 'en_curso' then
    return 'in_progress';
  end if;
  if v_estado = 'cerrada' then
    return 'closed';
  end if;

  if v_tipo = 'extraordinaria' then
    select coalesce(jsonb_array_length(asamblea.item -> 'dossier' -> 'convocationRecipients'), 0) > 0
    into v_convocatoria_enviada
    from conjuntos.escenarios_demo as escenario,
      jsonb_array_elements(coalesce(escenario.snapshot -> 'assemblies', '[]'::jsonb)) as asamblea(item)
    where escenario.conjunto_id = p_conjunto_id
      and asamblea.item ->> 'id' = p_asamblea_id::text;

    if coalesce(v_convocatoria_enviada, false) then
      return 'extraordinary_convocation_sent';
    end if;
  end if;

  return null;
end;
$$;

revoke all on function conjuntos.orden_dia_bloqueado(uuid, uuid) from public;

grant execute on function conjuntos.orden_dia_bloqueado(uuid, uuid)
to authenticated, service_role;

create function conjuntos.agregar_punto_orden_dia_demo(
  p_conjunto_id uuid,
  p_asamblea_id uuid,
  p_titulo text,
  p_tipo_decision text,
  p_regla_votacion text,
  p_umbral_porcentaje numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
  v_bloqueo text;
  v_posicion integer;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite editar el orden del día';
  end if;

  v_bloqueo := conjuntos.orden_dia_bloqueado(p_conjunto_id, p_asamblea_id);
  if v_bloqueo = 'not_found' then
    raise exception 'La asamblea no existe en esta copropiedad' using errcode = 'P0002';
  end if;
  if v_bloqueo is not null then
    raise exception 'El orden del día está bloqueado' using errcode = '55000';
  end if;

  if p_tipo_decision not in ('informativa', 'economica', 'no_economica', 'calificada') then
    raise exception 'El tipo de decisión no es válido' using errcode = '22023';
  end if;
  if p_regla_votacion not in ('ninguna', 'unidad', 'coeficiente', 'coeficiente_calificado') then
    raise exception 'La regla de votación no es válida' using errcode = '22023';
  end if;

  select coalesce(max(punto.posicion), 0) + 1
  into v_posicion
  from conjuntos.asamblea_orden_dia as punto
  where punto.conjunto_id = p_conjunto_id and punto.asamblea_id = p_asamblea_id;

  begin
    insert into conjuntos.asamblea_orden_dia (
      id, conjunto_id, asamblea_id, posicion, titulo,
      tipo_decision, regla_votacion, umbral_porcentaje, creado_por_usuario_id
    ) values (
      v_id, p_conjunto_id, p_asamblea_id, v_posicion, trim(p_titulo),
      p_tipo_decision::conjuntos.tipo_decision_orden_dia,
      p_regla_votacion::conjuntos.regla_votacion_orden_dia,
      p_umbral_porcentaje, auth.uid()
    );
  exception
    when check_violation then
      raise exception 'Los datos del punto no son válidos' using errcode = '22023';
    when invalid_text_representation then
      raise exception 'Los datos del punto no son válidos' using errcode = '22023';
  end;

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    p_conjunto_id, auth.uid(), 'asambleas.punto_agregado', 'punto_orden_dia', v_id,
    jsonb_build_object('asamblea_id', p_asamblea_id, 'titulo', trim(p_titulo))
  );

  return jsonb_build_object(
    'id', v_id,
    'posicion', v_posicion,
    'title', trim(p_titulo),
    'decisionType', case p_tipo_decision
      when 'informativa' then 'informative'
      when 'economica' then 'economic'
      when 'no_economica' then 'non_economic'
      else 'qualified'
    end,
    'votingRule', case p_regla_votacion
      when 'ninguna' then 'none'
      when 'unidad' then 'unit'
      when 'coeficiente' then 'coefficient'
      else 'qualified_coefficient'
    end,
    'thresholdPercent', p_umbral_porcentaje,
    'status', 'draft'
  );
end;
$$;

revoke all on function conjuntos.agregar_punto_orden_dia_demo(
  uuid, uuid, text, text, text, numeric
) from public;

grant execute on function conjuntos.agregar_punto_orden_dia_demo(
  uuid, uuid, text, text, text, numeric
) to authenticated, service_role;

create function conjuntos.actualizar_punto_orden_dia_demo(
  p_conjunto_id uuid,
  p_asamblea_id uuid,
  p_punto_id uuid,
  p_titulo text,
  p_tipo_decision text,
  p_regla_votacion text,
  p_umbral_porcentaje numeric,
  p_estado text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bloqueo text;
  v_actualizado boolean;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite editar el orden del día';
  end if;

  v_bloqueo := conjuntos.orden_dia_bloqueado(p_conjunto_id, p_asamblea_id);
  if v_bloqueo = 'not_found' then
    raise exception 'La asamblea no existe en esta copropiedad' using errcode = 'P0002';
  end if;
  if v_bloqueo is not null then
    raise exception 'El orden del día está bloqueado' using errcode = '55000';
  end if;

  if p_tipo_decision not in ('informativa', 'economica', 'no_economica', 'calificada') then
    raise exception 'El tipo de decisión no es válido' using errcode = '22023';
  end if;
  if p_regla_votacion not in ('ninguna', 'unidad', 'coeficiente', 'coeficiente_calificado') then
    raise exception 'La regla de votación no es válida' using errcode = '22023';
  end if;
  if p_estado not in ('borrador', 'listo') then
    raise exception 'El estado de un punto solo se fija manualmente como borrador o listo'
      using errcode = '22023';
  end if;

  begin
    update conjuntos.asamblea_orden_dia
    set
      titulo = trim(p_titulo),
      tipo_decision = p_tipo_decision::conjuntos.tipo_decision_orden_dia,
      regla_votacion = p_regla_votacion::conjuntos.regla_votacion_orden_dia,
      umbral_porcentaje = p_umbral_porcentaje,
      estado = p_estado::conjuntos.estado_punto_orden_dia
    where conjunto_id = p_conjunto_id
      and asamblea_id = p_asamblea_id
      and id = p_punto_id
      and estado <> 'votado'
    returning true into v_actualizado;
  exception
    when check_violation then
      raise exception 'Los datos del punto no son válidos' using errcode = '22023';
    when invalid_text_representation then
      raise exception 'Los datos del punto no son válidos' using errcode = '22023';
  end;

  if v_actualizado is null then
    raise exception 'El punto no existe o ya fue votado' using errcode = 'P0002';
  end if;

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    p_conjunto_id, auth.uid(), 'asambleas.punto_actualizado', 'punto_orden_dia', p_punto_id,
    jsonb_build_object('asamblea_id', p_asamblea_id)
  );

  return jsonb_build_object('id', p_punto_id);
end;
$$;

revoke all on function conjuntos.actualizar_punto_orden_dia_demo(
  uuid, uuid, uuid, text, text, text, numeric, text
) from public;

grant execute on function conjuntos.actualizar_punto_orden_dia_demo(
  uuid, uuid, uuid, text, text, text, numeric, text
) to authenticated, service_role;

create function conjuntos.eliminar_punto_orden_dia_demo(
  p_conjunto_id uuid,
  p_asamblea_id uuid,
  p_punto_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bloqueo text;
  v_eliminado boolean;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite editar el orden del día';
  end if;

  v_bloqueo := conjuntos.orden_dia_bloqueado(p_conjunto_id, p_asamblea_id);
  if v_bloqueo = 'not_found' then
    raise exception 'La asamblea no existe en esta copropiedad' using errcode = 'P0002';
  end if;
  if v_bloqueo is not null then
    raise exception 'El orden del día está bloqueado' using errcode = '55000';
  end if;

  delete from conjuntos.asamblea_orden_dia
  where conjunto_id = p_conjunto_id
    and asamblea_id = p_asamblea_id
    and id = p_punto_id
    and estado <> 'votado'
  returning true into v_eliminado;

  if v_eliminado is null then
    raise exception 'El punto no existe o ya fue votado' using errcode = 'P0002';
  end if;

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    p_conjunto_id, auth.uid(), 'asambleas.punto_eliminado', 'punto_orden_dia', p_punto_id,
    jsonb_build_object('asamblea_id', p_asamblea_id)
  );

  return jsonb_build_object('id', p_punto_id);
end;
$$;

revoke all on function conjuntos.eliminar_punto_orden_dia_demo(uuid, uuid, uuid) from public;

grant execute on function conjuntos.eliminar_punto_orden_dia_demo(uuid, uuid, uuid)
to authenticated, service_role;

create function conjuntos.reordenar_orden_dia_demo(
  p_conjunto_id uuid,
  p_asamblea_id uuid,
  p_orden_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bloqueo text;
  v_total_actual integer;
  v_total_enviado integer;
  v_coincidencias integer;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite editar el orden del día';
  end if;

  v_bloqueo := conjuntos.orden_dia_bloqueado(p_conjunto_id, p_asamblea_id);
  if v_bloqueo = 'not_found' then
    raise exception 'La asamblea no existe en esta copropiedad' using errcode = 'P0002';
  end if;
  if v_bloqueo is not null then
    raise exception 'El orden del día está bloqueado' using errcode = '55000';
  end if;

  v_total_enviado := coalesce(array_length(p_orden_ids, 1), 0);
  if v_total_enviado <> (select count(distinct valor) from unnest(p_orden_ids) as valor) then
    raise exception 'El orden enviado contiene puntos repetidos' using errcode = '22023';
  end if;

  select count(*)
  into v_total_actual
  from conjuntos.asamblea_orden_dia
  where conjunto_id = p_conjunto_id and asamblea_id = p_asamblea_id;

  select count(*)
  into v_coincidencias
  from conjuntos.asamblea_orden_dia as punto
  where punto.conjunto_id = p_conjunto_id
    and punto.asamblea_id = p_asamblea_id
    and punto.id = any (p_orden_ids);

  if v_total_enviado <> v_total_actual or v_coincidencias <> v_total_actual then
    raise exception 'El orden enviado no coincide con los puntos vigentes de la asamblea'
      using errcode = '22023';
  end if;

  set constraints conjuntos.asamblea_orden_dia_posicion_unica deferred;

  update conjuntos.asamblea_orden_dia as punto
  set posicion = nuevo.posicion
  from (
    select valor as id, ordinality as posicion
    from unnest(p_orden_ids) with ordinality as t(valor, ordinality)
  ) as nuevo
  where punto.id = nuevo.id
    and punto.conjunto_id = p_conjunto_id
    and punto.asamblea_id = p_asamblea_id;

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    p_conjunto_id, auth.uid(), 'asambleas.orden_dia_reordenado', 'asamblea', p_asamblea_id,
    jsonb_build_object('orden', p_orden_ids)
  );

  return jsonb_build_object('asambleaId', p_asamblea_id, 'total', v_total_actual);
end;
$$;

revoke all on function conjuntos.reordenar_orden_dia_demo(uuid, uuid, uuid[]) from public;

grant execute on function conjuntos.reordenar_orden_dia_demo(uuid, uuid, uuid[])
to authenticated, service_role;

create function conjuntos.listar_orden_dia_demo(
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
  v_items jsonb;
  v_bloqueo text;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto', 'consejo', 'residente']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu usuario no pertenece a esta copropiedad';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', punto.id,
      'posicion', punto.posicion,
      'title', punto.titulo,
      'decisionType', case punto.tipo_decision
        when 'informativa' then 'informative'
        when 'economica' then 'economic'
        when 'no_economica' then 'non_economic'
        else 'qualified'
      end,
      'votingRule', case punto.regla_votacion
        when 'ninguna' then 'none'
        when 'unidad' then 'unit'
        when 'coeficiente' then 'coefficient'
        else 'qualified_coefficient'
      end,
      'thresholdPercent', punto.umbral_porcentaje,
      'status', case punto.estado
        when 'borrador' then 'draft'
        when 'listo' then 'ready'
        else 'voted'
      end
    )
    order by punto.posicion
  ), '[]'::jsonb)
  into v_items
  from conjuntos.asamblea_orden_dia as punto
  where punto.conjunto_id = p_conjunto_id and punto.asamblea_id = p_asamblea_id;

  v_bloqueo := conjuntos.orden_dia_bloqueado(p_conjunto_id, p_asamblea_id);

  return jsonb_build_object(
    'items', v_items,
    'locked', v_bloqueo is not null and v_bloqueo <> 'not_found',
    'lockedReason', case when v_bloqueo = 'not_found' then null else v_bloqueo end
  );
end;
$$;

revoke all on function conjuntos.listar_orden_dia_demo(uuid, uuid) from public;

grant execute on function conjuntos.listar_orden_dia_demo(uuid, uuid)
to authenticated, service_role;
