begin;
set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

-- Fixtures autocontenidos y aislados de los demás archivos de tests: se
-- revierten al terminar la transacción.
truncate table conjuntos.conjuntos cascade;

insert into conjuntos.conjuntos (id, nombre)
values ('55550000-5555-4555-8555-555555555555', 'Conjunto Voto Autoservicio')
on conflict (id) do nothing;

insert into conjuntos.miembros_conjunto (conjunto_id, usuario_id, rol)
values
  ('55550000-5555-4555-8555-555555555555', '55550000-a000-4000-8000-000000000001', 'admin_conjunto'),
  ('55550000-5555-4555-8555-555555555555', '55550000-a000-4000-8000-000000000002', 'residente'),
  ('55550000-5555-4555-8555-555555555555', '55550000-a000-4000-8000-000000000004', 'residente')
on conflict (conjunto_id, usuario_id) do nothing;

insert into conjuntos.unidades (id, conjunto_id, codigo, tipo, coeficiente)
values
  ('55550000-0001-4001-8001-555555555555', '55550000-5555-4555-8555-555555555555', 'U-1', 'apartamento', 40.000000),
  ('55550000-0002-4002-8002-555555555555', '55550000-5555-4555-8555-555555555555', 'U-2', 'apartamento', 60.000000),
  ('55550000-0003-4003-8003-555555555555', '55550000-5555-4555-8555-555555555555', 'U-3', 'apartamento', 20.000000),
  ('55550000-0004-4004-8004-555555555555', '55550000-5555-4555-8555-555555555555', 'U-4', 'apartamento', 10.000000)
on conflict (id) do nothing;

-- Persona A tiene cuenta en el portal y termina con DOS acreditaciones (la
-- suya en U-1 y, como apoderada, la de B en U-2) -- es el caso de "un mismo
-- asistente representa varias unidades". Persona C no tiene cuenta: es quien
-- prueba el canal por enlace. Persona D está acreditada como
-- residente_con_voz: tiene cuenta, pero su calidad no habilita voto.
insert into conjuntos.personas (id, conjunto_id, nombre, auth_usuario_id)
values
  ('55550000-1001-4001-8001-555555555555', '55550000-5555-4555-8555-555555555555', 'Persona A', '55550000-a000-4000-8000-000000000002'),
  ('55550000-1002-4002-8002-555555555555', '55550000-5555-4555-8555-555555555555', 'Persona B (representada)', null),
  ('55550000-1003-4003-8003-555555555555', '55550000-5555-4555-8555-555555555555', 'Persona C (sin cuenta)', null),
  ('55550000-1004-4004-8004-555555555555', '55550000-5555-4555-8555-555555555555', 'Persona D', '55550000-a000-4000-8000-000000000004')
on conflict (id) do nothing;

insert into conjuntos.asambleas (
  id, conjunto_id, titulo, tipo, modalidad, inicia_en, ubicacion, orden_del_dia, estado, creado_por_usuario_id
)
values (
  '55550000-a001-4001-8001-555555555555',
  '55550000-5555-4555-8555-555555555555',
  'Asamblea de voto autoservicio',
  'ordinaria', 'hibrida', '2026-12-15 19:00:00-05', 'Salón social',
  'Punto único de prueba con detalle suficiente para pasar la validación.',
  'en_curso', '55550000-a000-4000-8000-000000000001'
)
on conflict (id) do nothing;

insert into conjuntos.asamblea_orden_dia (
  id, conjunto_id, asamblea_id, posicion, titulo, tipo_decision, regla_votacion,
  umbral_porcentaje, estado, creado_por_usuario_id, votacion_abierta_en
)
values (
  '55550000-b001-4001-8001-555555555555',
  '55550000-5555-4555-8555-555555555555',
  '55550000-a001-4001-8001-555555555555',
  1, 'Punto votable de autoservicio', 'no_economica', 'unidad', 50, 'listo',
  '55550000-a000-4000-8000-000000000001', now()
)
on conflict (id) do nothing;

