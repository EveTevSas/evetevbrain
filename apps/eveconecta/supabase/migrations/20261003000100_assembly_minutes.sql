-- Acta y cierre de asamblea. Convierte la etapa "Acta y cierre" del expediente,
-- hasta ahora una tarjeta con versión/firmas/publicación sintéticas derivadas
-- solo de assembly.status === "closed", en un acta real: presidencia y
-- secretaría designadas entre los asistentes acreditados, un resumen
-- narrativo, firma y publicación. El contenido reconstruible (asistentes,
-- coeficientes, poderes, resultado de cada punto votado) se lee en vivo desde
-- asamblea_acreditaciones/asamblea_orden_dia/asamblea_votos; el acta no lo
-- duplica. Depende de poderes-y-acreditacion-asamblea, orden-del-dia-editable
-- y votacion-real-asamblea. Detalle de las reglas en
-- specs/eve-conecta/acta-y-cierre-asamblea/spec.md.
--
-- Ninguna función existente transicionaba conjuntos.asambleas.estado más allá
-- de su valor inicial "programada" (programar_asamblea_demo lo fija una sola
-- vez); sin iniciar_asamblea_demo/cerrar_asamblea_demo, ninguna asamblea real
-- podría llegar nunca a "en_curso" ni a "cerrada" desde la interfaz, y firmar
-- un acta exige que la asamblea ya haya cerrado. Se agregan aquí como
-- prerrequisito mínimo de este bloque.

create function conjuntos.iniciar_asamblea_demo(
  p_conjunto_id uuid,
  p_asamblea_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado conjuntos.estado_asamblea;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite iniciar la asamblea';
  end if;

  select estado into v_estado
  from conjuntos.asambleas
  where conjunto_id = p_conjunto_id and id = p_asamblea_id;

  if v_estado is null then
    raise exception 'La asamblea no existe en esta copropiedad' using errcode = 'P0002';
  end if;
  if v_estado <> 'programada' then
    raise exception 'Solo una asamblea programada puede iniciarse' using errcode = '55000';
  end if;

  update conjuntos.asambleas set estado = 'en_curso'
  where conjunto_id = p_conjunto_id and id = p_asamblea_id;

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    p_conjunto_id, auth.uid(), 'asambleas.asamblea_iniciada', 'asamblea', p_asamblea_id, '{}'::jsonb
  );

  return jsonb_build_object('id', p_asamblea_id, 'status', 'in_progress');
end;
$$;

revoke all on function conjuntos.iniciar_asamblea_demo(uuid, uuid) from public;

grant execute on function conjuntos.iniciar_asamblea_demo(uuid, uuid)
to authenticated, service_role;

create function conjuntos.cerrar_asamblea_demo(
  p_conjunto_id uuid,
  p_asamblea_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_estado conjuntos.estado_asamblea;
  v_votacion_abierta boolean;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite cerrar la asamblea';
  end if;

  -- "for update" bloquea la fila de la asamblea hasta el commit: sin este
  -- lock, abrir_votacion_punto_demo (que también bloquea esta misma fila
  -- antes de fijar votacion_abierta_en) podría abrir un punto justo entre
  -- este chequeo y el UPDATE de más abajo, dejando una asamblea "cerrada"
  -- con una votación abierta — justo lo que esta función pretende impedir.
  select estado into v_estado
  from conjuntos.asambleas
  where conjunto_id = p_conjunto_id and id = p_asamblea_id
  for update;

  if v_estado is null then
    raise exception 'La asamblea no existe en esta copropiedad' using errcode = 'P0002';
  end if;
  if v_estado <> 'en_curso' then
    raise exception 'Solo una asamblea en curso puede cerrarse' using errcode = '55000';
  end if;

  select exists(
    select 1 from conjuntos.asamblea_orden_dia
    where conjunto_id = p_conjunto_id
      and asamblea_id = p_asamblea_id
      and votacion_abierta_en is not null
      and votacion_cerrada_en is null
  ) into v_votacion_abierta;

  if v_votacion_abierta then
    raise exception 'Hay una votación abierta: ciérrala antes de cerrar la asamblea'
      using errcode = '55000';
  end if;

  update conjuntos.asambleas set estado = 'cerrada'
  where conjunto_id = p_conjunto_id and id = p_asamblea_id;

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    p_conjunto_id, auth.uid(), 'asambleas.asamblea_cerrada', 'asamblea', p_asamblea_id, '{}'::jsonb
  );

  return jsonb_build_object('id', p_asamblea_id, 'status', 'closed');
