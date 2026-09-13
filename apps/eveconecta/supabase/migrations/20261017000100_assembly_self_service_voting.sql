-- Voto autoservicio de asamblea. Agrega un segundo canal para el mismo
-- mecanismo de conteo de votacion-real-asamblea: el propio asistente
-- acreditado (propietario o apoderado) emite su voto directamente, con o sin
-- cuenta en el portal, sin que la mesa tenga que preguntarle y digitarlo.
-- El registro por mesa (conjuntos.votar_punto_orden_dia_demo) no cambia y
-- sigue siendo el respaldo. Depende de conjuntos.asamblea_acreditaciones
-- (poderes-y-acreditacion-asamblea) y conjuntos.asamblea_votos
-- (votacion-real-asamblea). Detalle de las reglas en
-- specs/eve-conecta/voto-autoservicio-asamblea/spec.md.

-- Necesaria para las FKs compuestas nuevas, igual que ya tienen
-- asambleas/unidades/personas/asamblea_orden_dia.
alter table conjuntos.asamblea_acreditaciones
  add constraint asamblea_acreditaciones_conjunto_id_unico unique (conjunto_id, id);

-- Un voto por autoservicio no siempre tiene un auth.uid() detrás (el enlace
-- sin cuenta no inicia sesión de Supabase), así que la atribución ya no
-- puede exigir siempre un usuario: ahora declara su origen por una de dos
-- vías, nunca ninguna.
alter table conjuntos.asamblea_votos
  alter column registrado_por_usuario_id drop not null;

alter table conjuntos.asamblea_votos
  add column acreditacion_id uuid,
  add column revocado_por_acreditacion_id uuid;

alter table conjuntos.asamblea_votos
  add constraint asamblea_votos_acreditacion_fk
    foreign key (conjunto_id, acreditacion_id)
    references conjuntos.asamblea_acreditaciones(conjunto_id, id),
  add constraint asamblea_votos_revocado_por_acreditacion_fk
    foreign key (conjunto_id, revocado_por_acreditacion_id)
    references conjuntos.asamblea_acreditaciones(conjunto_id, id);

comment on column conjuntos.asamblea_votos.acreditacion_id is
  'Si el voto es por autoservicio (con o sin cuenta), la acreditacion que lo emitio. Null cuando lo registro la mesa.';

alter table conjuntos.asamblea_votos
  add constraint asamblea_votos_origen_consistente check (
    registrado_por_usuario_id is not null or acreditacion_id is not null
  );

alter table conjuntos.asamblea_votos
  drop constraint asamblea_votos_revocacion_consistente;

alter table conjuntos.asamblea_votos
  add constraint asamblea_votos_revocacion_consistente check (
    (revocado_en is null
      and revocado_por_usuario_id is null
      and revocado_por_acreditacion_id is null)
    or (revocado_en is not null
      and (revocado_por_usuario_id is not null or revocado_por_acreditacion_id is not null))
  );

create table conjuntos.asamblea_acreditacion_tokens (
  id uuid primary key default gen_random_uuid(),
  conjunto_id uuid not null,
  asamblea_id uuid not null,
  acreditacion_id uuid not null,
  token_hash text not null,
  creado_por_usuario_id uuid not null,
  creado_en timestamptz not null default now(),
  revocado_en timestamptz,
  constraint asamblea_acreditacion_tokens_asamblea_fk
    foreign key (conjunto_id, asamblea_id)
    references conjuntos.asambleas(conjunto_id, id),
  constraint asamblea_acreditacion_tokens_acreditacion_fk
    foreign key (conjunto_id, acreditacion_id)
    references conjuntos.asamblea_acreditaciones(conjunto_id, id)
);

comment on table conjuntos.asamblea_acreditacion_tokens is
  'Enlace de un solo proposito para votar por autoservicio sin cuenta en el portal. Nunca guarda el token en claro, solo su hash. La validez la determina en cada llamada el estado de la asamblea y de la acreditacion, no el token en si.';

create unique index asamblea_acreditacion_tokens_hash_activo_unica
  on conjuntos.asamblea_acreditacion_tokens(token_hash)
  where revocado_en is null;

create index asamblea_acreditacion_tokens_acreditacion_idx
  on conjuntos.asamblea_acreditacion_tokens(acreditacion_id)
  where revocado_en is null;