insert into conjuntos.asamblea_acreditaciones (
  id, conjunto_id, asamblea_id, unidad_id, persona_id, calidad, representa_persona_id,
  coeficiente_aplicado, acreditado_por_usuario_id
)
values
  (
    '55550000-c001-4001-8001-555555555555', '55550000-5555-4555-8555-555555555555',
    '55550000-a001-4001-8001-555555555555', '55550000-0001-4001-8001-555555555555',
    '55550000-1001-4001-8001-555555555555', 'propietario', null, 40,
    '55550000-a000-4000-8000-000000000001'
  ),
  (
    '55550000-c002-4002-8002-555555555555', '55550000-5555-4555-8555-555555555555',
    '55550000-a001-4001-8001-555555555555', '55550000-0002-4002-8002-555555555555',
    '55550000-1001-4001-8001-555555555555', 'apoderado', '55550000-1002-4002-8002-555555555555', 60,
    '55550000-a000-4000-8000-000000000001'
  ),
  (
    '55550000-c003-4003-8003-555555555555', '55550000-5555-4555-8555-555555555555',
    '55550000-a001-4001-8001-555555555555', '55550000-0003-4003-8003-555555555555',
    '55550000-1003-4003-8003-555555555555', 'propietario', null, 20,
    '55550000-a000-4000-8000-000000000001'
  ),
  (
    '55550000-c004-4004-8004-555555555555', '55550000-5555-4555-8555-555555555555',
    '55550000-a001-4001-8001-555555555555', '55550000-0004-4004-8004-555555555555',
    '55550000-1004-4004-8004-555555555555', 'residente_con_voz', null, 0,
    '55550000-a000-4000-8000-000000000001'
  )
on conflict (id) do nothing;

select plan(38);

-- listar_mis_acreditaciones_asamblea_demo -----------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"55550000-a000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select is(
  (
    select jsonb_array_length(
      conjuntos.listar_mis_acreditaciones_asamblea_demo(
        '55550000-5555-4555-8555-555555555555',
        '55550000-a001-4001-8001-555555555555'
      )
    )
  ),
  2,
  'la persona A ve sus dos acreditaciones activas: la propia y la de apoderada'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"55550000-a000-4000-8000-000000000004","role":"authenticated"}',
  true
);

select is(
  (
    select jsonb_array_length(
      conjuntos.listar_mis_acreditaciones_asamblea_demo(
        '55550000-5555-4555-8555-555555555555',
        '55550000-a001-4001-8001-555555555555'
      )
    )
  ),
  0,
  'residente_con_voz no aparece en el listado: su calidad no habilita voto'
);

-- votar_autoservicio_asamblea_demo -------------------------------------------

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"55550000-a000-4000-8000-000000000004","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.votar_autoservicio_asamblea_demo(
       '55550000-5555-4555-8555-555555555555',
       '55550000-a001-4001-8001-555555555555',
       '55550000-b001-4001-8001-555555555555',
       '55550000-c004-4004-8004-555555555555',
       'si'
     ) $$,
  '22023',
  'La acreditación no existe o no tiene voto en esta asamblea',
  'residente_con_voz no puede votar por autoservicio'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"55550000-a000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.votar_autoservicio_asamblea_demo(
       '55550000-5555-4555-8555-555555555555',
       '55550000-a001-4001-8001-555555555555',
       '55550000-b001-4001-8001-555555555555',
       '55550000-c003-4003-8003-555555555555',
       'si'
     ) $$,
  '42501',
  'Esta acreditación no te pertenece',
  'la persona A no puede votar con la acreditación de la persona C'
);

-- Reconciliación: la mesa registra un voto de respaldo para U-1 antes de que
-- la propia persona A vote por su cuenta.
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"55550000-a000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  $$ select conjuntos.votar_punto_orden_dia_demo(
       '55550000-5555-4555-8555-555555555555',
       '55550000-a001-4001-8001-555555555555',
       '55550000-b001-4001-8001-555555555555',
       'U-1',
       'no'
     ) $$,
  'la mesa registra un voto de respaldo para U-1'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"55550000-a000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select is(
  (
    conjuntos.votar_autoservicio_asamblea_demo(
      '55550000-5555-4555-8555-555555555555',
      '55550000-a001-4001-8001-555555555555',
      '55550000-b001-4001-8001-555555555555',
      '55550000-c001-4001-8001-555555555555',
      'si'
    ) ->> 'unidadCodigo'
  ),
  'U-1',
  'la persona A vota por su propia acreditación de U-1, reemplazando el voto de la mesa'
);