end;
$$;

revoke all on function conjuntos.cerrar_asamblea_demo(uuid, uuid) from public;

grant execute on function conjuntos.cerrar_asamblea_demo(uuid, uuid)
to authenticated, service_role;

create type conjuntos.estado_acta_asamblea as enum ('borrador', 'firmada', 'publicada');

grant usage on type conjuntos.estado_acta_asamblea to authenticated, service_role;

create table conjuntos.asamblea_actas (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null references conjuntos.conjuntos(id),
  asamblea_id uuid not null,
  presidente_persona_id uuid not null,
  secretario_persona_id uuid not null,
  resumen text not null,
  version integer not null default 1,
  estado conjuntos.estado_acta_asamblea not null default 'borrador',
  firmada_en timestamptz,
  publicada_en timestamptz,
  creado_por_usuario_id uuid not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint asamblea_actas_asamblea_unica unique (asamblea_id),
  constraint asamblea_actas_asamblea_fk
    foreign key (conjunto_id, asamblea_id)
    references conjuntos.asambleas(conjunto_id, id),
  constraint asamblea_actas_presidente_fk
    foreign key (conjunto_id, presidente_persona_id)
    references conjuntos.personas(conjunto_id, id),
  constraint asamblea_actas_secretario_fk
    foreign key (conjunto_id, secretario_persona_id)
    references conjuntos.personas(conjunto_id, id),
  constraint asamblea_actas_oficiales_distintos
    check (presidente_persona_id <> secretario_persona_id),
  constraint asamblea_actas_resumen_valido check (length(trim(resumen)) >= 20),
  constraint asamblea_actas_version_valida check (version >= 1),
  -- Firmada/publicada son transiciones hacia adelante; sus marcas de tiempo
  -- solo existen desde el estado correspondiente en adelante.
  constraint asamblea_actas_firma_segun_estado check (
    (estado = 'borrador' and firmada_en is null and publicada_en is null)
    or (estado = 'firmada' and firmada_en is not null and publicada_en is null)
    or (estado = 'publicada' and firmada_en is not null and publicada_en is not null)
  )
);

comment on table conjuntos.asamblea_actas is
  'Acta única por asamblea (no versionada como historial): borrador editable, firma definitiva, publicación. El contenido reconstruible (asistentes, votos) nunca se copia aquí, se lee en vivo.';

create trigger asamblea_actas_actualizar_timestamp
before update on conjuntos.asamblea_actas
for each row execute function conjuntos.actualizar_timestamp();

alter table conjuntos.asamblea_actas enable row level security;
alter table conjuntos.asamblea_actas force row level security;

