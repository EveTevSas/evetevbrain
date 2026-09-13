begin;
set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

-- Fixtures autocontenidos y aislados de los demás archivos de tests: se
-- revierten al terminar la transacción.
truncate table conjuntos.conjuntos cascade;

insert into conjuntos.conjuntos (id, nombre)
values ('66666666-6666-4666-8666-666666666666', 'Conjunto Votación')
on conflict (id) do nothing;

insert into conjuntos.miembros_conjunto (conjunto_id, usuario_id, rol)
values
  ('66666666-6666-4666-8666-666666666666', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01', 'admin_conjunto'),
  ('66666666-6666-4666-8666-666666666666', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee02', 'residente'),
  ('66666666-6666-4666-8666-666666666666', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee03', 'consejo')
on conflict (conjunto_id, usuario_id) do nothing;

insert into conjuntos.unidades (id, conjunto_id, codigo, tipo, coeficiente)
values
  ('66666666-0001-4001-8001-666666666666', '66666666-6666-4666-8666-666666666666', 'A-201', 'apartamento', 40.000000),
  ('66666666-0002-4002-8002-666666666666', '66666666-6666-4666-8666-666666666666', 'A-202', 'apartamento', 60.000000),
  ('66666666-0003-4003-8003-666666666666', '66666666-6666-4666-8666-666666666666', 'A-203', 'apartamento', 20.000000)
on conflict (id) do nothing;

insert into conjuntos.personas (id, conjunto_id, nombre)
values
  ('66666666-1001-4001-8001-666666666666', '66666666-6666-4666-8666-666666666666', 'Propietario A-201'),
  ('66666666-1002-4002-8002-666666666666', '66666666-6666-4666-8666-666666666666', 'Propietario A-202'),
  ('66666666-1003-4003-8003-666666666666', '66666666-6666-4666-8666-666666666666', 'Residente A-203')
on conflict (id) do nothing;

insert into conjuntos.personas_unidades (
  id, conjunto_id, persona_id, unidad_id, relacion, responsable_pago, vigente_desde
)
values
  (
    '66666666-2001-4001-8001-666666666666',
    '66666666-6666-4666-8666-666666666666',
    '66666666-1001-4001-8001-666666666666',
    '66666666-0001-4001-8001-666666666666',
    'propietario', true, '2026-01-01'
  ),
  (
    '66666666-2002-4002-8002-666666666666',
    '66666666-6666-4666-8666-666666666666',
    '66666666-1002-4002-8002-666666666666',
    '66666666-0002-4002-8002-666666666666',
    'propietario', true, '2026-01-01'
  ),
  (
    '66666666-2003-4003-8003-666666666666',
    '66666666-6666-4666-8666-666666666666',
    '66666666-1003-4003-8003-666666666666',
    '66666666-0003-4003-8003-666666666666',
    'residente', false, '2026-01-01'
  )
on conflict (id) do nothing;

-- Asamblea 1: todavía "programada" mientras se arma el orden del día; se
-- pasa a "en_curso" más abajo, ya con los puntos y acreditaciones listos.
insert into conjuntos.asambleas (
  id, conjunto_id, titulo, tipo, modalidad, inicia_en, ubicacion, orden_del_dia, estado, creado_por_usuario_id
)
values
  (
    '66666666-a001-4001-8001-666666666666',
    '66666666-6666-4666-8666-666666666666',
    'Asamblea de votación',
    'ordinaria', 'presencial', '2026-12-15 19:00:00-05', 'Salón social',
    'Verificación del quórum y aprobación del orden del día.',
    'programada', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01'
  ),
  (
    '66666666-a002-4002-8002-666666666666',
    '66666666-6666-4666-8666-666666666666',
    'Asamblea todavía programada',
    'ordinaria', 'presencial', '2026-12-20 19:00:00-05', 'Salón social',
    'No ha iniciado.',
    'programada', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01'
  )
on conflict (id) do nothing;

select plan(36);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01","role":"authenticated"}',
  true
);

-- El orden del día se arma mientras la asamblea sigue "programada" (no se
-- puede editar una vez "en_curso").
select lives_ok(
  $$ select conjuntos.agregar_punto_orden_dia_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       'Verificación del quórum',
       'no_economica',
       'unidad',
       50
     ) $$,
  'la administración agrega el punto por unidad'
);

select lives_ok(
  $$ select conjuntos.agregar_punto_orden_dia_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       'Aprobación del presupuesto',
       'economica',
       'coeficiente',
       50
     ) $$,
  'la administración agrega el punto por coeficiente'
);