-- Las lecturas directas sobre asamblea_votos corren como postgres porque su
-- RLS solo deja ver el detalle a administración (misma sensibilidad que la
-- acreditación); persona A, como residente, no podría verlas.
reset role;
set local role postgres;

select is(
  (
    select opcion::text from conjuntos.asamblea_votos
    where conjunto_id = '55550000-5555-4555-8555-555555555555'
      and unidad_id = '55550000-0001-4001-8001-555555555555'
      and revocado_en is null
  ),
  'si',
  'el voto activo de U-1 ya es el de la persona A, no el de la mesa'
);

select is(
  (
    select count(*)::int from conjuntos.asamblea_votos
    where conjunto_id = '55550000-5555-4555-8555-555555555555'
      and unidad_id = '55550000-0001-4001-8001-555555555555'
      and revocado_en is not null
      and revocado_por_acreditacion_id = '55550000-c001-4001-8001-555555555555'
  ),
  1,
  'el voto de mesa quedó revocado y atribuido a la acreditación que lo reemplazó'
);

-- La persona A cambia de opinión antes del cierre: su propio voto anterior
-- se revoca y se reemplaza, nunca se edita.
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"55550000-a000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select is(
  (
    conjuntos.votar_autoservicio_asamblea_demo(
      '55550000-5555-4555-8555-555555555555',
      '55550000-a001-4001-8001-555555555555',
      '55550000-b001-4001-8001-555555555555',
      '55550000-c001-4001-8001-555555555555',
      'abstencion'
    ) ->> 'option'
  ),
  'abstain',
  'la persona A cambia su propio voto de U-1 antes de que cierre la votación'
);

reset role;
set local role postgres;

select is(
  (
    select count(*)::int from conjuntos.asamblea_votos
    where conjunto_id = '55550000-5555-4555-8555-555555555555'
      and unidad_id = '55550000-0001-4001-8001-555555555555'
      and revocado_en is null
  ),
  1,
  'U-1 conserva un único voto activo tras los dos reemplazos'
);

-- La misma persona vota también por la unidad que representa como
-- apoderada: es una unidad y un voto independiente del anterior.
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"55550000-a000-4000-8000-000000000002","role":"authenticated"}',
  true
);
select is(
  (
    conjuntos.votar_autoservicio_asamblea_demo(
      '55550000-5555-4555-8555-555555555555',
      '55550000-a001-4001-8001-555555555555',
      '55550000-b001-4001-8001-555555555555',
      '55550000-c002-4002-8002-555555555555',
      'si'
    ) ->> 'unidadCodigo'
  ),
  'U-2',
  'la persona A también vota por U-2 con su acreditación de apoderada'
);

select is(
  (
    select jsonb_array_length(
      conjuntos.listar_mis_acreditaciones_asamblea_demo(
        '55550000-5555-4555-8555-555555555555',
        '55550000-a001-4001-8001-555555555555'
      ) -> 0 -> 'votes'
    )
  ) + (
    select jsonb_array_length(
      conjuntos.listar_mis_acreditaciones_asamblea_demo(
        '55550000-5555-4555-8555-555555555555',
        '55550000-a001-4001-8001-555555555555'
      ) -> 1 -> 'votes'
    )
  ),
  2,
  'el listado de mis acreditaciones ya refleja un voto emitido por cada una'
);

select throws_ok(
  $$ select conjuntos.votar_autoservicio_asamblea_demo(
       '11111111-1111-4111-8111-111111111111',
       '55550000-a001-4001-8001-555555555555',
       '55550000-b001-4001-8001-555555555555',
       '55550000-c001-4001-8001-555555555555',
       'si'
     ) $$,
  '22023',
  'La acreditación no existe o no tiene voto en esta asamblea',
  'no se vota por autoservicio usando el conjunto equivocado'
);

