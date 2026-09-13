-- Votación real de asambleas. Convierte la etapa "En vivo" del expediente,
-- hasta ahora un resultado fijo generado por código (defaultVotes en
-- lib/assemblies.ts), en votos reales por unidad sobre los puntos del orden
-- del día. Depende de conjuntos.asamblea_orden_dia (orden-del-dia-editable) y
-- de conjuntos.asamblea_acreditaciones (poderes-y-acreditacion-asamblea): de
-- ahí sale el coeficiente y quién tiene voto. Detalle de las reglas en
-- specs/eve-conecta/votacion-real-asamblea/spec.md.

alter table conjuntos.asamblea_orden_dia
  add column if not exists votacion_abierta_en timestamptz,
  add column if not exists votacion_cerrada_en timestamptz,
  add column if not exists resultado jsonb;

comment on column conjuntos.asamblea_orden_dia.resultado is
  'Resultado agregado congelado al cerrar la votación (sí/no/abstención, base y aprobado). No se recalcula después.';

-- Necesaria para la FK compuesta de asamblea_votos, igual que ya tienen
-- asambleas/unidades/personas.
alter table conjuntos.asamblea_orden_dia
  add constraint asamblea_orden_dia_conjunto_id_unico unique (conjunto_id, id);

create type conjuntos.opcion_voto as enum ('si', 'no', 'abstencion');

grant usage on type conjuntos.opcion_voto to authenticated, service_role;

create table conjuntos.asamblea_votos (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null,
  asamblea_id uuid not null,
  punto_orden_dia_id uuid not null,
  unidad_id uuid not null,
  opcion conjuntos.opcion_voto not null,
  coeficiente_aplicado numeric(9, 6) not null
    constraint asamblea_votos_coeficiente_valido
      check (coeficiente_aplicado >= 0 and coeficiente_aplicado <= 100),
  registrado_por_usuario_id uuid not null,
  registrado_en timestamptz not null default now(),
  revocado_en timestamptz,
  revocado_por_usuario_id uuid,
  constraint asamblea_votos_asamblea_fk
    foreign key (conjunto_id, asamblea_id)
    references conjuntos.asambleas(conjunto_id, id),
  constraint asamblea_votos_punto_fk
    foreign key (conjunto_id, punto_orden_dia_id)
    references conjuntos.asamblea_orden_dia(conjunto_id, id),
  constraint asamblea_votos_unidad_fk
    foreign key (conjunto_id, unidad_id)
    references conjuntos.unidades(conjunto_id, id),
  constraint asamblea_votos_revocacion_consistente check (
    (revocado_en is null and revocado_por_usuario_id is null)
    or (revocado_en is not null and revocado_por_usuario_id is not null)
  )
);

comment on table conjuntos.asamblea_votos is
  'Voto de una unidad sobre un punto del orden del día. Corregir un voto es revocarlo y volver a registrarlo, nunca editar el original.';

-- El mecanismo real que impide el voto duplicado: solo una fila activa por
-- unidad y punto.
create unique index asamblea_votos_punto_unidad_activa_unica
  on conjuntos.asamblea_votos(punto_orden_dia_id, unidad_id)
  where revocado_en is null;

create index asamblea_votos_punto_idx
  on conjuntos.asamblea_votos(punto_orden_dia_id)
  where revocado_en is null;

alter table conjuntos.asamblea_votos enable row level security;
alter table conjuntos.asamblea_votos force row level security;

-- Identifica qué unidad votó qué: misma sensibilidad que la acreditación,
-- restringido a administración (la agregación pública sale por RPC aparte).
create policy asamblea_votos_seleccionar
on conjuntos.asamblea_votos for select to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

grant select on conjuntos.asamblea_votos to authenticated, service_role;
grant insert, update on conjuntos.asamblea_votos to service_role;