select lives_ok(
  $$ select conjuntos.agregar_punto_orden_dia_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       'Punto para probar votación secreta',
       'no_economica',
       'unidad',
       50
     ) $$,
  'la administración agrega el tercer punto para la prueba de voto secreto'
);

select lives_ok(
  $$ select conjuntos.acreditar_asistente_asamblea_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       'propietario',
       '66666666-1001-4001-8001-666666666666',
       'A-201'
     ) $$,
  'se acredita al propietario de A-201'
);

select lives_ok(
  $$ select conjuntos.acreditar_asistente_asamblea_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       'propietario',
       '66666666-1002-4002-8002-666666666666',
       'A-202'
     ) $$,
  'se acredita al propietario de A-202'
);

select lives_ok(
  $$ select conjuntos.acreditar_asistente_asamblea_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       'residente_con_voz',
       '66666666-1003-4003-8003-666666666666',
       'A-203'
     ) $$,
  'se acredita con voz (sin voto) al residente de A-203'
);

reset role;
set local role postgres;
update conjuntos.asambleas set estado = 'en_curso'
where id = '66666666-a001-4001-8001-666666666666';

-- La segunda asamblea recibe un punto votable mientras sigue "programada",
-- para probar que la votación no se abre fuera de una asamblea en curso.
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01","role":"authenticated"}',
  true
);
select lives_ok(
  $$ select conjuntos.agregar_punto_orden_dia_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a002-4002-8002-666666666666',
       'Punto de asamblea aún no iniciada',
       'no_economica',
       'unidad',
       50
     ) $$,
  'se agrega un punto a la asamblea todavía programada'
);

select throws_ok(
  $$ select conjuntos.abrir_votacion_punto_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a002-4002-8002-666666666666',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '66666666-a002-4002-8002-666666666666'
       )
     ) $$,
  '55000',
  'La votación solo se abre con la asamblea en curso',
  'no se abre una votación mientras la asamblea sigue programada'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeee02","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.abrir_votacion_punto_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '66666666-a001-4001-8001-666666666666' and titulo = 'Verificación del quórum'
       )
     ) $$,
  '42501',
  'Tu rol no permite abrir la votación',
  'un residente no puede abrir una votación'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01","role":"authenticated"}',
  true
);

select lives_ok(
  $$ select conjuntos.abrir_votacion_punto_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '66666666-a001-4001-8001-666666666666' and titulo = 'Verificación del quórum'
       )
     ) $$,
  'la administración abre la votación del punto por unidad'
);

select throws_ok(
  $$ select conjuntos.abrir_votacion_punto_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '66666666-a001-4001-8001-666666666666' and titulo = 'Verificación del quórum'
       )
     ) $$,
  '55000',
  'La votación de este punto ya está abierta',
  'no se abre dos veces la votación del mismo punto'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeee02","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.votar_punto_orden_dia_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '66666666-a001-4001-8001-666666666666' and titulo = 'Verificación del quórum'
       ),
       'A-201',
       'si'
     ) $$,
  '42501',
  'Tu rol no permite registrar votos',
  'un residente no puede registrar votos (mesa de votación administrada)'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.votar_punto_orden_dia_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '66666666-a001-4001-8001-666666666666' and titulo = 'Verificación del quórum'
       ),
       'A-999',
       'si'
     ) $$,
  '22023',
  'La unidad indicada no existe en esta copropiedad',
  'no se vota por una unidad inexistente'
);

select throws_ok(
  $$ select conjuntos.votar_punto_orden_dia_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '66666666-a001-4001-8001-666666666666' and titulo = 'Verificación del quórum'
       ),
       'A-203',
       'si'
     ) $$,
  '22023',
  'Esa unidad no tiene una acreditación con voto en esta asamblea',
  'un residente con voz (sin voto) no habilita el voto de su unidad'
);

select lives_ok(
  $$ select conjuntos.votar_punto_orden_dia_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '66666666-a001-4001-8001-666666666666' and titulo = 'Verificación del quórum'
       ),
       'A-201',
       'si'
     ) $$,
  'se registra el voto de A-201'
);

select throws_ok(
  $$ select conjuntos.votar_punto_orden_dia_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '66666666-a001-4001-8001-666666666666' and titulo = 'Verificación del quórum'
       ),
       'A-201',
       'no'
     ) $$,
  '23505',
  'Esa unidad ya votó este punto',
  'una unidad no puede votar dos veces el mismo punto'
);

