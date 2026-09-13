begin;
set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

-- Fixtures autocontenidos y aislados de los demás archivos de tests: se
-- revierten al terminar la transacción.
truncate table conjuntos.conjuntos cascade;

insert into conjuntos.conjuntos (id, nombre)
values ('77777777-7777-4777-8777-777777777777', 'Conjunto Acta')
on conflict (id) do nothing;

insert into conjuntos.miembros_conjunto (conjunto_id, usuario_id, rol)
values
  ('77777777-7777-4777-8777-777777777777', 'ffffffff-ffff-4fff-8fff-ffffffffff01', 'admin_conjunto'),
  ('77777777-7777-4777-8777-777777777777', 'ffffffff-ffff-4fff-8fff-ffffffffff02', 'residente')
on conflict (conjunto_id, usuario_id) do nothing;

insert into conjuntos.unidades (id, conjunto_id, codigo, tipo, coeficiente)
values
  ('77777777-0001-4001-8001-777777777777', '77777777-7777-4777-8777-777777777777', 'A-301', 'apartamento', 50.000000),
  ('77777777-0002-4002-8002-777777777777', '77777777-7777-4777-8777-777777777777', 'A-302', 'apartamento', 50.000000)
on conflict (id) do nothing;

insert into conjuntos.personas (id, conjunto_id, nombre)
values
  ('77777777-1001-4001-8001-777777777777', '77777777-7777-4777-8777-777777777777', 'Propietario A-301'),
  ('77777777-1002-4002-8002-777777777777', '77777777-7777-4777-8777-777777777777', 'Propietario A-302'),
  ('77777777-1003-4003-8003-777777777777', '77777777-7777-4777-8777-777777777777', 'Sin acreditación')
on conflict (id) do nothing;

insert into conjuntos.personas_unidades (
  id, conjunto_id, persona_id, unidad_id, relacion, responsable_pago, vigente_desde
)
values
  (
    '77777777-2001-4001-8001-777777777777',
    '77777777-7777-4777-8777-777777777777',
    '77777777-1001-4001-8001-777777777777',
    '77777777-0001-4001-8001-777777777777',
    'propietario', true, '2026-01-01'
  ),
  (
    '77777777-2002-4002-8002-777777777777',
    '77777777-7777-4777-8777-777777777777',
    '77777777-1002-4002-8002-777777777777',
    '77777777-0002-4002-8002-777777777777',
    'propietario', true, '2026-01-01'
  )
on conflict (id) do nothing;

insert into conjuntos.asambleas (
  id, conjunto_id, titulo, tipo, modalidad, inicia_en, ubicacion, orden_del_dia, estado, creado_por_usuario_id
)
values (
  '77777777-a001-4001-8001-777777777777',
  '77777777-7777-4777-8777-777777777777',
  'Asamblea de acta',
  'ordinaria', 'presencial', '2026-12-15 19:00:00-05', 'Salón social',
  'Verificación del quórum y aprobación del orden del día.',
  'programada', 'ffffffff-ffff-4fff-8fff-ffffffffff01'
)
on conflict (id) do nothing;

select plan(36);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff01","role":"authenticated"}',
  true
);

-- El punto votable se agrega mientras la asamblea sigue "programada" (el
-- orden del día queda bloqueado en cuanto la asamblea está en curso).
select lives_ok(
  $$ select conjuntos.agregar_punto_orden_dia_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777',
       'Verificación del quórum',
       'no_economica',
       'unidad',
       50
     ) $$,
  'la administración agrega el punto votable antes de iniciar la asamblea'
);

select lives_ok(
  $$ select conjuntos.acreditar_asistente_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777',
       'propietario',
       '77777777-1001-4001-8001-777777777777',
       'A-301'
     ) $$,
  'se acredita al propietario de A-301'
);

select lives_ok(
  $$ select conjuntos.acreditar_asistente_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777',
       'propietario',
       '77777777-1002-4002-8002-777777777777',
       'A-302'
     ) $$,
  'se acredita al propietario de A-302'
);

select throws_ok(
  $$ select conjuntos.guardar_acta_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777',
       '77777777-1001-4001-8001-777777777777',
       '77777777-1002-4002-8002-777777777777',
       'Resumen de prueba con al menos veinte caracteres.'
     ) $$,
  '55000',
  'El acta se redacta después de iniciar la asamblea',
  'no se redacta un acta mientras la asamblea sigue programada'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff02","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.iniciar_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777'
     ) $$,
  '42501',
  'Tu rol no permite iniciar la asamblea',
  'un residente no puede iniciar la asamblea'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff01","role":"authenticated"}',
  true
);