alter table conjuntos.asamblea_acreditacion_tokens enable row level security;
alter table conjuntos.asamblea_acreditacion_tokens force row level security;

-- Nadie lee esta tabla directo, ni siquiera administracion: el hash no le
-- sirve a nadie fuera de las RPCs de abajo, y quien genera el enlace ya
-- recibe el token en claro una sola vez desde generar_enlace_voto_demo.
grant select, insert, update on conjuntos.asamblea_acreditacion_tokens to service_role;

-- Resuelve, para el usuario autenticado que llama, sus propias
-- acreditaciones activas con voto en esta asamblea (la suya y, si aplica,
-- las que representa como apoderado). Es lo que le permite al portal saber
-- si mostrarle "vota ahora" y con que acreditacion llamar a
-- votar_autoservicio_asamblea_demo -- sin esto, un residente no podria ver
-- su propia fila de asamblea_acreditaciones (esa tabla esta restringida a
-- administracion).
create function conjuntos.listar_mis_acreditaciones_asamblea_demo(
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
begin
  if auth.uid() is null then
    raise insufficient_privilege using message = 'Debes iniciar sesión para consultar tus acreditaciones';
  end if;

  -- "votes" trae, por cada acreditación propia, los puntos que ya votó (con
  -- qué opción): es lo que le permite al portal saber a cuáles puntos
  -- abiertos todavía les falta su voto, sin exponerle el roster completo de
  -- la votación (esa tabla sigue restringida a administración).
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', acreditacion.id,
      'unidadCodigo', unidad.codigo,
      'calidad', acreditacion.calidad,
      'representaNombre', representado.nombre,
      'votes', coalesce(votos.items, '[]'::jsonb)
    )
    order by unidad.codigo
  ), '[]'::jsonb)
  into v_items
  from conjuntos.asamblea_acreditaciones as acreditacion
  inner join conjuntos.personas as persona
    on persona.conjunto_id = acreditacion.conjunto_id and persona.id = acreditacion.persona_id
  inner join conjuntos.unidades as unidad
    on unidad.conjunto_id = acreditacion.conjunto_id and unidad.id = acreditacion.unidad_id
  left join conjuntos.personas as representado
    on representado.conjunto_id = acreditacion.conjunto_id
    and representado.id = acreditacion.representa_persona_id
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'agendaItemId', voto.punto_orden_dia_id,
        'option', case voto.opcion
          when 'si' then 'yes'
          when 'no' then 'no'
          else 'abstain'
        end
      )
    ) as items
    from conjuntos.asamblea_votos as voto
    where voto.conjunto_id = acreditacion.conjunto_id
      and voto.acreditacion_id = acreditacion.id
      and voto.revocado_en is null
  ) as votos on true
  where acreditacion.conjunto_id = p_conjunto_id
    and acreditacion.asamblea_id = p_asamblea_id
    and acreditacion.revocado_en is null
    and acreditacion.calidad in ('propietario', 'apoderado')
    and persona.auth_usuario_id = auth.uid();

  return v_items;
end;
$$;

revoke all on function conjuntos.listar_mis_acreditaciones_asamblea_demo(uuid, uuid)
from public;

grant execute on function conjuntos.listar_mis_acreditaciones_asamblea_demo(uuid, uuid)
to authenticated, service_role;