create function conjuntos.abrir_votacion_punto_demo(
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
  where asamblea.conjunto_id = p_conjunto_id and asamblea.id = p_asamblea_id;

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

revoke all on function conjuntos.abrir_votacion_punto_demo(uuid, uuid, uuid) from public;

grant execute on function conjuntos.abrir_votacion_punto_demo(uuid, uuid, uuid)
to authenticated, service_role;

create function conjuntos.votar_punto_orden_dia_demo(
  p_conjunto_id uuid,
  p_asamblea_id uuid,
  p_punto_id uuid,
  p_unidad_codigo text,
  p_opcion text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
  v_unidad_id uuid;
  v_abierta_en timestamptz;
  v_cerrada_en timestamptz;
  v_estado_asamblea conjuntos.estado_asamblea;
  v_coeficiente numeric(9, 6);
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite registrar votos';
  end if;

  if p_opcion not in ('si', 'no', 'abstencion') then
    raise exception 'La opción de voto no es válida' using errcode = '22023';
  end if;

  -- "for update" bloquea la fila del punto hasta el commit: evita que un
  -- cierre concurrente calcule y congele "resultado" sin ver este voto (o que
  -- el voto se inserte justo después de congelado, quedando huérfano).
  select punto.votacion_abierta_en, punto.votacion_cerrada_en, asamblea.estado
  into v_abierta_en, v_cerrada_en, v_estado_asamblea
  from conjuntos.asamblea_orden_dia as punto
  inner join conjuntos.asambleas as asamblea
    on asamblea.conjunto_id = punto.conjunto_id and asamblea.id = punto.asamblea_id
  where punto.conjunto_id = p_conjunto_id
    and punto.asamblea_id = p_asamblea_id
    and punto.id = p_punto_id
  for update of punto;

  if v_abierta_en is null then
    raise exception 'El punto no existe o la votación no ha sido abierta' using errcode = 'P0002';
  end if;
  if v_cerrada_en is not null then
    raise exception 'La votación de este punto ya está cerrada' using errcode = '55000';
  end if;
  if v_estado_asamblea <> 'en_curso' then
    raise exception 'Los votos solo se registran con la asamblea en curso' using errcode = '55000';
  end if;

  select unidad.id
  into v_unidad_id
  from conjuntos.unidades as unidad
  where unidad.conjunto_id = p_conjunto_id and unidad.codigo = trim(p_unidad_codigo);

  if v_unidad_id is null then
    raise exception 'La unidad indicada no existe en esta copropiedad' using errcode = '22023';
  end if;

  -- El coeficiente se congela desde la acreditación vigente de esa unidad en
  -- esta asamblea: solo propietario o apoderado cargan voto (residente con
  -- voz tiene voz, no voto).
  select acreditacion.coeficiente_aplicado
  into v_coeficiente
  from conjuntos.asamblea_acreditaciones as acreditacion
  where acreditacion.conjunto_id = p_conjunto_id
    and acreditacion.asamblea_id = p_asamblea_id
    and acreditacion.unidad_id = v_unidad_id
    and acreditacion.revocado_en is null
    and acreditacion.calidad in ('propietario', 'apoderado');

  if v_coeficiente is null then
    raise exception 'Esa unidad no tiene una acreditación con voto en esta asamblea'
      using errcode = '22023';
  end if;

  begin
    insert into conjuntos.asamblea_votos (
      id, conjunto_id, asamblea_id, punto_orden_dia_id, unidad_id, opcion,
      coeficiente_aplicado, registrado_por_usuario_id
    ) values (
      v_id, p_conjunto_id, p_asamblea_id, p_punto_id, v_unidad_id,
      p_opcion::conjuntos.opcion_voto, v_coeficiente, auth.uid()
    );
  exception
    when unique_violation then
      raise exception 'Esa unidad ya votó este punto' using errcode = '23505';
  end;

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    p_conjunto_id, auth.uid(), 'asambleas.voto_registrado', 'voto', v_id,
    jsonb_build_object(
      'asamblea_id', p_asamblea_id, 'punto_id', p_punto_id, 'unidad_id', v_unidad_id
    )
  );

  return jsonb_build_object(
    'id', v_id,
    'unidadCodigo', p_unidad_codigo,
    'option', case p_opcion
      when 'si' then 'yes'
      when 'no' then 'no'
      else 'abstain'
    end,
    'coeficienteAplicado', v_coeficiente,
    'registradoEn', now()
  );
end;
$$;

revoke all on function conjuntos.votar_punto_orden_dia_demo(uuid, uuid, uuid, text, text)
from public;

grant execute on function conjuntos.votar_punto_orden_dia_demo(uuid, uuid, uuid, text, text)
to authenticated, service_role;

create function conjuntos.revocar_voto_punto_demo(
  p_conjunto_id uuid,
  p_asamblea_id uuid,
  p_voto_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_punto_id uuid;
  v_cerrada_en timestamptz;
  v_estado_asamblea conjuntos.estado_asamblea;
  v_revocado boolean;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite revocar votos';
  end if;

  select voto.punto_orden_dia_id
  into v_punto_id
  from conjuntos.asamblea_votos as voto
  where voto.conjunto_id = p_conjunto_id
    and voto.asamblea_id = p_asamblea_id
    and voto.id = p_voto_id
    and voto.revocado_en is null;

  if v_punto_id is null then
    raise exception 'El voto no existe o ya estaba revocado' using errcode = 'P0002';
  end if;

  -- "for update" bloquea la fila del punto hasta el commit, igual que en
  -- votar_punto_orden_dia_demo, para que un cierre concurrente no ignore esta
  -- revocación ni la sufra después de congelar "resultado".
  select punto.votacion_cerrada_en, asamblea.estado
  into v_cerrada_en, v_estado_asamblea
  from conjuntos.asamblea_orden_dia as punto
  inner join conjuntos.asambleas as asamblea
    on asamblea.conjunto_id = punto.conjunto_id and asamblea.id = punto.asamblea_id
  where punto.conjunto_id = p_conjunto_id and punto.id = v_punto_id
  for update of punto;

  if v_cerrada_en is not null then
    raise exception 'La votación de este punto ya está cerrada' using errcode = '55000';
  end if;
  if v_estado_asamblea <> 'en_curso' then
    raise exception 'Los votos solo se revocan con la asamblea en curso' using errcode = '55000';
  end if;

  update conjuntos.asamblea_votos
  set revocado_en = now(), revocado_por_usuario_id = auth.uid()
  where conjunto_id = p_conjunto_id and id = p_voto_id
  returning true into v_revocado;

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    p_conjunto_id, auth.uid(), 'asambleas.voto_revocado', 'voto', p_voto_id,
    jsonb_build_object('asamblea_id', p_asamblea_id, 'punto_id', v_punto_id)
  );

  return jsonb_build_object('id', p_voto_id);
end;
$$;

revoke all on function conjuntos.revocar_voto_punto_demo(uuid, uuid, uuid) from public;

grant execute on function conjuntos.revocar_voto_punto_demo(uuid, uuid, uuid)
to authenticated, service_role;

create function conjuntos.cerrar_votacion_punto_demo(
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
  v_regla conjuntos.regla_votacion_orden_dia;
  v_umbral numeric(5, 2);
  v_abierta_en timestamptz;
  v_cerrada_en timestamptz;
  v_estado_asamblea conjuntos.estado_asamblea;
  v_si_unidades bigint;
  v_no_unidades bigint;
  v_abst_unidades bigint;
  v_si_coef numeric(12, 6);
  v_no_coef numeric(12, 6);
  v_abst_coef numeric(12, 6);
  v_base_si numeric(12, 6);
  v_base_no numeric(12, 6);
  v_aprobado boolean;
  v_resultado jsonb;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite cerrar la votación';
  end if;

  -- "for update" bloquea la fila del punto hasta el commit: sin este lock, un
  -- voto podría insertarse justo entre la agregación de abajo y el UPDATE que
  -- congela "resultado", quedando huérfano para siempre (el resultado nunca
  -- se recalcula).
  select punto.regla_votacion, punto.umbral_porcentaje, punto.votacion_abierta_en,
    punto.votacion_cerrada_en, asamblea.estado
  into v_regla, v_umbral, v_abierta_en, v_cerrada_en, v_estado_asamblea
  from conjuntos.asamblea_orden_dia as punto
  inner join conjuntos.asambleas as asamblea
    on asamblea.conjunto_id = punto.conjunto_id and asamblea.id = punto.asamblea_id
  where punto.conjunto_id = p_conjunto_id
    and punto.asamblea_id = p_asamblea_id
    and punto.id = p_punto_id
  for update of punto;

  if v_abierta_en is null then
    raise exception 'El punto no existe o la votación no ha sido abierta' using errcode = 'P0002';
  end if;
  if v_cerrada_en is not null then
    raise exception 'La votación de este punto ya está cerrada' using errcode = '55000';
  end if;
  if v_estado_asamblea <> 'en_curso' then
    raise exception 'La votación solo se cierra con la asamblea en curso' using errcode = '55000';
  end if;

  select
    count(*) filter (where opcion = 'si'),
    count(*) filter (where opcion = 'no'),
    count(*) filter (where opcion = 'abstencion'),
    coalesce(sum(coeficiente_aplicado) filter (where opcion = 'si'), 0),
    coalesce(sum(coeficiente_aplicado) filter (where opcion = 'no'), 0),
    coalesce(sum(coeficiente_aplicado) filter (where opcion = 'abstencion'), 0)
  into v_si_unidades, v_no_unidades, v_abst_unidades, v_si_coef, v_no_coef, v_abst_coef
  from conjuntos.asamblea_votos
  where conjunto_id = p_conjunto_id and punto_orden_dia_id = p_punto_id and revocado_en is null;

  -- La base de aprobación son los votos sí/no (las abstenciones no cuentan en
  -- el denominador); por unidad si la regla es "unidad", por coeficiente en
  -- cualquier otro caso. Convención de conteo documentada en la spec, no una
  -- cifra legal específica.
  if v_regla = 'unidad' then
    v_base_si := v_si_unidades;
    v_base_no := v_no_unidades;
  else
    v_base_si := v_si_coef;
    v_base_no := v_no_coef;
  end if;

  v_aprobado := (v_base_si + v_base_no) > 0
    and (v_base_si / (v_base_si + v_base_no)) * 100 >= v_umbral;

  v_resultado := jsonb_build_object(
    'yesUnits', v_si_unidades,
    'noUnits', v_no_unidades,
    'abstainUnits', v_abst_unidades,
    'yesCoefficient', v_si_coef,
    'noCoefficient', v_no_coef,
    'abstainCoefficient', v_abst_coef,
    'approved', v_aprobado,
    'closedAt', now()
  );

  update conjuntos.asamblea_orden_dia
  set votacion_cerrada_en = now(), estado = 'votado', resultado = v_resultado
  where conjunto_id = p_conjunto_id and id = p_punto_id;

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    p_conjunto_id, auth.uid(), 'asambleas.votacion_cerrada', 'punto_orden_dia', p_punto_id,
    jsonb_build_object('asamblea_id', p_asamblea_id) || v_resultado
  );

  return jsonb_build_object('id', p_punto_id, 'status', 'closed') || v_resultado;
end;
$$;

revoke all on function conjuntos.cerrar_votacion_punto_demo(uuid, uuid, uuid) from public;

grant execute on function conjuntos.cerrar_votacion_punto_demo(uuid, uuid, uuid)
to authenticated, service_role;

create function conjuntos.listar_votaciones_asamblea_demo(
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
  v_secreto boolean;
  v_items jsonb;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto', 'consejo', 'residente']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu usuario no pertenece a esta copropiedad';
  end if;

  select coalesce((conjunto.funcionalidades_asamblea ->> 'secret_ballots')::boolean, false)
  into v_secreto
  from conjuntos.conjuntos as conjunto
  where conjunto.id = p_conjunto_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'agendaItemId', punto.id,
      'status',
        case
          when punto.votacion_cerrada_en is not null then 'closed'
          when punto.votacion_abierta_en is not null then 'open'
          else 'not_started'
        end,
      'tally', coalesce(
        punto.resultado,
        jsonb_build_object(
          'yesUnits', coalesce(resumen.si_unidades, 0),
          'noUnits', coalesce(resumen.no_unidades, 0),
          'abstainUnits', coalesce(resumen.abst_unidades, 0),
          'yesCoefficient', coalesce(resumen.si_coef, 0),
          'noCoefficient', coalesce(resumen.no_coef, 0),
          'abstainCoefficient', coalesce(resumen.abst_coef, 0),
          'approved', null
        )
      ),
      'roster',
        case
          when v_secreto or not conjuntos.usuario_tiene_rol(
            p_conjunto_id,
            array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
          ) then null
          else coalesce(roster.items, '[]'::jsonb)
        end
    )
    order by punto.posicion
  ), '[]'::jsonb)
  into v_items
  from conjuntos.asamblea_orden_dia as punto
  left join lateral (
    select
      count(*) filter (where voto.opcion = 'si') as si_unidades,
      count(*) filter (where voto.opcion = 'no') as no_unidades,
      count(*) filter (where voto.opcion = 'abstencion') as abst_unidades,
      coalesce(sum(voto.coeficiente_aplicado) filter (where voto.opcion = 'si'), 0) as si_coef,
      coalesce(sum(voto.coeficiente_aplicado) filter (where voto.opcion = 'no'), 0) as no_coef,
      coalesce(
        sum(voto.coeficiente_aplicado) filter (where voto.opcion = 'abstencion'), 0
      ) as abst_coef
    from conjuntos.asamblea_votos as voto
    where voto.conjunto_id = p_conjunto_id
      and voto.punto_orden_dia_id = punto.id
      and voto.revocado_en is null
  ) as resumen on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'id', voto.id,
        'unidadCodigo', unidad.codigo,
        'option', case voto.opcion
          when 'si' then 'yes'
          when 'no' then 'no'
          else 'abstain'
        end,
        'coeficienteAplicado', voto.coeficiente_aplicado,
        'registradoEn', voto.registrado_en
      )
      order by voto.registrado_en desc
    ) as items
    from conjuntos.asamblea_votos as voto
    inner join conjuntos.unidades as unidad
      on unidad.conjunto_id = voto.conjunto_id and unidad.id = voto.unidad_id
    where voto.conjunto_id = p_conjunto_id
      and voto.punto_orden_dia_id = punto.id
      and voto.revocado_en is null
  ) as roster on true
  where punto.conjunto_id = p_conjunto_id
    and punto.asamblea_id = p_asamblea_id
    and punto.regla_votacion <> 'ninguna';

  return v_items;
end;
$$;

revoke all on function conjuntos.listar_votaciones_asamblea_demo(uuid, uuid) from public;

grant execute on function conjuntos.listar_votaciones_asamblea_demo(uuid, uuid)
to authenticated, service_role;
