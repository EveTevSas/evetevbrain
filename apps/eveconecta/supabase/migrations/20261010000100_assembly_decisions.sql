-- Decisiones de asamblea. Convierte la etapa "Cumplimiento" del expediente,
-- hasta ahora tres compromisos fijos generados por código y visibles solo
-- cuando la asamblea aparece cerrada, en un seguimiento real: administración
-- asigna compromisos con responsable y fecha límite una vez que la asamblea
-- cerró y su acta quedó formalizada, el consejo supervisa el avance, y
-- administración deja constancia de la evidencia. Depende de
-- acta-y-cierre-asamblea (una decisión exige acta firmada o publicada) y
-- opcionalmente de orden-del-dia-editable (puede citar el punto de origen).
-- Detalle de las reglas en specs/eve-conecta/decisiones-de-asamblea/spec.md.

create type conjuntos.estado_decision_asamblea as enum (
  'pendiente',
  'en_progreso',
  'completada'
);

grant usage on type conjuntos.estado_decision_asamblea to authenticated, service_role;

create table conjuntos.asamblea_decisiones (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos.conjuntos(id),
  asamblea_id uuid not null,
  punto_orden_dia_id uuid,
  titulo text not null,
  responsable_persona_id uuid not null,
  fecha_limite date not null,
  estado conjuntos.estado_decision_asamblea not null default 'pendiente',
  evidencia_nota text,
  completada_en timestamptz,
  creado_por_usuario_id uuid not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint asamblea_decisiones_asamblea_fk
    foreign key (conjunto_id, asamblea_id)
    references conjuntos.asambleas(conjunto_id, id),
  constraint asamblea_decisiones_punto_fk
    foreign key (conjunto_id, punto_orden_dia_id)
    references conjuntos.asamblea_orden_dia(conjunto_id, id),
  constraint asamblea_decisiones_responsable_fk
    foreign key (conjunto_id, responsable_persona_id)
    references conjuntos.personas(conjunto_id, id),
  constraint asamblea_decisiones_titulo_valido
    check (length(trim(titulo)) between 5 and 200),
  -- completada_en es una transición hacia adelante: solo existe desde que
  -- la decisión entra a "completada" (mismo patrón que
  -- asamblea_actas_firma_segun_estado).
  constraint asamblea_decisiones_completada_segun_estado check (
    (estado <> 'completada' and completada_en is null)
    or (estado = 'completada' and completada_en is not null)
  )
);

comment on table conjuntos.asamblea_decisiones is
  'Compromiso de seguimiento derivado de una asamblea cerrada con acta formalizada. Completada es un estado terminal: ni sus datos ni su estado vuelven a cambiar, solo su evidencia.';

create trigger asamblea_decisiones_actualizar_timestamp
before update on conjuntos.asamblea_decisiones
for each row execute function conjuntos.actualizar_timestamp();

alter table conjuntos.asamblea_decisiones enable row level security;
alter table conjuntos.asamblea_decisiones force row level security;

-- Misma sensibilidad que el resto del contenido reconstruible del acta:
-- antes de publicarse, solo administración; publicada, visible a los cuatro
-- roles (transparencia de cumplimiento ante la copropiedad).
create policy asamblea_decisiones_seleccionar
on conjuntos.asamblea_decisiones for select to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
  or exists (
    select 1 from conjuntos.asamblea_actas as acta
    where acta.conjunto_id = asamblea_decisiones.conjunto_id
      and acta.asamblea_id = asamblea_decisiones.asamblea_id
      and acta.estado = 'publicada'
  )
);

grant select on conjuntos.asamblea_decisiones to authenticated, service_role;
grant insert, update, delete on conjuntos.asamblea_decisiones to service_role;