select lives_ok(
  $$ select conjuntos.iniciar_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777'
     ) $$,
  'la administración inicia la asamblea'
);

select throws_ok(
  $$ select conjuntos.iniciar_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777'
     ) $$,
  '55000',
  'Solo una asamblea programada puede iniciarse',
  'no se inicia dos veces la misma asamblea'
);

select lives_ok(
  $$ select conjuntos.abrir_votacion_punto_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '77777777-a001-4001-8001-777777777777'
       )
     ) $$,
  'la administración abre la votación del punto único'
);

select throws_ok(
  $$ select conjuntos.cerrar_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777'
     ) $$,
  '55000',
  'Hay una votación abierta: ciérrala antes de cerrar la asamblea',
  'no se cierra la asamblea con una votación abierta'
);

select lives_ok(
  $$ select conjuntos.cerrar_votacion_punto_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777',
       (
         select id from conjuntos.asamblea_orden_dia
         where asamblea_id = '77777777-a001-4001-8001-777777777777'
       )
     ) $$,
  'se cierra la votación del punto único'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff02","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.cerrar_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777'
     ) $$,
  '42501',
  'Tu rol no permite cerrar la asamblea',
  'un residente no puede cerrar la asamblea'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff01","role":"authenticated"}',
  true
);

select lives_ok(
  $$ select conjuntos.cerrar_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777'
     ) $$,
  'la administración cierra la asamblea sin votaciones abiertas'
);

select throws_ok(
  $$ select conjuntos.cerrar_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777'
     ) $$,
  '55000',
  'Solo una asamblea en curso puede cerrarse',
  'no se cierra dos veces la misma asamblea'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff02","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.guardar_acta_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777',
       '77777777-1001-4001-8001-777777777777',
       '77777777-1002-4002-8002-777777777777',
       'Resumen de prueba con al menos veinte caracteres.'
     ) $$,
  '42501',
  'Tu rol no permite editar el acta',
  'un residente no puede redactar el acta'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff01","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.guardar_acta_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777',
       '77777777-1001-4001-8001-777777777777',
       '77777777-1001-4001-8001-777777777777',
       'Resumen de prueba con al menos veinte caracteres.'
     ) $$,
  '22023',
  'Presidencia y secretaría deben ser personas distintas',
  'presidencia y secretaría no pueden ser la misma persona'
);

select throws_ok(
  $$ select conjuntos.guardar_acta_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777',
       '77777777-1001-4001-8001-777777777777',
       '77777777-1002-4002-8002-777777777777',
       'Muy corto'
     ) $$,
  '22023',
  'El resumen debe tener al menos 20 caracteres',
  'el resumen exige un mínimo de contenido'
);

select throws_ok(
  $$ select conjuntos.guardar_acta_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777',
       '77777777-1003-4003-8003-777777777777',
       '77777777-1002-4002-8002-777777777777',
       'Resumen de prueba con al menos veinte caracteres.'
     ) $$,
  '22023',
  'La presidencia debe tener una acreditación activa en esta asamblea',
  'la presidencia debe estar acreditada en la asamblea'
);

select throws_ok(
  $$ select conjuntos.guardar_acta_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777',
       '77777777-1001-4001-8001-777777777777',
       '77777777-1003-4003-8003-777777777777',
       'Resumen de prueba con al menos veinte caracteres.'
     ) $$,
  '22023',
  'La secretaría debe tener una acreditación activa en esta asamblea',
  'la secretaría debe estar acreditada en la asamblea'
);

select is(
  (
    conjuntos.guardar_acta_asamblea_demo(
      '77777777-7777-4777-8777-777777777777',
      '77777777-a001-4001-8001-777777777777',
      '77777777-1001-4001-8001-777777777777',
      '77777777-1002-4002-8002-777777777777',
      'Resumen de prueba con al menos veinte caracteres.'
    ) ->> 'version'
  )::int,
  1,
  'el primer guardado del acta queda en versión 1'
);

select is(
  (
    conjuntos.guardar_acta_asamblea_demo(
      '77777777-7777-4777-8777-777777777777',
      '77777777-a001-4001-8001-777777777777',
      '77777777-1001-4001-8001-777777777777',
      '77777777-1002-4002-8002-777777777777',
      'Resumen de prueba corregido con al menos veinte caracteres.'
    ) ->> 'version'
  )::int,
  2,
  'un segundo guardado del mismo acta incrementa la versión'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff02","role":"authenticated"}',
  true
);