select lives_ok(
  $$ select conjuntos.votar_punto_orden_dia_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '66666666-a001-4001-8001-666666666666' and titulo = 'Verificación del quórum'
       ),
       'A-202',
       'no'
     ) $$,
  'se registra el voto de A-202'
);

-- Corregir un voto es revocar y volver a registrar, nunca editar el
-- original: se revoca el "sí" de A-201 y se registra su "abstención".
select lives_ok(
  $$ select conjuntos.revocar_voto_punto_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       (
         select voto.id from conjuntos.asamblea_votos as voto
         inner join conjuntos.unidades as unidad on unidad.id = voto.unidad_id
         where voto.punto_orden_dia_id = (
           select id from conjuntos.asamblea_orden_dia
           where asamblea_id = '66666666-a001-4001-8001-666666666666' and titulo = 'Verificación del quórum'
         )
         and unidad.codigo = 'A-201' and voto.revocado_en is null
       )
     ) $$,
  'la administración revoca el voto de A-201 para corregirlo'
);

select lives_ok(
  $$ select conjuntos.votar_punto_orden_dia_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '66666666-a001-4001-8001-666666666666' and titulo = 'Verificación del quórum'
       ),
       'A-201',
       'abstencion'
     ) $$,
  'A-201 vuelve a votar tras la revocación, ahora como abstención'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeee02","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.cerrar_votacion_punto_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '66666666-a001-4001-8001-666666666666' and titulo = 'Verificación del quórum'
       )
     ) $$,
  '42501',
  'Tu rol no permite cerrar la votación',
  'un residente no puede cerrar una votación'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01","role":"authenticated"}',
  true
);

-- Base "unidad": 0 sí, 1 no (A-202), 1 abstención (A-201) -> 0% de
-- aprobación sobre sí+no, por debajo del umbral de 50%.
select is(
  (
    conjuntos.cerrar_votacion_punto_demo(
      '66666666-6666-4666-8666-666666666666',
      '66666666-a001-4001-8001-666666666666',
      (
        select id from conjuntos.asamblea_orden_dia
        where asamblea_id = '66666666-a001-4001-8001-666666666666' and titulo = 'Verificación del quórum'
      )
    ) ->> 'approved'
  )::boolean,
  false,
  'el punto por unidad no queda aprobado: 0 sí contra 1 no'
);

select throws_ok(
  $$ select conjuntos.cerrar_votacion_punto_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '66666666-a001-4001-8001-666666666666' and titulo = 'Verificación del quórum'
       )
     ) $$,
  '55000',
  'La votación de este punto ya está cerrada',
  'no se cierra dos veces la votación del mismo punto'
);

select throws_ok(
  $$ select conjuntos.abrir_votacion_punto_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '66666666-a001-4001-8001-666666666666' and titulo = 'Verificación del quórum'
       )
     ) $$,
  '55000',
  'Este punto ya fue votado y no puede reabrirse',
  'un punto votado no puede reabrirse'
);

select throws_ok(
  $$ select conjuntos.votar_punto_orden_dia_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '66666666-a001-4001-8001-666666666666' and titulo = 'Verificación del quórum'
       ),
       'A-202',
       'si'
     ) $$,
  '55000',
  'La votación de este punto ya está cerrada',
  'no se registran votos en un punto ya cerrado'
);

-- Base "coeficiente": A-201 (40) y A-202 (60) votan sí -> 100% de
-- aprobación, por encima del umbral de 50%.
select lives_ok(
  $$ select conjuntos.abrir_votacion_punto_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '66666666-a001-4001-8001-666666666666' and titulo = 'Aprobación del presupuesto'
       )
     ) $$,
  'la administración abre la votación del punto por coeficiente'
);

select lives_ok(
  $$ select conjuntos.votar_punto_orden_dia_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '66666666-a001-4001-8001-666666666666' and titulo = 'Aprobación del presupuesto'
       ),
       'A-201',
       'si'
     ) $$,
  'A-201 vota sí en el punto por coeficiente'
);

select lives_ok(
  $$ select conjuntos.votar_punto_orden_dia_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '66666666-a001-4001-8001-666666666666' and titulo = 'Aprobación del presupuesto'
       ),
       'A-202',
       'si'
     ) $$,
  'A-202 vota sí en el punto por coeficiente'
);

select is(
  (
    conjuntos.cerrar_votacion_punto_demo(
      '66666666-6666-4666-8666-666666666666',
      '66666666-a001-4001-8001-666666666666',
      (
        select id from conjuntos.asamblea_orden_dia
        where asamblea_id = '66666666-a001-4001-8001-666666666666' and titulo = 'Aprobación del presupuesto'
      )
    ) ->> 'approved'
  )::boolean,
  true,
  'el punto por coeficiente queda aprobado: 100% del coeficiente vota sí'
);