create function conjuntos.crear_decision_asamblea_demo(
  p_conjunto_id uuid,
  p_asamblea_id uuid,
  p_punto_orden_dia_id uuid,
  p_titulo text,
  p_responsable_persona_id uuid,
  p_fecha_limite date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado_asamblea conjuntos.estado_asamblea;
  v_estado_acta conjuntos.estado_acta_asamblea;
  v_id uuid;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite crear decisiones';
  end if;

  select estado into v_estado_asamblea
  from conjuntos.asambleas
  where conjunto_id = p_conjunto_id and id = p_asamblea_id;

  if v_estado_asamblea is null then
    raise exception 'La asamblea no existe en esta copropiedad' using errcode = 'P0002';
  end if;
  if v_estado_asamblea <> 'cerrada' then
    raise exception 'Las decisiones se crean después de cerrar la asamblea'
      using errcode = '55000';
  end if;

  select estado into v_estado_acta
  from conjuntos.asamblea_actas
  where conjunto_id = p_conjunto_id and asamblea_id = p_asamblea_id;

  if v_estado_acta is null or v_estado_acta = 'borrador' then
    raise exception 'El acta debe estar firmada antes de asignar decisiones'
      using errcode = '55000';
  end if;

  if length(trim(coalesce(p_titulo, ''))) < 5 then
    raise exception 'El título debe tener al menos 5 caracteres' using errcode = '22023';
  end if;
  if length(trim(p_titulo)) > 200 then
    raise exception 'El título no puede superar los 200 caracteres' using errcode = '22023';
  end if;

  -- El responsable debe haber sido un asistente acreditado de esta misma
  -- asamblea (igual que la presidencia/secretaría del acta): así "el
  -- administrador" o "un miembro del consejo" designado como responsable es
  -- siempre alguien que efectivamente participó, no un nombre inventado.
  if not exists (
    select 1 from conjuntos.asamblea_acreditaciones
    where conjunto_id = p_conjunto_id
      and asamblea_id = p_asamblea_id
      and persona_id = p_responsable_persona_id
      and revocado_en is null
  ) then
    raise exception 'El responsable debe tener una acreditación activa en esta asamblea'
      using errcode = '22023';
  end if;

  if p_punto_orden_dia_id is not null and not exists (
    select 1 from conjuntos.asamblea_orden_dia
    where conjunto_id = p_conjunto_id
      and asamblea_id = p_asamblea_id
      and id = p_punto_orden_dia_id
  ) then
    raise exception 'El punto del orden del día no pertenece a esta asamblea'
      using errcode = '22023';
  end if;

  insert into conjuntos.asamblea_decisiones (
    conjunto_id, asamblea_id, punto_orden_dia_id, titulo, responsable_persona_id,
    fecha_limite, creado_por_usuario_id
  ) values (
    p_conjunto_id, p_asamblea_id, p_punto_orden_dia_id, trim(p_titulo),
    p_responsable_persona_id, p_fecha_limite, auth.uid()
  )
  returning id into v_id;

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    p_conjunto_id, auth.uid(), 'asambleas.decision_creada', 'decision', v_id,
    jsonb_build_object('asamblea_id', p_asamblea_id)
  );

  return jsonb_build_object('id', v_id, 'status', 'pending');
end;
$$;

revoke all on function conjuntos.crear_decision_asamblea_demo(uuid, uuid, uuid, text, uuid, date)
from public;

grant execute on function conjuntos.crear_decision_asamblea_demo(uuid, uuid, uuid, text, uuid, date)
to authenticated, service_role;

create function conjuntos.actualizar_decision_asamblea_demo(
  p_conjunto_id uuid,
  p_asamblea_id uuid,
  p_decision_id uuid,
  p_titulo text,
  p_responsable_persona_id uuid,
  p_fecha_limite date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado conjuntos.estado_decision_asamblea;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite editar decisiones';
  end if;

  -- "for update" bloquea la fila hasta el commit: sin este lock,
  -- actualizar_estado_decision_demo podría completar la decisión justo entre
  -- este chequeo y el UPDATE de más abajo, dejando pasar una edición sobre
  -- una decisión ya cerrada (mismo patrón que guardar_acta_asamblea_demo).
  select estado into v_estado
  from conjuntos.asamblea_decisiones
  where conjunto_id = p_conjunto_id and asamblea_id = p_asamblea_id and id = p_decision_id
  for update;

  if v_estado is null then
    raise exception 'La decisión no existe en esta asamblea' using errcode = 'P0002';
  end if;
  if v_estado = 'completada' then
    raise exception 'Una decisión completada no puede editarse' using errcode = '55000';
  end if;

  if length(trim(coalesce(p_titulo, ''))) < 5 then
    raise exception 'El título debe tener al menos 5 caracteres' using errcode = '22023';
  end if;
  if length(trim(p_titulo)) > 200 then
    raise exception 'El título no puede superar los 200 caracteres' using errcode = '22023';
  end if;

  if not exists (
    select 1 from conjuntos.asamblea_acreditaciones
    where conjunto_id = p_conjunto_id
      and asamblea_id = p_asamblea_id
      and persona_id = p_responsable_persona_id
      and revocado_en is null
  ) then
    raise exception 'El responsable debe tener una acreditación activa en esta asamblea'
      using errcode = '22023';
  end if;

  update conjuntos.asamblea_decisiones
  set titulo = trim(p_titulo),
    responsable_persona_id = p_responsable_persona_id,
    fecha_limite = p_fecha_limite
  where conjunto_id = p_conjunto_id and id = p_decision_id and estado <> 'completada';

  if not found then
    raise exception 'Una decisión completada no puede editarse' using errcode = '55000';
  end if;

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    p_conjunto_id, auth.uid(), 'asambleas.decision_actualizada', 'decision', p_decision_id,
    jsonb_build_object('asamblea_id', p_asamblea_id)
  );

  return jsonb_build_object('id', p_decision_id);