-- Antes de publicarse, el acta es tan sensible como el resto del expediente
-- en preparación: solo administración. Publicada, es evidencia del gobierno
-- de la copropiedad y la ven los cuatro roles.
create policy asamblea_actas_seleccionar
on conjuntos.asamblea_actas for select to authenticated
using (
  estado = 'publicada'
  or conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

grant select on conjuntos.asamblea_actas to authenticated, service_role;
grant insert, update on conjuntos.asamblea_actas to service_role;

create function conjuntos.guardar_acta_asamblea_demo(
  p_conjunto_id uuid,
  p_asamblea_id uuid,
  p_presidente_persona_id uuid,
  p_secretario_persona_id uuid,
  p_resumen text
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
  v_version integer;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite editar el acta';
  end if;

  select estado into v_estado_asamblea
  from conjuntos.asambleas
  where conjunto_id = p_conjunto_id and id = p_asamblea_id;

  if v_estado_asamblea is null then
    raise exception 'La asamblea no existe en esta copropiedad' using errcode = 'P0002';
  end if;
  if v_estado_asamblea = 'programada' then
    raise exception 'El acta se redacta después de iniciar la asamblea' using errcode = '55000';
  end if;

  if p_presidente_persona_id = p_secretario_persona_id then
    raise exception 'Presidencia y secretaría deben ser personas distintas'
      using errcode = '22023';
  end if;
  if length(trim(coalesce(p_resumen, ''))) < 20 then
    raise exception 'El resumen debe tener al menos 20 caracteres' using errcode = '22023';
  end if;

  if not exists (
    select 1 from conjuntos.asamblea_acreditaciones
    where conjunto_id = p_conjunto_id and asamblea_id = p_asamblea_id
      and persona_id = p_presidente_persona_id and revocado_en is null
  ) then
    raise exception 'La presidencia debe tener una acreditación activa en esta asamblea'
      using errcode = '22023';
  end if;
  if not exists (
    select 1 from conjuntos.asamblea_acreditaciones
    where conjunto_id = p_conjunto_id and asamblea_id = p_asamblea_id
      and persona_id = p_secretario_persona_id and revocado_en is null
  ) then
    raise exception 'La secretaría debe tener una acreditación activa en esta asamblea'
      using errcode = '22023';
  end if;

  -- "for update" bloquea la fila del acta (si ya existe) hasta el commit,
  -- para que firmar_acta_asamblea_demo no pueda confirmar su cambio a
  -- 'firmada' justo entre este SELECT y el UPDATE de más abajo.
  select id, estado, version into v_id, v_estado_acta, v_version
  from conjuntos.asamblea_actas
  where conjunto_id = p_conjunto_id and asamblea_id = p_asamblea_id
  for update;

  if v_id is not null and v_estado_acta <> 'borrador' then
    raise exception 'El acta ya fue firmada y no puede editarse' using errcode = '55000';
  end if;

  if v_id is null then
    begin
      insert into conjuntos.asamblea_actas (
        conjunto_id, asamblea_id, presidente_persona_id, secretario_persona_id, resumen,
        creado_por_usuario_id
      ) values (
        p_conjunto_id, p_asamblea_id, p_presidente_persona_id, p_secretario_persona_id,
        trim(p_resumen), auth.uid()
      )
      returning id, version into v_id, v_version;
    exception
      when unique_violation then
        raise exception 'El acta ya fue creada por otra solicitud simultánea'
          using errcode = '23505';
    end;
  else
    -- La condición "and estado = 'borrador'" repite, dentro del propio
    -- UPDATE, el chequeo ya hecho arriba: sin ella, un firmar_acta_asamblea_demo
    -- que confirmara justo después del SELECT (y antes de este UPDATE)
    -- dejaría pasar esta escritura sobre un acta ya firmada.
    update conjuntos.asamblea_actas
    set presidente_persona_id = p_presidente_persona_id,
      secretario_persona_id = p_secretario_persona_id,
      resumen = trim(p_resumen),
      version = version + 1
    where conjunto_id = p_conjunto_id and id = v_id and estado = 'borrador'
    returning version into v_version;

    if v_version is null then
      raise exception 'El acta ya fue firmada y no puede editarse' using errcode = '55000';
    end if;
  end if;

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    p_conjunto_id, auth.uid(), 'asambleas.acta_guardada', 'acta', v_id,
    jsonb_build_object('asamblea_id', p_asamblea_id, 'version', v_version)
  );

  return jsonb_build_object('id', v_id, 'version', v_version, 'status', 'draft');
end;
$$;

revoke all on function conjuntos.guardar_acta_asamblea_demo(uuid, uuid, uuid, uuid, text)
from public;

grant execute on function conjuntos.guardar_acta_asamblea_demo(uuid, uuid, uuid, uuid, text)
to authenticated, service_role;

create function conjuntos.firmar_acta_asamblea_demo(
  p_conjunto_id uuid,
  p_asamblea_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_estado_acta conjuntos.estado_acta_asamblea;
  v_estado_asamblea conjuntos.estado_asamblea;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite firmar el acta';
  end if;

  -- "for update" bloquea la fila del acta hasta el commit: sin este lock,
  -- dos firmas concurrentes podrían leer ambas estado='borrador' y ambas
  -- ejecutar el UPDATE, duplicando el evento de auditoría y dejando
  -- firmada_en con el valor de la que confirme al final.
  select acta.id, acta.estado, asamblea.estado
  into v_id, v_estado_acta, v_estado_asamblea
  from conjuntos.asamblea_actas as acta
  inner join conjuntos.asambleas as asamblea
    on asamblea.conjunto_id = acta.conjunto_id and asamblea.id = acta.asamblea_id
  where acta.conjunto_id = p_conjunto_id and acta.asamblea_id = p_asamblea_id
  for update of acta;

  if v_id is null then
    raise exception 'El acta no existe: guárdala antes de firmarla' using errcode = 'P0002';
  end if;
  if v_estado_acta <> 'borrador' then
    raise exception 'El acta ya está firmada' using errcode = '55000';
  end if;
  if v_estado_asamblea <> 'cerrada' then
    raise exception 'El acta solo se firma con la asamblea cerrada' using errcode = '55000';
  end if;

  update conjuntos.asamblea_actas
  set estado = 'firmada', firmada_en = now()
  where conjunto_id = p_conjunto_id and id = v_id and estado = 'borrador';

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    p_conjunto_id, auth.uid(), 'asambleas.acta_firmada', 'acta', v_id,
    jsonb_build_object('asamblea_id', p_asamblea_id)
  );

  return jsonb_build_object('id', v_id, 'status', 'signed');
end;
$$;

revoke all on function conjuntos.firmar_acta_asamblea_demo(uuid, uuid) from public;

grant execute on function conjuntos.firmar_acta_asamblea_demo(uuid, uuid)
to authenticated, service_role;

create function conjuntos.publicar_acta_asamblea_demo(
  p_conjunto_id uuid,
  p_asamblea_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_estado_acta conjuntos.estado_acta_asamblea;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite publicar el acta';
  end if;

  -- Mismo motivo que en firmar_acta_asamblea_demo: bloquea la fila para que
  -- dos publicaciones concurrentes no dupliquen el evento de auditoría.
  select id, estado into v_id, v_estado_acta
  from conjuntos.asamblea_actas
  where conjunto_id = p_conjunto_id and asamblea_id = p_asamblea_id
  for update;

  if v_id is null then
    raise exception 'El acta no existe' using errcode = 'P0002';
  end if;
  if v_estado_acta <> 'firmada' then
    raise exception 'El acta debe estar firmada antes de publicarse' using errcode = '55000';
  end if;

  update conjuntos.asamblea_actas
  set estado = 'publicada', publicada_en = now()
  where conjunto_id = p_conjunto_id and id = v_id and estado = 'firmada';

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    p_conjunto_id, auth.uid(), 'asambleas.acta_publicada', 'acta', v_id,
    jsonb_build_object('asamblea_id', p_asamblea_id)
  );

  return jsonb_build_object('id', v_id, 'status', 'published');
end;
$$;

revoke all on function conjuntos.publicar_acta_asamblea_demo(uuid, uuid) from public;

grant execute on function conjuntos.publicar_acta_asamblea_demo(uuid, uuid)
to authenticated, service_role;

create function conjuntos.obtener_acta_asamblea_demo(
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
  v_acta jsonb;
  v_publicada boolean;
  v_asistentes jsonb;
  v_puntos jsonb;
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

  -- presidenteAcreditado/secretarioAcreditado exponen si la acreditación que
  -- respaldaba a cada oficial sigue activa: nada impide revocarla después de
  -- firmar (ver revocar_acreditacion_asamblea_demo), así que el acta puede
  -- seguir nombrando a alguien que ya no figura en "Asistentes y poderes".
  select acta.estado = 'publicada', jsonb_build_object(
    'presidentePersonaId', acta.presidente_persona_id,
    'presidenteNombre', presidente.nombre,
    'presidenteAcreditado', exists (
      select 1 from conjuntos.asamblea_acreditaciones as acreditacion
      where acreditacion.conjunto_id = acta.conjunto_id
        and acreditacion.asamblea_id = acta.asamblea_id
        and acreditacion.persona_id = acta.presidente_persona_id
        and acreditacion.revocado_en is null
    ),
    'secretarioPersonaId', acta.secretario_persona_id,
    'secretarioNombre', secretario.nombre,
    'secretarioAcreditado', exists (
      select 1 from conjuntos.asamblea_acreditaciones as acreditacion
      where acreditacion.conjunto_id = acta.conjunto_id
        and acreditacion.asamblea_id = acta.asamblea_id
        and acreditacion.persona_id = acta.secretario_persona_id
        and acreditacion.revocado_en is null
    ),
    'resumen', acta.resumen,
    'version', acta.version,
    'status', case acta.estado
      when 'borrador' then 'draft'
      when 'firmada' then 'signed'
      else 'published'
    end,
    'signedAt', acta.firmada_en,
    'publishedAt', acta.publicada_en
  )
  into v_publicada, v_acta
  from conjuntos.asamblea_actas as acta
  left join conjuntos.personas as presidente
    on presidente.conjunto_id = acta.conjunto_id and presidente.id = acta.presidente_persona_id
  left join conjuntos.personas as secretario
    on secretario.conjunto_id = acta.conjunto_id and secretario.id = acta.secretario_persona_id
  where acta.conjunto_id = p_conjunto_id and acta.asamblea_id = p_asamblea_id;

  if not v_es_admin and not coalesce(v_publicada, false) then
    return jsonb_build_object('minutes', null, 'attendees', '[]'::jsonb, 'agendaItems', '[]'::jsonb);
  end if;

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

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', punto.id,
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
      end,
      'tally', punto.resultado
    )
    order by punto.posicion
  ), '[]'::jsonb)
  into v_puntos
  from conjuntos.asamblea_orden_dia as punto
  where punto.conjunto_id = p_conjunto_id and punto.asamblea_id = p_asamblea_id;

  return jsonb_build_object(
    'minutes', v_acta,
    'attendees', v_asistentes,
    'agendaItems', v_puntos
  );
