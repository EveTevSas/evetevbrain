begin;
set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

-- Fixtures autocontenidos y aislados de los demás archivos de tests: se
-- revierten al terminar la transacción.
truncate table conjuntos.conjuntos cascade;

insert into conjuntos.conjuntos (id, nombre)
values ('55555555-5555-4555-8555-555555555555', 'Conjunto Orden del Día')
on conflict (id) do nothing;

insert into conjuntos.miembros_conjunto (conjunto_id, usuario_id, rol)
values
  ('55555555-5555-4555-8555-555555555555', 'dddddddd-dddd-4ddd-8ddd-dddddddddd01', 'admin_conjunto'),
  ('55555555-5555-4555-8555-555555555555', 'dddddddd-dddd-4ddd-8ddd-dddddddddd02', 'residente'),
  ('55555555-5555-4555-8555-555555555555', 'dddddddd-dddd-4ddd-8ddd-dddddddddd03', 'consejo')
on conflict (conjunto_id, usuario_id) do nothing;

insert into conjuntos.asambleas (
  id, conjunto_id, titulo, tipo, modalidad, inicia_en, ubicacion, orden_del_dia, estado, creado_por_usuario_id
)
values
  (
    '55555555-a001-4001-8001-555555555555',
    '55555555-5555-4555-8555-555555555555',
    'Asamblea ordinaria programada',
    'ordinaria', 'presencial', '2026-12-15 19:00:00-05', 'Salón social',
    'Verificación del quórum y aprobación del orden del día.',
    'programada', 'dddddddd-dddd-4ddd-8ddd-dddddddddd01'
  ),
  (
    '55555555-a002-4002-8002-555555555555',
    '55555555-5555-4555-8555-555555555555',
    'Asamblea en curso',
    'ordinaria', 'presencial', '2026-11-15 19:00:00-05', 'Salón social',
    'Sesión en curso.',
    'en_curso', 'dddddddd-dddd-4ddd-8ddd-dddddddddd01'
  ),
  (
    '55555555-a003-4003-8003-555555555555',
    '55555555-5555-4555-8555-555555555555',
    'Asamblea extraordinaria programada',
    'extraordinaria', 'presencial', '2026-12-20 19:00:00-05', 'Salón social',
    'Aprobación de una cuota extraordinaria.',
    'programada', 'dddddddd-dddd-4ddd-8ddd-dddddddddd01'
  )
on conflict (id) do nothing;

-- La asamblea extraordinaria ya tiene una convocatoria enviada (un
-- destinatario en su dossier), lo que debe bloquear su orden del día.
insert into conjuntos.escenarios_demo (conjunto_id, snapshot)
values (
  '55555555-5555-4555-8555-555555555555',
  '{"assemblies":[{"id":"55555555-a003-4003-8003-555555555555","dossier":{"convocationRecipients":[{"personId":"x"}]}}],"audit":[]}'::jsonb
)
on conflict (conjunto_id) do nothing;

select plan(21);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddd02","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.agregar_punto_orden_dia_demo(
       '55555555-5555-4555-8555-555555555555',
       '55555555-a001-4001-8001-555555555555',
       'Aprobación del presupuesto 2027',
       'economica',
       'coeficiente',
       50
     ) $$,
  '42501',
  'Tu rol no permite editar el orden del día',
  'un residente no puede agregar puntos al orden del día'
);

select lives_ok(
  $$ select conjuntos.listar_orden_dia_demo(
       '55555555-5555-4555-8555-555555555555',
       '55555555-a001-4001-8001-555555555555'
     ) $$,
  'un residente puede consultar el orden del día'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"dddddddd-dddd-4ddd-8ddd-dddddddddd01","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.agregar_punto_orden_dia_demo(
       '55555555-5555-4555-8555-555555555555',
       '55555555-a001-4001-8001-555555555555',
       'Punto informativo con regla',
       'informativa',
       'unidad',
       null
     ) $$,
  '22023',
  'Los datos del punto no son válidos',
  'un punto informativo no admite regla de votación (constraint de tabla)'
);

select throws_ok(
  $$ select conjuntos.agregar_punto_orden_dia_demo(
       '55555555-5555-4555-8555-555555555555',
       '55555555-a001-4001-8001-555555555555',
       'Elección de órganos de administración',
       'calificada',
       'coeficiente_calificado',
       50
     ) $$,
  '22023',
  'Los datos del punto no son válidos',
  'una mayoría calificada exige un umbral superior al 50% (constraint de tabla)'
);

select lives_ok(
  $$ select conjuntos.agregar_punto_orden_dia_demo(
       '55555555-5555-4555-8555-555555555555',
       '55555555-a001-4001-8001-555555555555',
       'Verificación del quórum',
       'no_economica',
       'unidad',
       50
     ) $$,
  'la administración agrega el primer punto'
);

select lives_ok(
  $$ select conjuntos.agregar_punto_orden_dia_demo(
       '55555555-5555-4555-8555-555555555555',
       '55555555-a001-4001-8001-555555555555',
       'Aprobación del presupuesto 2027',
       'economica',
       'coeficiente',
       50
     ) $$,
  'la administración agrega el segundo punto'
);

select lives_ok(
  $$ select conjuntos.agregar_punto_orden_dia_demo(
       '55555555-5555-4555-8555-555555555555',
       '55555555-a001-4001-8001-555555555555',
       'Elección de órganos de administración',
       'calificada',
       'coeficiente_calificado',
       70
     ) $$,
  'la administración agrega el tercer punto con mayoría calificada'
);