create function conjuntos.votar_autoservicio_asamblea_demo(
  p_conjunto_id uuid,
  p_asamblea_id uuid,
  p_punto_id uuid,
  p_acreditacion_id uuid,
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
  v_unidad_codigo text;
  v_coeficiente numeric(9, 6);
  v_persona_id uuid;
  v_auth_usuario_id uuid;
  v_abierta_en timestamptz;
  v_cerrada_en timestamptz;
  v_estado_asamblea conjuntos.estado_asamblea;
  v_voto_activo_id uuid;
  v_voto_activo_acreditacion_id uuid;
begin
  if auth.uid() is null then
    raise insufficient_privilege using message = 'Debes iniciar sesión para votar';
  end if;

  if p_opcion not in ('si', 'no', 'abstencion') then
    raise exception 'La opción de voto no es válida' using errcode = '22023';
  end if;

  -- La acreditacion debe pertenecer a quien llama (via su persona vinculada),
  -- estar activa en esta misma asamblea, y ser de una calidad con voto. Se
  -- exige el id explicito porque una misma persona puede tener mas de una
  -- acreditacion activa (la suya y la de quien representa como apoderado).
  select acreditacion.unidad_id, acreditacion.coeficiente_aplicado, acreditacion.persona_id
  into v_unidad_id, v_coeficiente, v_persona_id
  from conjuntos.asamblea_acreditaciones as acreditacion
  where acreditacion.conjunto_id = p_conjunto_id
    and acreditacion.asamblea_id = p_asamblea_id
    and acreditacion.id = p_acreditacion_id
    and acreditacion.revocado_en is null
    and acreditacion.calidad in ('propietario', 'apoderado');

  if v_unidad_id is null then
    raise exception 'La acreditación no existe o no tiene voto en esta asamblea'
      using errcode = '22023';
  end if;

  select persona.auth_usuario_id into v_auth_usuario_id
  from conjuntos.personas as persona
  where persona.conjunto_id = p_conjunto_id and persona.id = v_persona_id;

  if v_auth_usuario_id is null or v_auth_usuario_id <> auth.uid() then
    raise insufficient_privilege using message = 'Esta acreditación no te pertenece';
  end if;

  select unidad.codigo into v_unidad_codigo
  from conjuntos.unidades as unidad
  where unidad.conjunto_id = p_conjunto_id and unidad.id = v_unidad_id;

  -- "for update" bloquea la fila del punto hasta el commit, mismo motivo que
  -- votar_punto_orden_dia_demo: evita que un cierre concurrente deje este
  -- voto huerfano o el resultado desactualizado.
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

  -- Reconciliacion: si ya hay un voto activo para esta unidad y este punto,
  -- se reemplaza (nunca se edita el original) cuando viene de la mesa o de
  -- esta misma acreditacion; si es de una acreditacion distinta, se rechaza.
  select voto.id, voto.acreditacion_id
  into v_voto_activo_id, v_voto_activo_acreditacion_id
  from conjuntos.asamblea_votos as voto
  where voto.conjunto_id = p_conjunto_id
    and voto.punto_orden_dia_id = p_punto_id
    and voto.unidad_id = v_unidad_id
    and voto.revocado_en is null;

  if v_voto_activo_id is not null then
    if v_voto_activo_acreditacion_id is not null
      and v_voto_activo_acreditacion_id <> p_acreditacion_id then
      raise exception 'Esta unidad ya tiene un voto autoservicio de otra acreditación'
        using errcode = '55000';
    end if;
    update conjuntos.asamblea_votos
    set revocado_en = now(), revocado_por_acreditacion_id = p_acreditacion_id
    where conjunto_id = p_conjunto_id and id = v_voto_activo_id;
  end if;

  insert into conjuntos.asamblea_votos (
    id, conjunto_id, asamblea_id, punto_orden_dia_id, unidad_id, opcion,
    coeficiente_aplicado, acreditacion_id
  ) values (
    v_id, p_conjunto_id, p_asamblea_id, p_punto_id, v_unidad_id,
    p_opcion::conjuntos.opcion_voto, v_coeficiente, p_acreditacion_id
  );

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    p_conjunto_id, auth.uid(), 'asambleas.voto_autoservicio_registrado', 'voto', v_id,
    jsonb_build_object(
      'asamblea_id', p_asamblea_id, 'punto_id', p_punto_id, 'unidad_id', v_unidad_id,
      'acreditacion_id', p_acreditacion_id, 'canal', 'portal'
    )
  );

  return jsonb_build_object(
    'id', v_id,
    'unidadCodigo', v_unidad_codigo,
    'option', case p_opcion when 'si' then 'yes' when 'no' then 'no' else 'abstain' end,
    'coeficienteAplicado', v_coeficiente,
    'registradoEn', now()
  );
end;
$$;

revoke all on function conjuntos.votar_autoservicio_asamblea_demo(uuid, uuid, uuid, uuid, text)
from public;

grant execute on function conjuntos.votar_autoservicio_asamblea_demo(uuid, uuid, uuid, uuid, text)
to authenticated, service_role;