end;
$$;

revoke all on function conjuntos.actualizar_decision_asamblea_demo(uuid, uuid, uuid, text, uuid, date)
from public;

grant execute on function conjuntos.actualizar_decision_asamblea_demo(uuid, uuid, uuid, text, uuid, date)
to authenticated, service_role;

create function conjuntos.actualizar_estado_decision_demo(
  p_conjunto_id uuid,
  p_asamblea_id uuid,
  p_decision_id uuid,
  p_nuevo_estado text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado conjuntos.estado_decision_asamblea;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto', 'consejo']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite actualizar decisiones';
  end if;

  if p_nuevo_estado not in ('pendiente', 'en_progreso', 'completada') then
    raise exception 'El estado indicado no es válido' using errcode = '22023';
  end if;

  select estado into v_estado
  from conjuntos.asamblea_decisiones
  where conjunto_id = p_conjunto_id and asamblea_id = p_asamblea_id and id = p_decision_id
  for update;

  if v_estado is null then
    raise exception 'La decisión no existe en esta asamblea' using errcode = 'P0002';
  end if;
  if v_estado = 'completada' then
    raise exception 'Una decisión completada no puede cambiar de estado'
      using errcode = '55000';
  end if;

  update conjuntos.asamblea_decisiones
  set estado = p_nuevo_estado::conjuntos.estado_decision_asamblea,
    completada_en = case when p_nuevo_estado = 'completada' then now() else completada_en end
  where conjunto_id = p_conjunto_id and id = p_decision_id and estado <> 'completada';

  if not found then
    raise exception 'Una decisión completada no puede cambiar de estado'
      using errcode = '55000';
  end if;

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    p_conjunto_id, auth.uid(), 'asambleas.decision_estado_actualizado', 'decision',
    p_decision_id, jsonb_build_object('asamblea_id', p_asamblea_id, 'estado', p_nuevo_estado)
  );

  return jsonb_build_object('id', p_decision_id, 'status', case p_nuevo_estado
    when 'pendiente' then 'pending'
    when 'en_progreso' then 'in_progress'
    else 'completed'
  end);
end;
$$;

revoke all on function conjuntos.actualizar_estado_decision_demo(uuid, uuid, uuid, text)
from public;

grant execute on function conjuntos.actualizar_estado_decision_demo(uuid, uuid, uuid, text)
to authenticated, service_role;

create function conjuntos.adjuntar_evidencia_decision_demo(
  p_conjunto_id uuid,
  p_asamblea_id uuid,
  p_decision_id uuid,
  p_evidencia_nota text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite registrar evidencia';
  end if;

  if length(trim(coalesce(p_evidencia_nota, ''))) < 1 then
    raise exception 'La evidencia no puede estar vacía' using errcode = '22023';
  end if;

  update conjuntos.asamblea_decisiones
  set evidencia_nota = trim(p_evidencia_nota)
  where conjunto_id = p_conjunto_id and asamblea_id = p_asamblea_id and id = p_decision_id
  returning id into v_id;

  if v_id is null then
    raise exception 'La decisión no existe en esta asamblea' using errcode = 'P0002';
  end if;

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    p_conjunto_id, auth.uid(), 'asambleas.decision_evidencia_registrada', 'decision',
    v_id, jsonb_build_object('asamblea_id', p_asamblea_id)
  );

  return jsonb_build_object('id', v_id);
end;
$$;

revoke all on function conjuntos.adjuntar_evidencia_decision_demo(uuid, uuid, uuid, text)
from public;

grant execute on function conjuntos.adjuntar_evidencia_decision_demo(uuid, uuid, uuid, text)
to authenticated, service_role;