select is(
  (
    select array_agg(punto.posicion order by punto.posicion)
    from conjuntos.asamblea_orden_dia as punto
    where punto.asamblea_id = '55555555-a001-4001-8001-555555555555'
  ),
  array[1, 2, 3],
  'los tres puntos quedan numerados en orden de creación'
);

select is(
  (
    (conjuntos.listar_orden_dia_demo(
       '55555555-5555-4555-8555-555555555555',
       '55555555-a001-4001-8001-555555555555'
     ) ->> 'locked')::boolean
  ),
  false,
  'una asamblea programada sin convocatoria no tiene el orden del día bloqueado'
);

-- Reordenar: invierte el orden de los tres puntos existentes.
select lives_ok(
  $$
    select conjuntos.reordenar_orden_dia_demo(
      '55555555-5555-4555-8555-555555555555',
      '55555555-a001-4001-8001-555555555555',
      (
        select array_agg(punto.id order by punto.posicion desc)
        from conjuntos.asamblea_orden_dia as punto
        where punto.asamblea_id = '55555555-a001-4001-8001-555555555555'
      )
    )
  $$,
  'la administración puede reordenar los puntos existentes'
);

select is(
  (
    select punto.titulo
    from conjuntos.asamblea_orden_dia as punto
    where punto.asamblea_id = '55555555-a001-4001-8001-555555555555'
      and punto.posicion = 1
  ),
  'Elección de órganos de administración',
  'reordenar reescribe la posición según el arreglo enviado'
);

select throws_ok(
  $$
    select conjuntos.reordenar_orden_dia_demo(
      '55555555-5555-4555-8555-555555555555',
      '55555555-a001-4001-8001-555555555555',
      array['00000000-0000-4000-8000-000000000000'::uuid]
    )
  $$,
  '22023',
  'El orden enviado no coincide con los puntos vigentes de la asamblea',
  'reordenar rechaza un arreglo que no coincide con los puntos vigentes'
);

select lives_ok(
  $$
    select conjuntos.actualizar_punto_orden_dia_demo(
      '55555555-5555-4555-8555-555555555555',
      '55555555-a001-4001-8001-555555555555',
      (
        select punto.id from conjuntos.asamblea_orden_dia as punto
        where punto.asamblea_id = '55555555-a001-4001-8001-555555555555' and punto.posicion = 3
      ),
      'Verificación del quórum y aprobación del orden del día',
      'no_economica',
      'unidad',
      50,
      'listo'
    )
  $$,
  'la administración puede editar un punto y marcarlo listo'
);

select lives_ok(
  $$
    select conjuntos.eliminar_punto_orden_dia_demo(
      '55555555-5555-4555-8555-555555555555',
      '55555555-a001-4001-8001-555555555555',
      (
        select punto.id from conjuntos.asamblea_orden_dia as punto
        where punto.asamblea_id = '55555555-a001-4001-8001-555555555555' and punto.posicion = 2
      )
    )
  $$,
  'la administración puede eliminar un punto'
);

select is(
  (
    select count(*) from conjuntos.asamblea_orden_dia
    where asamblea_id = '55555555-a001-4001-8001-555555555555'
  ),
  2::bigint,
  'quedan dos puntos tras la eliminación'
);

-- Asamblea en curso: el orden del día queda bloqueado para todos los cambios.
select throws_ok(
  $$ select conjuntos.agregar_punto_orden_dia_demo(
       '55555555-5555-4555-8555-555555555555',
       '55555555-a002-4002-8002-555555555555',
       'Punto tardío',
       'no_economica',
       'unidad',
       50
     ) $$,
  '55000',
  'El orden del día está bloqueado',
  'no se agregan puntos a una asamblea en curso'
);

select is(
  (
    (conjuntos.listar_orden_dia_demo(
       '55555555-5555-4555-8555-555555555555',
       '55555555-a002-4002-8002-555555555555'
     ) ->> 'lockedReason')
  ),
  'in_progress',
  'el motivo de bloqueo de una asamblea en curso es in_progress'
);

-- Asamblea extraordinaria con convocatoria ya enviada: bloqueada aunque siga
-- "programada".
select throws_ok(
  $$ select conjuntos.agregar_punto_orden_dia_demo(
       '55555555-5555-4555-8555-555555555555',
       '55555555-a003-4003-8003-555555555555',
       'Punto no anunciado',
       'no_economica',
       'unidad',
       50
     ) $$,
  '55000',
  'El orden del día está bloqueado',
  'una extraordinaria con convocatoria enviada no admite nuevos puntos'
);

select is(
  (
    (conjuntos.listar_orden_dia_demo(
       '55555555-5555-4555-8555-555555555555',
       '55555555-a003-4003-8003-555555555555'
     ) ->> 'lockedReason')
  ),
  'extraordinary_convocation_sent',
  'el motivo de bloqueo de la extraordinaria es extraordinary_convocation_sent'
);

-- Aislamiento entre conjuntos: el admin de este conjunto no pertenece a otro.
select throws_ok(
  $$ select conjuntos.agregar_punto_orden_dia_demo(
       '11111111-1111-4111-8111-111111111111',
       '55555555-a001-4001-8001-555555555555',
       'Punto de otro conjunto',
       'no_economica',
       'unidad',
       50
     ) $$,
  '42501',
  'Tu rol no permite editar el orden del día',
  'no se puede agregar un punto usando el conjunto equivocado'
);

reset role;
set local role postgres;

select is(
  (
    select count(*) from conjuntos.asamblea_orden_dia
    where asamblea_id in (
      '55555555-a002-4002-8002-555555555555',
      '55555555-a003-4003-8003-555555555555'
    )
  ),
  0::bigint,
  'ningún punto quedó registrado en las asambleas bloqueadas'
);

select * from finish();
rollback;