create function conjuntos.votar_con_token_asamblea_demo(
  p_token text,
  p_punto_id uuid,
  p_opcion text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
  v_token_hash text := encode(extensions.digest(p_token, 'sha256'), 'hex');
  v_conjunto_id uuid;
  v_asamblea_id uuid;
  v_acreditacion_id uuid;
  v_unidad_id uuid;
  v_unidad_codigo text;
  v_coeficiente numeric(9, 6);
  v_abierta_en timestamptz;
  v_cerrada_en timestamptz;
  v_estado_asamblea conjuntos.estado_asamblea;
  v_voto_activo_id uuid;
  v_voto_activo_acreditacion_id uuid;
begin
  if p_opcion not in ('si', 'no', 'abstencion') then
    raise exception 'La opción de voto no es válida' using errcode = '22023';
  end if;

  -- El token es la unica credencial: no hay auth.uid() (quien entra por el
  -- enlace no inicia sesion de Supabase), asi que ni conjunto_id ni
  -- asamblea_id se reciben como parametro del llamador -- salen del token.
  select token.conjunto_id, token.asamblea_id, token.acreditacion_id
  into v_conjunto_id, v_asamblea_id, v_acreditacion_id
  from conjuntos.asamblea_acreditacion_tokens as token
  where token.token_hash = v_token_hash and token.revocado_en is null;

  if v_conjunto_id is null then
    raise exception 'El enlace de votación no es válido' using errcode = '22023';
  end if;

  select acreditacion.unidad_id, acreditacion.coeficiente_aplicado
  into v_unidad_id, v_coeficiente
  from conjuntos.asamblea_acreditaciones as acreditacion
  where acreditacion.conjunto_id = v_conjunto_id
    and acreditacion.asamblea_id = v_asamblea_id
    and acreditacion.id = v_acreditacion_id
    and acreditacion.revocado_en is null
    and acreditacion.calidad in ('propietario', 'apoderado');

  if v_unidad_id is null then
    raise exception 'La acreditación de este enlace ya no está activa' using errcode = '22023';
  end if;

  select unidad.codigo into v_unidad_codigo
  from conjuntos.unidades as unidad
  where unidad.conjunto_id = v_conjunto_id and unidad.id = v_unidad_id;

  select punto.votacion_abierta_en, punto.votacion_cerrada_en, asamblea.estado
  into v_abierta_en, v_cerrada_en, v_estado_asamblea
  from conjuntos.asamblea_orden_dia as punto
  inner join conjuntos.asambleas as asamblea
    on asamblea.conjunto_id = punto.conjunto_id and asamblea.id = punto.asamblea_id
  where punto.conjunto_id = v_conjunto_id
    and punto.asamblea_id = v_asamblea_id
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

  select voto.id, voto.acreditacion_id
  into v_voto_activo_id, v_voto_activo_acreditacion_id
  from conjuntos.asamblea_votos as voto
  where voto.conjunto_id = v_conjunto_id
    and voto.punto_orden_dia_id = p_punto_id
    and voto.unidad_id = v_unidad_id
    and voto.revocado_en is null;

  if v_voto_activo_id is not null then
    if v_voto_activo_acreditacion_id is not null
      and v_voto_activo_acreditacion_id <> v_acreditacion_id then
      raise exception 'Esta unidad ya tiene un voto autoservicio de otra acreditación'
        using errcode = '55000';
    end if;
    update conjuntos.asamblea_votos
    set revocado_en = now(), revocado_por_acreditacion_id = v_acreditacion_id
    where conjunto_id = v_conjunto_id and id = v_voto_activo_id;
  end if;

  insert into conjuntos.asamblea_votos (
    id, conjunto_id, asamblea_id, punto_orden_dia_id, unidad_id, opcion,
    coeficiente_aplicado, acreditacion_id
  ) values (
    v_id, v_conjunto_id, v_asamblea_id, p_punto_id, v_unidad_id,
    p_opcion::conjuntos.opcion_voto, v_coeficiente, v_acreditacion_id
  );

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    v_conjunto_id, null, 'asambleas.voto_autoservicio_registrado', 'voto', v_id,
    jsonb_build_object(
      'asamblea_id', v_asamblea_id, 'punto_id', p_punto_id, 'unidad_id', v_unidad_id,
      'acreditacion_id', v_acreditacion_id, 'canal', 'enlace'
    )
  );

  return jsonb_build_object(
    'id', v_id,
    'unidadCodigo', v_unidad_codigo,
    'option', case p_opcion when 'si' then 'yes' when 'no' then 'no' else 'abstain' end,
    'coeficienteAplicado', v_coeficiente,
    'registradoEn', now()
  );