-- generar_enlace_voto_demo / revocar_enlace_voto_demo ------------------------

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"55550000-a000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.generar_enlace_voto_demo(
       '55550000-5555-4555-8555-555555555555',
       '55550000-a001-4001-8001-555555555555',
       '55550000-c003-4003-8003-555555555555'
     ) $$,
  '42501',
  'Tu rol no permite generar enlaces de voto',
  'un residente no puede generar enlaces de voto'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"55550000-a000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.generar_enlace_voto_demo(
       '55550000-5555-4555-8555-555555555555',
       '55550000-a001-4001-8001-555555555555',
       '55550000-c004-4004-8004-555555555555'
     ) $$,
  '22023',
  'La acreditación no existe o no tiene voto en esta asamblea',
  'no se genera un enlace para una acreditación sin voto (residente_con_voz)'
);

-- El token se guarda en una tabla temporal: es la única forma de recuperar
-- el valor en claro fuera de la respuesta de la propia RPC (el hash no
-- sirve para reconstruirlo).
create temporary table pgtap_vote_tokens (etiqueta text primary key, token text not null);
grant select on pgtap_vote_tokens to anon;
insert into pgtap_vote_tokens (etiqueta, token)
select 'personaC', (
  conjuntos.generar_enlace_voto_demo(
    '55550000-5555-4555-8555-555555555555',
    '55550000-a001-4001-8001-555555555555',
    '55550000-c003-4003-8003-555555555555'
  ) ->> 'token'
);

select ok(
  (select length(token) > 0 from pgtap_vote_tokens where etiqueta = 'personaC'),
  'se genera un enlace de voto para la persona C'
);

-- Propiedad de enlace único activo: generar un segundo enlace para la misma
-- acreditación debe invalidar el primero, nunca dejar dos vigentes.
insert into pgtap_vote_tokens (etiqueta, token)
select 'personaC_anterior', token from pgtap_vote_tokens where etiqueta = 'personaC';

insert into pgtap_vote_tokens (etiqueta, token)
select 'personaC', (
  conjuntos.generar_enlace_voto_demo(
    '55550000-5555-4555-8555-555555555555',
    '55550000-a001-4001-8001-555555555555',
    '55550000-c003-4003-8003-555555555555'
  ) ->> 'token'
)
on conflict (etiqueta) do update set token = excluded.token;

reset role;
set local role anon;

select throws_ok(
  $$ select conjuntos.obtener_estado_voto_token_demo(
       (select token from pgtap_vote_tokens where etiqueta = 'personaC_anterior')
     ) $$,
  '22023',
  'El enlace de votación no es válido',
  'generar un segundo enlace invalida el primero de inmediato'
);

reset role;
set local role postgres;

select is(
  (
    select count(*)::int from conjuntos.asamblea_acreditacion_tokens
    where conjunto_id = '55550000-5555-4555-8555-555555555555'
      and acreditacion_id = '55550000-c003-4003-8003-555555555555'
      and revocado_en is null
  ),
  1,
  'solo queda un enlace activo para la acreditación de la persona C'
);

-- votar_con_token_asamblea_demo / obtener_estado_voto_token_demo ------------

reset role;
set local role anon;

select is(
  (
    conjuntos.obtener_estado_voto_token_demo(
      (select token from pgtap_vote_tokens where etiqueta = 'personaC')
    ) ->> 'unidadCodigo'
  ),
  'U-3',
  'el estado del enlace expone la unidad correcta sin necesidad de sesión'
);

select is(
  (
    jsonb_array_length(
      conjuntos.obtener_estado_voto_token_demo(
        (select token from pgtap_vote_tokens where etiqueta = 'personaC')
      ) -> 'items'
    )
  ),
  1,
  'el estado del enlace expone el único punto de la asamblea'
);

select throws_ok(
  $$ select conjuntos.obtener_estado_voto_token_demo('token-que-no-existe') $$,
  '22023',
  'El enlace de votación no es válido',
  'un token inexistente se rechaza al consultar el estado'
);