select is(
  (
    conjuntos.obtener_acta_asamblea_demo(
      '77777777-7777-4777-8777-777777777777',
      '77777777-a001-4001-8001-777777777777'
    ) -> 'minutes'
  ),
  'null'::jsonb,
  'un residente no ve el acta en borrador antes de publicarse'
);

select throws_ok(
  $$ select conjuntos.firmar_acta_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777'
     ) $$,
  '42501',
  'Tu rol no permite firmar el acta',
  'un residente no puede firmar el acta'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff01","role":"authenticated"}',
  true
);

select lives_ok(
  $$ select conjuntos.firmar_acta_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777'
     ) $$,
  'la administración firma el acta con la asamblea ya cerrada'
);

select throws_ok(
  $$ select conjuntos.guardar_acta_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777',
       '77777777-1001-4001-8001-777777777777',
       '77777777-1002-4002-8002-777777777777',
       'Intento de edición tras la firma con veinte caracteres.'
     ) $$,
  '55000',
  'El acta ya fue firmada y no puede editarse',
  'un acta firmada no puede volver a guardarse'
);

select throws_ok(
  $$ select conjuntos.firmar_acta_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777'
     ) $$,
  '55000',
  'El acta ya está firmada',
  'no se firma dos veces la misma acta'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff02","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.publicar_acta_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777'
     ) $$,
  '42501',
  'Tu rol no permite publicar el acta',
  'un residente no puede publicar el acta'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff01","role":"authenticated"}',
  true
);

select lives_ok(
  $$ select conjuntos.publicar_acta_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777'
     ) $$,
  'la administración publica el acta firmada'
);

select throws_ok(
  $$ select conjuntos.publicar_acta_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '77777777-a001-4001-8001-777777777777'
     ) $$,
  '55000',
  'El acta debe estar firmada antes de publicarse',
  'no se publica dos veces la misma acta'
);

select throws_ok(
  $$ select conjuntos.guardar_acta_asamblea_demo(
       '11111111-1111-4111-8111-111111111111',
       '77777777-a001-4001-8001-777777777777',
       '77777777-1001-4001-8001-777777777777',
       '77777777-1002-4002-8002-777777777777',
       'Intento con el conjunto equivocado y veinte caracteres.'
     ) $$,
  '42501',
  'Tu rol no permite editar el acta',
  'no se guarda un acta usando el conjunto equivocado'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff02","role":"authenticated"}',
  true
);

select is(
  (
    conjuntos.obtener_acta_asamblea_demo(
      '77777777-7777-4777-8777-777777777777',
      '77777777-a001-4001-8001-777777777777'
    ) -> 'minutes' ->> 'status'
  ),
  'published',
  'un residente ve el acta ya publicada'
);

select is(
  (
    jsonb_array_length(
      conjuntos.obtener_acta_asamblea_demo(
        '77777777-7777-4777-8777-777777777777',
        '77777777-a001-4001-8001-777777777777'
      ) -> 'attendees'
    )
  ),
  2,
  'el acta publicada expone a los dos asistentes acreditados'
);

select is(
  (
    jsonb_array_length(
      conjuntos.obtener_acta_asamblea_demo(
        '77777777-7777-4777-8777-777777777777',
        '77777777-a001-4001-8001-777777777777'
      ) -> 'agendaItems'
    )
  ),
  1,
  'el acta publicada expone el punto del orden del día con su resultado'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff01","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.guardar_acta_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '00000000-0000-4000-8000-000000000000',
       '77777777-1001-4001-8001-777777777777',
       '77777777-1002-4002-8002-777777777777',
       'Asamblea inexistente pero con veinte caracteres.'
     ) $$,
  'P0002',
  'La asamblea no existe en esta copropiedad',
  'no se guarda un acta sobre una asamblea inexistente'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff01","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.firmar_acta_asamblea_demo(
       '77777777-7777-4777-8777-777777777777',
       '00000000-0000-4000-8000-000000000000'
     ) $$,
  'P0002',
  'El acta no existe: guárdala antes de firmarla',
  'no se firma un acta inexistente'
);

reset role;
set local role postgres;

select is(
  (
    select count(*) from conjuntos.asamblea_actas
    where conjunto_id = '77777777-7777-4777-8777-777777777777'
  ),
  1::bigint,
  'queda exactamente una acta para la asamblea'
);

select is(
  (select version from conjuntos.asamblea_actas where asamblea_id = '77777777-a001-4001-8001-777777777777'),
  2,
  'la versión final del acta refleja los dos guardados en borrador'
);

select * from finish();
rollback;