end;
$$;

revoke all on function conjuntos.votar_con_token_asamblea_demo(text, uuid, text) from public;

-- Quien vota por enlace nunca inicia sesión: llega como "anon" ante
-- PostgREST. El schema no le da acceso a nada por sí solo (las tablas
-- siguen con RLS forzado y sin grants directos a anon) -- USAGE es un
-- prerrequisito de resolución de nombres, no una puerta abierta.
grant usage on schema conjuntos to anon;

grant execute on function conjuntos.votar_con_token_asamblea_demo(text, uuid, text)
to anon, authenticated, service_role;

-- Lo que necesita la página pública para renderizarse: a qué unidad
-- corresponde el enlace, el título de la asamblea, y cada punto votable con
-- su estado y (si ya se votó desde esta acreditación) la opción emitida. Sin
-- esto la página no tendría forma de saber qué mostrar antes de votar.
create function conjuntos.obtener_estado_voto_token_demo(
  p_token text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_token_hash text := encode(extensions.digest(p_token, 'sha256'), 'hex');
  v_conjunto_id uuid;
  v_asamblea_id uuid;
  v_acreditacion_id uuid;
  v_unidad_codigo text;
  v_calidad conjuntos.calidad_asistente_asamblea;
  v_representa_nombre text;
  v_asamblea_titulo text;
  v_asamblea_estado conjuntos.estado_asamblea;
  v_items jsonb;
begin
  select token.conjunto_id, token.asamblea_id, token.acreditacion_id
  into v_conjunto_id, v_asamblea_id, v_acreditacion_id
  from conjuntos.asamblea_acreditacion_tokens as token
  where token.token_hash = v_token_hash and token.revocado_en is null;

  if v_conjunto_id is null then
    raise exception 'El enlace de votación no es válido' using errcode = '22023';
  end if;

  select unidad.codigo, acreditacion.calidad, representado.nombre
  into v_unidad_codigo, v_calidad, v_representa_nombre
  from conjuntos.asamblea_acreditaciones as acreditacion
  inner join conjuntos.unidades as unidad
    on unidad.conjunto_id = acreditacion.conjunto_id and unidad.id = acreditacion.unidad_id
  left join conjuntos.personas as representado
    on representado.conjunto_id = acreditacion.conjunto_id
    and representado.id = acreditacion.representa_persona_id
  where acreditacion.conjunto_id = v_conjunto_id
    and acreditacion.asamblea_id = v_asamblea_id
    and acreditacion.id = v_acreditacion_id
    and acreditacion.revocado_en is null
    and acreditacion.calidad in ('propietario', 'apoderado');

  if v_unidad_codigo is null then
    raise exception 'La acreditación de este enlace ya no está activa' using errcode = '22023';
  end if;

  select asamblea.titulo, asamblea.estado
  into v_asamblea_titulo, v_asamblea_estado
  from conjuntos.asambleas as asamblea
  where asamblea.conjunto_id = v_conjunto_id and asamblea.id = v_asamblea_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'agendaItemId', punto.id,
      'title', punto.titulo,
      'status',
        case
          when punto.votacion_cerrada_en is not null then 'closed'
          when punto.votacion_abierta_en is not null then 'open'
          else 'not_started'
        end,
      'myOption', case voto.opcion
        when 'si' then 'yes'
        when 'no' then 'no'
        when 'abstencion' then 'abstain'
        else null
      end
    )
    order by punto.posicion
  ), '[]'::jsonb)
  into v_items
  from conjuntos.asamblea_orden_dia as punto
  left join conjuntos.asamblea_votos as voto
    on voto.conjunto_id = v_conjunto_id
    and voto.punto_orden_dia_id = punto.id
    and voto.acreditacion_id = v_acreditacion_id
    and voto.revocado_en is null
  where punto.conjunto_id = v_conjunto_id
    and punto.asamblea_id = v_asamblea_id
    and punto.regla_votacion <> 'ninguna';

  return jsonb_build_object(
    'unidadCodigo', v_unidad_codigo,
    'calidad', v_calidad,
    'representaNombre', v_representa_nombre,
    'asambleaTitulo', v_asamblea_titulo,
    'asambleaEnCurso', v_asamblea_estado = 'en_curso',
    'items', v_items
  );