select is(
  (
    conjuntos.votar_con_token_asamblea_demo(
      (select token from pgtap_vote_tokens where etiqueta = 'personaC'),
      '55550000-b001-4001-8001-555555555555',
      'si'
    ) ->> 'unidadCodigo'
  ),
  'U-3',
  'la persona C vota por enlace sin necesidad de cuenta ni sesión'
);

reset role;
set local role postgres;

select is(
  (
    select acreditacion_id::text from conjuntos.asamblea_votos
    where conjunto_id = '55550000-5555-4555-8555-555555555555'
      and unidad_id = '55550000-0003-4003-8003-555555555555'
      and revocado_en is null
  ),
  '55550000-c003-4003-8003-555555555555',
  'el voto por token queda atribuido a la acreditación, no a un usuario'
);

select is(
  (
    select registrado_por_usuario_id from conjuntos.asamblea_votos
    where conjunto_id = '55550000-5555-4555-8555-555555555555'
      and unidad_id = '55550000-0003-4003-8003-555555555555'
      and revocado_en is null
  ),
  null,
  'el voto por token no tiene un usuario que lo haya registrado'
);

reset role;
set local role anon;

select is(
  (
    conjuntos.obtener_estado_voto_token_demo(
      (select token from pgtap_vote_tokens where etiqueta = 'personaC')
    ) -> 'items' -> 0 ->> 'myOption'
  ),
  'yes',
  'el estado del enlace refleja el propio voto ya emitido'
);

select throws_ok(
  $$ select conjuntos.votar_con_token_asamblea_demo(
       'token-que-no-existe',
       '55550000-b001-4001-8001-555555555555',
       'no'
     ) $$,
  '22023',
  'El enlace de votación no es válido',
  'un token inexistente no permite votar'
);

-- revocar_enlace_voto_demo ----------------------------------------------------

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"55550000-a000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.revocar_enlace_voto_demo(
       '55550000-5555-4555-8555-555555555555',
       '55550000-a001-4001-8001-555555555555',
       '55550000-c003-4003-8003-555555555555'
     ) $$,
  '42501',
  'Tu rol no permite revocar enlaces de voto',
  'un residente no puede revocar enlaces de voto'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"55550000-a000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  $$ select conjuntos.revocar_enlace_voto_demo(
       '55550000-5555-4555-8555-555555555555',
       '55550000-a001-4001-8001-555555555555',
       '55550000-c003-4003-8003-555555555555'
     ) $$,
  'la administración revoca el enlace de la persona C'
);

select throws_ok(
  $$ select conjuntos.revocar_enlace_voto_demo(
       '55550000-5555-4555-8555-555555555555',
       '55550000-a001-4001-8001-555555555555',
       '55550000-c003-4003-8003-555555555555'
     ) $$,
  'P0002',
  'No hay un enlace activo para esta acreditación',
  'no se revoca dos veces el mismo enlace'
);

reset role;
set local role anon;

select throws_ok(
  $$ select conjuntos.votar_con_token_asamblea_demo(
       (select token from pgtap_vote_tokens where etiqueta = 'personaC'),
       '55550000-b001-4001-8001-555555555555',
       'no'
     ) $$,
  '22023',
  'El enlace de votación no es válido',
  'un enlace revocado deja de servir para votar'
);

-- El voto emitido antes de revocar el enlace sigue vigente: revocar el
-- enlace no anula lo ya votado.
reset role;
set local role postgres;

select is(
  (
    select count(*)::int from conjuntos.asamblea_votos
    where conjunto_id = '55550000-5555-4555-8555-555555555555'
      and unidad_id = '55550000-0003-4003-8003-555555555555'
      and revocado_en is null
  ),
  1,
  'el voto de la persona C sigue vigente después de revocar su enlace'
);

-- Cierre y verificación agregada -----------------------------------------

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"55550000-a000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  (
    conjuntos.cerrar_votacion_punto_demo(
      '55550000-5555-4555-8555-555555555555',
      '55550000-a001-4001-8001-555555555555',
      '55550000-b001-4001-8001-555555555555'
    ) ->> 'yesUnits'
  )::int,
  2,
  'al cerrar, el punto contabiliza los dos votos "sí" (U-2 y U-3) sin importar el canal'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"55550000-a000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.votar_autoservicio_asamblea_demo(
       '55550000-5555-4555-8555-555555555555',
       '55550000-a001-4001-8001-555555555555',
       '55550000-b001-4001-8001-555555555555',
       '55550000-c001-4001-8001-555555555555',
       'si'
     ) $$,
  '55000',
  'La votación de este punto ya está cerrada',
  'no se vota por autoservicio en un punto ya cerrado'
);