-- Voto secreto: mientras el detalle por unidad permanece oculto, el
-- agregado sigue siendo visible para todos los roles.
select lives_ok(
  $$ select conjuntos.abrir_votacion_punto_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '66666666-a001-4001-8001-666666666666'
           and titulo = 'Punto para probar votación secreta'
       )
     ) $$,
  'la administración abre la votación del punto de prueba de voto secreto'
);

select lives_ok(
  $$ select conjuntos.votar_punto_orden_dia_demo(
       '66666666-6666-4666-8666-666666666666',
       '66666666-a001-4001-8001-666666666666',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '66666666-a001-4001-8001-666666666666'
           and titulo = 'Punto para probar votación secreta'
       ),
       'A-201',
       'si'
     ) $$,
  'se registra un voto en el punto de prueba de voto secreto'
);

reset role;
set local role postgres;
update conjuntos.conjuntos
set funcionalidades_asamblea = funcionalidades_asamblea || jsonb_build_object('secret_ballots', true)
where id = '66666666-6666-4666-8666-666666666666';

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01","role":"authenticated"}',
  true
);

select is(
  (
    select asamblea.item ->> 'roster'
    from jsonb_array_elements(
      conjuntos.listar_votaciones_asamblea_demo(
        '66666666-6666-4666-8666-666666666666',
        '66666666-a001-4001-8001-666666666666'
      )
    ) as asamblea(item)
    where asamblea.item ->> 'agendaItemId' = (
      select id::text from conjuntos.asamblea_orden_dia
      where asamblea_id = '66666666-a001-4001-8001-666666666666'
        and titulo = 'Punto para probar votación secreta'
    )
  ),
  null,
  'con voto secreto activo, ni la administración ve el detalle por unidad'
);

select is(
  (
    (
      select asamblea.item -> 'tally' ->> 'yesUnits'
      from jsonb_array_elements(
        conjuntos.listar_votaciones_asamblea_demo(
          '66666666-6666-4666-8666-666666666666',
          '66666666-a001-4001-8001-666666666666'
        )
      ) as asamblea(item)
      where asamblea.item ->> 'agendaItemId' = (
        select id::text from conjuntos.asamblea_orden_dia
        where asamblea_id = '66666666-a001-4001-8001-666666666666'
          and titulo = 'Punto para probar votación secreta'
      )
    )
  ),
  '1',
  'el agregado del punto secreto sigue siendo visible aunque el detalle esté oculto'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeee02","role":"authenticated"}',
  true
);

select is(
  (
    select jsonb_array_length(
      conjuntos.listar_votaciones_asamblea_demo(
        '66666666-6666-4666-8666-666666666666',
        '66666666-a001-4001-8001-666666666666'
      )
    )
  ),
  3,
  'un residente puede consultar las votaciones de los tres puntos votables'
);

select is(
  (
    select asamblea.item ->> 'roster'
    from jsonb_array_elements(
      conjuntos.listar_votaciones_asamblea_demo(
        '66666666-6666-4666-8666-666666666666',
        '66666666-a001-4001-8001-666666666666'
      )
    ) as asamblea(item)
    where asamblea.item ->> 'agendaItemId' = (
      select id::text from conjuntos.asamblea_orden_dia
      where asamblea_id = '66666666-a001-4001-8001-666666666666'
        and titulo = 'Aprobación del presupuesto'
    )
  ),
  null,
  'un residente nunca ve el detalle por unidad, incluso sin voto secreto'
);

-- Aislamiento entre conjuntos: el admin de este conjunto no pertenece a otro.
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeee01","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.votar_punto_orden_dia_demo(
       '11111111-1111-4111-8111-111111111111',
       '66666666-a001-4001-8001-666666666666',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '66666666-a001-4001-8001-666666666666'
           and titulo = 'Punto para probar votación secreta'
       ),
       'A-202',
       'si'
     ) $$,
  '42501',
  'Tu rol no permite registrar votos',
  'no se puede votar usando el conjunto equivocado'
);

reset role;
set local role postgres;

select is(
  (
    select count(*) from conjuntos.asamblea_votos
    where conjunto_id = '66666666-6666-4666-8666-666666666666' and revocado_en is null
  ),
  5::bigint,
  'quedan cinco votos activos: dos en el punto por unidad, dos en el de coeficiente y uno en el secreto'
);

select * from finish();
rollback;