end;
$$;

revoke all on function conjuntos.obtener_acta_asamblea_demo(uuid, uuid) from public;

grant execute on function conjuntos.obtener_acta_asamblea_demo(uuid, uuid)
to authenticated, service_role;

-- obtener_escenario_demo devolvía el "status" de cada asamblea directamente
-- del snapshot de demo (fijado una sola vez al programarla), nunca desde
-- conjuntos.asambleas.estado. Antes de este bloque nada mutaba ese estado
-- después de crear la asamblea, así que el desajuste no era observable; ahora
-- que iniciar_asamblea_demo/cerrar_asamblea_demo sí lo cambian, el cliente
-- seguiría viendo "Programada" para siempre y el acta nunca se habilitaría.
-- Se reemplaza para intercalar la traducción del estado real antes de las
-- ramas por rol, dejando el resto de la función idéntico a como quedó en
-- poderes-y-acreditacion-asamblea.
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

  -- El estado real vive en conjuntos.asambleas (iniciar/cerrar lo mutan); el
  -- snapshot solo trae el valor fijado al programarla. Se corrige aquí, para
  -- los cuatro roles, antes de cualquier otro enriquecimiento.
  select coalesce(
    jsonb_agg(
      asamblea.item || jsonb_build_object(
        'status',
        case coalesce(asamblea_real.estado::text, '')
          when 'programada' then 'scheduled'
          when 'en_curso' then 'in_progress'
          when 'cerrada' then 'closed'
          else asamblea.item ->> 'status'
        end
      )
      order by asamblea.ordinality
    ),
    '[]'::jsonb
  )
  into v_assemblies
  from jsonb_array_elements(coalesce(v_snapshot -> 'assemblies', '[]'::jsonb))
    with ordinality as asamblea(item, ordinality)
  left join conjuntos.asambleas as asamblea_real
    on asamblea_real.conjunto_id = p_conjunto_id
    and asamblea_real.id = (asamblea.item ->> 'id')::uuid;

  v_snapshot := jsonb_set(v_snapshot, '{assemblies}', v_assemblies);

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