end;
$$;

revoke all on function conjuntos.obtener_estado_voto_token_demo(text) from public;

grant execute on function conjuntos.obtener_estado_voto_token_demo(text)
to anon, authenticated, service_role;

create function conjuntos.generar_enlace_voto_demo(
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
  v_id uuid := gen_random_uuid();
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash text := encode(extensions.digest(v_token, 'sha256'), 'hex');
  v_existe boolean;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite generar enlaces de voto';
  end if;

  select exists (
    select 1 from conjuntos.asamblea_acreditaciones as acreditacion
    where acreditacion.conjunto_id = p_conjunto_id
      and acreditacion.asamblea_id = p_asamblea_id
      and acreditacion.id = p_acreditacion_id
      and acreditacion.revocado_en is null
      and acreditacion.calidad in ('propietario', 'apoderado')
    for update of acreditacion
  ) into v_existe;

  if not v_existe then
    raise exception 'La acreditación no existe o no tiene voto en esta asamblea'
      using errcode = '22023';
  end if;

  -- El lock de fila anterior serializa llamadas concurrentes para la misma
  -- acreditacion, así que la revocación del enlace vigente y la emisión del
  -- nuevo quedan atómicas entre sí: solo un enlace activo a la vez, igual
  -- que una contraseña que se regenera.
  update conjuntos.asamblea_acreditacion_tokens
  set revocado_en = now()
  where conjunto_id = p_conjunto_id
    and asamblea_id = p_asamblea_id
    and acreditacion_id = p_acreditacion_id
    and revocado_en is null;

  insert into conjuntos.asamblea_acreditacion_tokens (
    id, conjunto_id, asamblea_id, acreditacion_id, token_hash, creado_por_usuario_id
  ) values (
    v_id, p_conjunto_id, p_asamblea_id, p_acreditacion_id, v_token_hash, auth.uid()
  );

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    p_conjunto_id, auth.uid(), 'asambleas.enlace_voto_generado', 'acreditacion',
    p_acreditacion_id, jsonb_build_object('asamblea_id', p_asamblea_id)
  );

  return jsonb_build_object('token', v_token);
end;
$$;

revoke all on function conjuntos.generar_enlace_voto_demo(uuid, uuid, uuid) from public;

grant execute on function conjuntos.generar_enlace_voto_demo(uuid, uuid, uuid)
to authenticated, service_role;

create function conjuntos.revocar_enlace_voto_demo(
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
  v_revocado boolean;
begin
  if not conjuntos.usuario_tiene_rol(
    p_conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  ) then
    raise insufficient_privilege using message = 'Tu rol no permite revocar enlaces de voto';
  end if;

  update conjuntos.asamblea_acreditacion_tokens
  set revocado_en = now()
  where conjunto_id = p_conjunto_id
    and asamblea_id = p_asamblea_id
    and acreditacion_id = p_acreditacion_id
    and revocado_en is null
  returning true into v_revocado;

  if v_revocado is null then
    raise exception 'No hay un enlace activo para esta acreditación' using errcode = 'P0002';
  end if;

  insert into conjuntos.eventos_auditoria (
    conjunto_id, actor_usuario_id, accion, recurso_tipo, recurso_id, datos
  ) values (
    p_conjunto_id, auth.uid(), 'asambleas.enlace_voto_revocado', 'acreditacion',
    p_acreditacion_id, jsonb_build_object('asamblea_id', p_asamblea_id)
  );

  return jsonb_build_object('acreditacionId', p_acreditacion_id);
end;
$$;

revoke all on function conjuntos.revocar_enlace_voto_demo(uuid, uuid, uuid) from public;

grant execute on function conjuntos.revocar_enlace_voto_demo(uuid, uuid, uuid)
to authenticated, service_role;