reset role;
set local role anon;

select throws_ok(
  $$ select conjuntos.obtener_estado_voto_token_demo(
       (select token from pgtap_vote_tokens where etiqueta = 'personaC')
     ) $$,
  '22023',
  'El enlace de votación no es válido',
  'el enlace ya revocado sigue sin servir después del cierre'
);

-- El canal por enlace también debe rechazar un punto ya cerrado, no solo el
-- autenticado: se genera un enlace vigente para una acreditación que ya
-- votó, con el punto todavía abierto, y se cierra la votación después.
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"55550000-a000-4000-8000-000000000001","role":"authenticated"}',
  true
);

insert into pgtap_vote_tokens (etiqueta, token)
select 'personaA_u1_cerrado', (
  conjuntos.generar_enlace_voto_demo(
    '55550000-5555-4555-8555-555555555555',
    '55550000-a001-4001-8001-555555555555',
    '55550000-c001-4001-8001-555555555555'
  ) ->> 'token'
);

reset role;
set local role anon;

select throws_ok(
  $$ select conjuntos.votar_con_token_asamblea_demo(
       (select token from pgtap_vote_tokens where etiqueta = 'personaA_u1_cerrado'),
       '55550000-b001-4001-8001-555555555555',
       'no'
     ) $$,
  '55000',
  'La votación de este punto ya está cerrada',
  'un enlace vigente tampoco puede votar en un punto ya cerrado'
);

-- Las CHECK constraints de atribución/revocación deben rechazar filas
-- inconsistentes al nivel de la base, no solo confiar en la lógica de las
-- RPC. Ambos inserts usan revocado_en no nulo para no chocar con el índice
-- único parcial de voto activo por punto/unidad.
reset role;
set local role postgres;

select throws_ok(
  $$ insert into conjuntos.asamblea_votos (
       conjunto_id, asamblea_id, punto_orden_dia_id, unidad_id, opcion,
       coeficiente_aplicado, registrado_por_usuario_id, acreditacion_id,
       revocado_en, revocado_por_usuario_id
     ) values (
       '55550000-5555-4555-8555-555555555555', '55550000-a001-4001-8001-555555555555',
       '55550000-b001-4001-8001-555555555555', '55550000-0001-4001-8001-555555555555', 'si',
       40, null, null, now(), '55550000-a000-4000-8000-000000000001'
     ) $$,
  '23514',
  'new row for relation "asamblea_votos" violates check constraint "asamblea_votos_origen_consistente"',
  'un voto sin usuario registrador ni acreditación viola asamblea_votos_origen_consistente'
);

select throws_ok(
  $$ insert into conjuntos.asamblea_votos (
       conjunto_id, asamblea_id, punto_orden_dia_id, unidad_id, opcion,
       coeficiente_aplicado, registrado_por_usuario_id,
       revocado_en, revocado_por_usuario_id, revocado_por_acreditacion_id
     ) values (
       '55550000-5555-4555-8555-555555555555', '55550000-a001-4001-8001-555555555555',
       '55550000-b001-4001-8001-555555555555', '55550000-0001-4001-8001-555555555555', 'si',
       40, '55550000-a000-4000-8000-000000000001',
       now(), null, null
     ) $$,
  '23514',
  'new row for relation "asamblea_votos" violates check constraint "asamblea_votos_revocacion_consistente"',
  'un voto revocado sin quien lo revocó viola asamblea_votos_revocacion_consistente'
);

select is(
  (
    select count(*)::int from conjuntos.asamblea_votos
    where conjunto_id = '55550000-5555-4555-8555-555555555555' and revocado_en is null
  ),
  3,
  'quedan tres votos activos en total: U-1 (abstención), U-2 (sí) y U-3 (sí)'
);

select * from finish();
rollback;