-- revocar_acreditacion_asamblea_demo nunca comprobaba el estado de la
-- asamblea (a diferencia de revocar_voto_punto_demo, que exige "en_curso").
-- Eso permitía revocar la acreditación de cualquier asistente —incluida la
-- presidencia o secretaría de un acta ya firmada/publicada— con la asamblea
-- ya "cerrada", contradiciendo la premisa de este bloque de que una asamblea
-- cerrada ya no cambia. Se reemplaza para agregar ese chequeo; el resto de
-- la función queda igual que en poderes-y-acreditacion-asamblea.
create or replace function conjuntos.revocar_acreditacion_asamblea_demo(
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
  v_estado_asamblea conjuntos.estado_asamblea;
  v_revocada boolean;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite revocar acreditaciones';
  end if;

  select estado into v_estado_asamblea
  from conjuntos.asambleas
  where conjunto_id = p_conjunto_id and id = p_asamblea_id;

  if v_estado_asamblea is null then
    raise exception 'La asamblea no existe en esta copropiedad' using errcode = 'P0002';
  end if;
  if v_estado_asamblea = 'cerrada' then
    raise exception 'No se puede revocar una acreditación de una asamblea cerrada'
      using errcode = '55000';
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

-- abrir_votacion_punto_demo no bloqueaba la fila de la asamblea antes de
-- leer su estado, permitiendo que corriera en paralelo con
-- cerrar_asamblea_demo (que sí quedó con "for update" en este mismo
-- bloque) y dejara una asamblea "cerrada" con una votación recién abierta.
-- Se reemplaza solo para agregar ese lock; el resto de la función queda
-- igual que en votacion-real-asamblea.
create or replace function conjuntos.abrir_votacion_punto_demo(
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
  v_estado_asamblea conjuntos.estado_asamblea;
  v_punto conjuntos.asamblea_orden_dia;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite abrir la votación';
  end if;

  select asamblea.estado
  into v_estado_asamblea
  from conjuntos.asambleas as asamblea
  where asamblea.conjunto_id = p_conjunto_id and asamblea.id = p_asamblea_id
  for update;

  if v_estado_asamblea is null then
    raise exception 'La asamblea no existe en esta copropiedad' using errcode = 'P0002';
  end if;
  if v_estado_asamblea <> 'en_curso' then
    raise exception 'La votación solo se abre con la asamblea en curso' using errcode = '55000';
  end if;

  select * into v_punto
  from conjuntos.asamblea_orden_dia
  where conjunto_id = p_conjunto_id and asamblea_id = p_asamblea_id and id = p_punto_id;

  if v_punto.id is null then
    raise exception 'El punto no existe en esta asamblea' using errcode = 'P0002';
  end if;
  if v_punto.regla_votacion = 'ninguna' then
    raise exception 'Un punto informativo no se vota' using errcode = '22023';
  end if;
  if v_punto.estado = 'votado' then
    raise exception 'Este punto ya fue votado y no puede reabrirse' using errcode = '55000';
  end if;
  if v_punto.votacion_abierta_en is not null and v_punto.votacion_cerrada_en is null then
    raise exception 'La votación de este punto ya está abierta' using errcode = '55000';
  end if;

  update conjuntos.asamblea_orden_dia
  set
    votacion_abierta_en = now(),
    votacion_cerrada_en = null,
    estado = case when estado = 'borrador' then 'listo' else estado end
  where conjunto_id = p_conjunto_id and id = p_punto_id;

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    p_conjunto_id, auth.uid(), 'asambleas.votacion_abierta', 'punto_orden_dia', p_punto_id,
    jsonb_build_object('asamblea_id', p_asamblea_id)
  );

  return jsonb_build_object('id', p_punto_id, 'status', 'open');
end;
$$;