create function conjuntos.eliminar_decision_demo(
  p_conjunto_id uuid,
  p_asamblea_id uuid,
  p_decision_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite eliminar decisiones';
  end if;

  delete from conjuntos.asamblea_decisiones
  where conjunto_id = p_conjunto_id
    and asamblea_id = p_asamblea_id
    and id = p_decision_id
    and estado <> 'completada'
  returning id into v_id;

  if v_id is null then
    if exists (
      select 1 from conjuntos.asamblea_decisiones
      where conjunto_id = p_conjunto_id and asamblea_id = p_asamblea_id and id = p_decision_id
    ) then
      raise exception 'Una decisión completada no puede eliminarse' using errcode = '55000';
    end if;
    raise exception 'La decisión no existe en esta asamblea' using errcode = 'P0002';
  end if;

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    p_conjunto_id, auth.uid(), 'asambleas.decision_eliminada', 'decision', v_id,
    jsonb_build_object('asamblea_id', p_asamblea_id)
  );

  return jsonb_build_object('id', v_id);
end;
$$;

revoke all on function conjuntos.eliminar_decision_demo(uuid, uuid, uuid) from public;

grant execute on function conjuntos.eliminar_decision_demo(uuid, uuid, uuid)
to authenticated, service_role;

create function conjuntos.listar_decisiones_asamblea_demo(
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
  v_es_admin boolean;
  v_publicada boolean;
  v_decisiones jsonb;
  v_asistentes jsonb;
begin
  v_es_admin := conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  );

  if not v_es_admin and not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['consejo', 'residente']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu usuario no pertenece a esta copropiedad';
  end if;

  if not v_es_admin then
    select coalesce(acta.estado = 'publicada', false)
    into v_publicada
    from conjuntos.asamblea_actas as acta
    where acta.conjunto_id = p_conjunto_id and acta.asamblea_id = p_asamblea_id;

    if not coalesce(v_publicada, false) then
      return jsonb_build_object('decisions', '[]'::jsonb, 'attendees', '[]'::jsonb);
    end if;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', decision.id,
      'agendaItemId', decision.punto_orden_dia_id,
      'agendaItemTitle', punto.titulo,
      'title', decision.titulo,
      'ownerPersonId', decision.responsable_persona_id,
      'ownerName', responsable.nombre,
      'dueDate', decision.fecha_limite,
      'status', case decision.estado
        when 'pendiente' then 'pending'
        when 'en_progreso' then 'in_progress'
        else 'completed'
      end,
      'evidenceNote', decision.evidencia_nota,
      'completedAt', decision.completada_en,
      'createdAt', decision.creado_en
    )
    order by decision.creado_en
  ), '[]'::jsonb)
  into v_decisiones
  from conjuntos.asamblea_decisiones as decision
  left join conjuntos.asamblea_orden_dia as punto
    on punto.conjunto_id = decision.conjunto_id and punto.id = decision.punto_orden_dia_id
  left join conjuntos.personas as responsable
    on responsable.conjunto_id = decision.conjunto_id
    and responsable.id = decision.responsable_persona_id
  where decision.conjunto_id = p_conjunto_id and decision.asamblea_id = p_asamblea_id;

  -- El listado de asistentes solo lo necesita administración (única que crea
  -- decisiones) para elegir el responsable; mismo criterio de sensibilidad
  -- que listar_asistentes_asamblea_demo.
  v_asistentes := '[]'::jsonb;
  if v_es_admin then
    select coalesce(jsonb_agg(fila.item order by fila.acreditado_en desc), '[]'::jsonb)
    into v_asistentes
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
        on unidad.conjunto_id = acreditacion.conjunto_id and unidad.id = acreditacion.unidad_id
      left join conjuntos.personas as persona
        on persona.conjunto_id = acreditacion.conjunto_id and persona.id = acreditacion.persona_id
      left join conjuntos.personas as representado
        on representado.conjunto_id = acreditacion.conjunto_id
        and representado.id = acreditacion.representa_persona_id
      where acreditacion.conjunto_id = p_conjunto_id
        and acreditacion.asamblea_id = p_asamblea_id
        and acreditacion.revocado_en is null
    ) as fila;
  end if;

  return jsonb_build_object('decisions', v_decisiones, 'attendees', v_asistentes);
end;
$$;

revoke all on function conjuntos.listar_decisiones_asamblea_demo(uuid, uuid) from public;

grant execute on function conjuntos.listar_decisiones_asamblea_demo(uuid, uuid)
to authenticated, service_role;
