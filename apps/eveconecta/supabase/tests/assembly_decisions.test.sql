begin;
set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

-- Fixtures autocontenidos y aislados de los demás archivos de tests: se
-- revierten al terminar la transacción.
truncate table conjuntos.conjuntos cascade;

insert into conjuntos.conjuntos (id, nombre)
values ('88888888-8888-4888-8888-888888888888', 'Conjunto Decisiones')
on conflict (id) do nothing;

insert into conjuntos.miembros_conjunto (conjunto_id, usuario_id, rol)
values
  ('88888888-8888-4888-8888-888888888888', 'ffffffff-ffff-4fff-8fff-ffffffffff01', 'admin_conjunto'),
  ('88888888-8888-4888-8888-888888888888', 'ffffffff-ffff-4fff-8fff-ffffffffff02', 'residente'),
  ('88888888-8888-4888-8888-888888888888', 'ffffffff-ffff-4fff-8fff-ffffffffff03', 'consejo')
on conflict (conjunto_id, usuario_id) do nothing;

insert into conjuntos.unidades (id, conjunto_id, codigo, tipo, coeficiente)
values
  ('88888888-0001-4001-8001-888888888888', '88888888-8888-4888-8888-888888888888', 'B-101', 'apartamento', 50.000000),
  ('88888888-0002-4002-8002-888888888888', '88888888-8888-4888-8888-888888888888', 'B-102', 'apartamento', 50.000000)
on conflict (id) do nothing;

insert into conjuntos.personas (id, conjunto_id, nombre)
values
  ('88888888-1001-4001-8001-888888888888', '88888888-8888-4888-8888-888888888888', 'Propietario B-101'),
  ('88888888-1002-4002-8002-888888888888', '88888888-8888-4888-8888-888888888888', 'Propietario B-102'),
  ('88888888-1003-4003-8003-888888888888', '88888888-8888-4888-8888-888888888888', 'Sin acreditación')
on conflict (id) do nothing;

insert into conjuntos.personas_unidades (
  id, conjunto_id, persona_id, unidad_id, relacion, responsable_pago, vigente_desde
)
values
  (
    '88888888-2001-4001-8001-888888888888',
    '88888888-8888-4888-8888-888888888888',
    '88888888-1001-4001-8001-888888888888',
    '88888888-0001-4001-8001-888888888888',
    'propietario', true, '2026-01-01'
  ),
  (
    '88888888-2002-4002-8002-888888888888',
    '88888888-8888-4888-8888-888888888888',
    '88888888-1002-4002-8002-888888888888',
    '88888888-0002-4002-8002-888888888888',
    'propietario', true, '2026-01-01'
  )
on conflict (id) do nothing;

-- La asamblea arranca "programada" a propósito: la primera prueba verifica
-- que las decisiones solo pueden crearse una vez que cerró.
insert into conjuntos.asambleas (
  id, conjunto_id, titulo, tipo, modalidad, inicia_en, ubicacion, orden_del_dia, estado, creado_por_usuario_id
)
values (
  '88888888-a001-4001-8001-888888888888',
  '88888888-8888-4888-8888-888888888888',
  'Asamblea de decisiones',
  'ordinaria', 'presencial', '2026-12-15 19:00:00-05', 'Salón social',
  'Aprobación del balance y elección del consejo.',
  'programada', 'ffffffff-ffff-4fff-8fff-ffffffffff01'
)
on conflict (id) do nothing;

insert into conjuntos.asamblea_orden_dia (
  conjunto_id, asamblea_id, posicion, titulo, tipo_decision, regla_votacion, estado, creado_por_usuario_id
)
values (
  '88888888-8888-4888-8888-888888888888',
  '88888888-a001-4001-8001-888888888888',
  1, 'Aprobación del balance financiero', 'informativa', 'ninguna', 'borrador',
  'ffffffff-ffff-4fff-8fff-ffffffffff01'
);

-- Acreditaciones insertadas directamente (la RPC de acreditación rechaza una
-- asamblea "cerrada", pero para este archivo solo importa que ya existan):
-- persona 1001 y 1002 quedan acreditadas, 1003 se deja sin acreditar a
-- propósito para probar el rechazo del responsable sin acreditación.
insert into conjuntos.asamblea_acreditaciones (
  conjunto_id, asamblea_id, unidad_id, persona_id, calidad, coeficiente_aplicado, acreditado_por_usuario_id
)
values
  (
    '88888888-8888-4888-8888-888888888888', '88888888-a001-4001-8001-888888888888',
    '88888888-0001-4001-8001-888888888888', '88888888-1001-4001-8001-888888888888',
    'propietario', 50.000000, 'ffffffff-ffff-4fff-8fff-ffffffffff01'
  ),
  (
    '88888888-8888-4888-8888-888888888888', '88888888-a001-4001-8001-888888888888',
    '88888888-0002-4002-8002-888888888888', '88888888-1002-4002-8002-888888888888',
    'propietario', 50.000000, 'ffffffff-ffff-4fff-8fff-ffffffffff01'
  );

select plan(44);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff01","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.crear_decision_asamblea_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       null,
       'Publicar el balance financiero aprobado',
       '88888888-1001-4001-8001-888888888888',
       '2027-01-15'
     ) $$,
  '55000',
  'Las decisiones se crean después de cerrar la asamblea',
  'no se crea una decisión mientras la asamblea sigue programada'
);

reset role;
set local role postgres;
update conjuntos.asambleas set estado = 'cerrada'
where id = '88888888-a001-4001-8001-888888888888';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff01","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.crear_decision_asamblea_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       null,
       'Publicar el balance financiero aprobado',
       '88888888-1001-4001-8001-888888888888',
       '2027-01-15'
     ) $$,
  '55000',
  'El acta debe estar firmada antes de asignar decisiones',
  'no se crea una decisión sin acta'
);

reset role;
set local role postgres;
insert into conjuntos.asamblea_actas (
  conjunto_id, asamblea_id, presidente_persona_id, secretario_persona_id, resumen, creado_por_usuario_id
)
values (
  '88888888-8888-4888-8888-888888888888',
  '88888888-a001-4001-8001-888888888888',
  '88888888-1001-4001-8001-888888888888',
  '88888888-1002-4002-8002-888888888888',
  'Resumen de prueba con al menos veinte caracteres.',
  'ffffffff-ffff-4fff-8fff-ffffffffff01'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff01","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.crear_decision_asamblea_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       null,
       'Publicar el balance financiero aprobado',
       '88888888-1001-4001-8001-888888888888',
       '2027-01-15'
     ) $$,
  '55000',
  'El acta debe estar firmada antes de asignar decisiones',
  'no se crea una decisión mientras el acta sigue en borrador'
);

reset role;
set local role postgres;
update conjuntos.asamblea_actas set estado = 'firmada', firmada_en = now()
where asamblea_id = '88888888-a001-4001-8001-888888888888';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff02","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.crear_decision_asamblea_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       null,
       'Publicar el balance financiero aprobado',
       '88888888-1001-4001-8001-888888888888',
       '2027-01-15'
     ) $$,
  '42501',
  'Tu rol no permite crear decisiones',
  'un residente no puede crear decisiones'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff03","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.crear_decision_asamblea_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       null,
       'Publicar el balance financiero aprobado',
       '88888888-1001-4001-8001-888888888888',
       '2027-01-15'
     ) $$,
  '42501',
  'Tu rol no permite crear decisiones',
  'el consejo supervisa pero no crea decisiones'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff01","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.crear_decision_asamblea_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       null,
       'Mini',
       '88888888-1001-4001-8001-888888888888',
       '2027-01-15'
     ) $$,
  '22023',
  'El título debe tener al menos 5 caracteres',
  'el título exige un mínimo de contenido'
);

select throws_ok(
  $$ select conjuntos.crear_decision_asamblea_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       null,
       repeat('x', 201),
       '88888888-1001-4001-8001-888888888888',
       '2027-01-15'
     ) $$,
  '22023',
  'El título no puede superar los 200 caracteres',
  'el título también tiene un máximo de contenido'
);

select throws_ok(
  $$ select conjuntos.crear_decision_asamblea_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       null,
       'Publicar el balance financiero aprobado',
       '88888888-1003-4003-8003-888888888888',
       '2027-01-15'
     ) $$,
  '22023',
  'El responsable debe tener una acreditación activa en esta asamblea',
  'el responsable debe estar acreditado en la asamblea'
);

select throws_ok(
  $$ select conjuntos.crear_decision_asamblea_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       '00000000-0000-4000-8000-000000000000',
       'Publicar el balance financiero aprobado',
       '88888888-1001-4001-8001-888888888888',
       '2027-01-15'
     ) $$,
  '22023',
  'El punto del orden del día no pertenece a esta asamblea',
  'el punto de origen debe pertenecer a la misma asamblea'
);

select is(
  (
    conjuntos.crear_decision_asamblea_demo(
      '88888888-8888-4888-8888-888888888888',
      '88888888-a001-4001-8001-888888888888',
      (
        select id from conjuntos.asamblea_orden_dia
        where asamblea_id = '88888888-a001-4001-8001-888888888888'
      ),
      'Publicar el balance financiero aprobado',
      '88888888-1001-4001-8001-888888888888',
      '2027-01-15'
    ) ->> 'status'
  ),
  'pending',
  'la primera decisión queda pendiente con su punto de origen'
);

select is(
  (
    conjuntos.crear_decision_asamblea_demo(
      '88888888-8888-4888-8888-888888888888',
      '88888888-a001-4001-8001-888888888888',
      null,
      'Formalizar acuerdo de mantenimiento',
      '88888888-1002-4002-8002-888888888888',
      '2027-02-01'
    ) ->> 'status'
  ),
  'pending',
  'la segunda decisión queda pendiente sin punto de origen'
);

select is(
  (
    conjuntos.crear_decision_asamblea_demo(
      '88888888-8888-4888-8888-888888888888',
      '88888888-a001-4001-8001-888888888888',
      null,
      'Repartir actas a la copropiedad',
      '88888888-1001-4001-8001-888888888888',
      '2027-02-10'
    ) ->> 'status'
  ),
  'pending',
  'la tercera decisión queda pendiente'
);

-- Se capturan los tres ids en una tabla temporal sin RLS: la política de
-- "asamblea_decisiones_seleccionar" les tapa la fila al consejo y al
-- residente antes de que el acta se publique, así que resolver el id por
-- título bajo su propio rol devolvería null. Los pasos siguientes consultan
-- esta tabla en vez de la real.
reset role;
set local role postgres;
create temporary table pgtap_decision_ids (etiqueta text primary key, id uuid not null);
grant select on pgtap_decision_ids to authenticated;
insert into pgtap_decision_ids (etiqueta, id)
select 'decision1', id from conjuntos.asamblea_decisiones
where titulo = 'Publicar el balance financiero aprobado'
union all
select 'decision2', id from conjuntos.asamblea_decisiones
where titulo = 'Formalizar acuerdo de mantenimiento'
union all
select 'decision3', id from conjuntos.asamblea_decisiones
where titulo = 'Repartir actas a la copropiedad';

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff02","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.actualizar_decision_asamblea_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       (select id from pgtap_decision_ids where etiqueta = 'decision1'),
       'Publicar el balance financiero aprobado y firmado',
       '88888888-1001-4001-8001-888888888888',
       '2027-01-20'
     ) $$,
  '42501',
  'Tu rol no permite editar decisiones',
  'un residente no puede editar una decisión'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff03","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.actualizar_decision_asamblea_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       (select id from pgtap_decision_ids where etiqueta = 'decision1'),
       'Publicar el balance financiero aprobado y firmado',
       '88888888-1001-4001-8001-888888888888',
       '2027-01-20'
     ) $$,
  '42501',
  'Tu rol no permite editar decisiones',
  'el consejo supervisa el avance pero no edita los datos de una decisión'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff01","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.actualizar_decision_asamblea_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       (select id from pgtap_decision_ids where etiqueta = 'decision1'),
       'Mini',
       '88888888-1001-4001-8001-888888888888',
       '2027-01-20'
     ) $$,
  '22023',
  'El título debe tener al menos 5 caracteres',
  'la edición también exige un título válido'
);

select throws_ok(
  $$ select conjuntos.actualizar_decision_asamblea_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       (select id from pgtap_decision_ids where etiqueta = 'decision1'),
       repeat('x', 201),
       '88888888-1001-4001-8001-888888888888',
       '2027-01-20'
     ) $$,
  '22023',
  'El título no puede superar los 200 caracteres',
  'la edición también tiene un máximo de contenido'
);

select throws_ok(
  $$ select conjuntos.actualizar_decision_asamblea_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       (select id from pgtap_decision_ids where etiqueta = 'decision1'),
       'Publicar el balance financiero aprobado y firmado',
       '88888888-1003-4003-8003-888888888888',
       '2027-01-20'
     ) $$,
  '22023',
  'El responsable debe tener una acreditación activa en esta asamblea',
  'la edición también exige un responsable acreditado'
);

select lives_ok(
  $$ select conjuntos.actualizar_decision_asamblea_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       (select id from pgtap_decision_ids where etiqueta = 'decision1'),
       'Publicar el balance financiero aprobado y firmado',
       '88888888-1002-4002-8002-888888888888',
       '2027-01-20'
     ) $$,
  'la administración edita título, responsable y fecha antes de completarla'
);

reset role;
set local role postgres;

select is(
  (
    select responsable_persona_id::text
    from conjuntos.asamblea_decisiones
    where titulo = 'Publicar el balance financiero aprobado y firmado'
  ),
  '88888888-1002-4002-8002-888888888888',
  'la edición sí quedó persistida con el nuevo responsable'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff01","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.actualizar_decision_asamblea_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       '00000000-0000-4000-8000-000000000000',
       'Un título cualquiera con contenido',
       '88888888-1001-4001-8001-888888888888',
       '2027-01-20'
     ) $$,
  'P0002',
  'La decisión no existe en esta asamblea',
  'no se edita una decisión inexistente'
);

select throws_ok(
  $$ select conjuntos.actualizar_estado_decision_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       (select id from pgtap_decision_ids where etiqueta = 'decision2'),
       'bogus'
     ) $$,
  '22023',
  'El estado indicado no es válido',
  'el nuevo estado debe pertenecer al enum de estados'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff02","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.actualizar_estado_decision_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       (select id from pgtap_decision_ids where etiqueta = 'decision2'),
       'en_progreso'
     ) $$,
  '42501',
  'Tu rol no permite actualizar decisiones',
  'un residente no puede supervisar el avance de una decisión'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff03","role":"authenticated"}',
  true
);

select is(
  (
    conjuntos.actualizar_estado_decision_demo(
      '88888888-8888-4888-8888-888888888888',
      '88888888-a001-4001-8001-888888888888',
      (select id from pgtap_decision_ids where etiqueta = 'decision2'),
      'en_progreso'
    ) ->> 'status'
  ),
  'in_progress',
  'el consejo avanza una decisión a en progreso'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff01","role":"authenticated"}',
  true
);

select is(
  (
    conjuntos.actualizar_estado_decision_demo(
      '88888888-8888-4888-8888-888888888888',
      '88888888-a001-4001-8001-888888888888',
      (select id from pgtap_decision_ids where etiqueta = 'decision2'),
      'completada'
    ) ->> 'status'
  ),
  'completed',
  'la administración marca la decisión como completada'
);

select throws_ok(
  $$ select conjuntos.actualizar_estado_decision_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       (select id from pgtap_decision_ids where etiqueta = 'decision2'),
       'pendiente'
     ) $$,
  '55000',
  'Una decisión completada no puede cambiar de estado',
  'una decisión completada es un estado terminal'
);

select throws_ok(
  $$ select conjuntos.actualizar_decision_asamblea_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       (select id from pgtap_decision_ids where etiqueta = 'decision2'),
       'Formalizar acuerdo de mantenimiento anual',
       '88888888-1002-4002-8002-888888888888',
       '2027-02-01'
     ) $$,
  '55000',
  'Una decisión completada no puede editarse',
  'una decisión completada tampoco acepta ediciones de sus datos'
);

select throws_ok(
  $$ select conjuntos.eliminar_decision_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       (select id from pgtap_decision_ids where etiqueta = 'decision2')
     ) $$,
  '55000',
  'Una decisión completada no puede eliminarse',
  'una decisión completada tampoco puede eliminarse'
);

select throws_ok(
  $$ select conjuntos.actualizar_estado_decision_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       '00000000-0000-4000-8000-000000000000',
       'en_progreso'
     ) $$,
  'P0002',
  'La decisión no existe en esta asamblea',
  'no se cambia el estado de una decisión inexistente'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff02","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.adjuntar_evidencia_decision_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       (select id from pgtap_decision_ids where etiqueta = 'decision2'),
       'https://evidencia.example/foto.jpg'
     ) $$,
  '42501',
  'Tu rol no permite registrar evidencia',
  'un residente no registra evidencia'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff03","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.adjuntar_evidencia_decision_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       (select id from pgtap_decision_ids where etiqueta = 'decision2'),
       'https://evidencia.example/foto.jpg'
     ) $$,
  '42501',
  'Tu rol no permite registrar evidencia',
  'el consejo supervisa el avance pero no registra evidencia'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff01","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.adjuntar_evidencia_decision_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       (select id from pgtap_decision_ids where etiqueta = 'decision2'),
       '   '
     ) $$,
  '22023',
  'La evidencia no puede estar vacía',
  'la evidencia no puede quedar en blanco'
);

select is(
  (
    conjuntos.adjuntar_evidencia_decision_demo(
      '88888888-8888-4888-8888-888888888888',
      '88888888-a001-4001-8001-888888888888',
      (select id from pgtap_decision_ids where etiqueta = 'decision2'),
      'https://evidencia.example/foto.jpg'
    ) ->> 'id'
  ),
  (select id::text from conjuntos.asamblea_decisiones where titulo = 'Formalizar acuerdo de mantenimiento'),
  'la evidencia sí puede registrarse aunque la decisión ya esté completada'
);

select throws_ok(
  $$ select conjuntos.adjuntar_evidencia_decision_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       '00000000-0000-4000-8000-000000000000',
       'https://evidencia.example/foto.jpg'
     ) $$,
  'P0002',
  'La decisión no existe en esta asamblea',
  'no se registra evidencia de una decisión inexistente'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff02","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.eliminar_decision_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       (select id from pgtap_decision_ids where etiqueta = 'decision3')
     ) $$,
  '42501',
  'Tu rol no permite eliminar decisiones',
  'un residente no puede eliminar una decisión'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff03","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.eliminar_decision_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       (select id from pgtap_decision_ids where etiqueta = 'decision3')
     ) $$,
  '42501',
  'Tu rol no permite eliminar decisiones',
  'el consejo supervisa el avance pero no elimina decisiones'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff01","role":"authenticated"}',
  true
);

select is(
  (
    conjuntos.eliminar_decision_demo(
      '88888888-8888-4888-8888-888888888888',
      '88888888-a001-4001-8001-888888888888',
      (select id from pgtap_decision_ids where etiqueta = 'decision3')
    ) ->> 'id'
  ) is not null,
  true,
  'la administración elimina una decisión pendiente sin evidencia'
);

select throws_ok(
  $$ select conjuntos.eliminar_decision_demo(
       '88888888-8888-4888-8888-888888888888',
       '88888888-a001-4001-8001-888888888888',
       '00000000-0000-4000-8000-000000000000'
     ) $$,
  'P0002',
  'La decisión no existe en esta asamblea',
  'no se elimina una decisión inexistente'
);

select throws_ok(
  $$ select conjuntos.crear_decision_asamblea_demo(
       '11111111-1111-4111-8111-111111111111',
       '88888888-a001-4001-8001-888888888888',
       null,
       'Intento con el conjunto equivocado',
       '88888888-1001-4001-8001-888888888888',
       '2027-03-01'
     ) $$,
  '42501',
  'Tu rol no permite crear decisiones',
  'no se crea una decisión usando el conjunto equivocado'
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
    conjuntos.listar_decisiones_asamblea_demo(
      '88888888-8888-4888-8888-888888888888',
      '88888888-a001-4001-8001-888888888888'
    ) -> 'decisions'
  ),
  '[]'::jsonb,
  'un residente no ve decisiones antes de publicarse el acta'
);

reset role;
set local role postgres;
update conjuntos.asamblea_actas set estado = 'publicada', publicada_en = now()
where asamblea_id = '88888888-a001-4001-8001-888888888888';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff02","role":"authenticated"}',
  true
);

select is(
  (
    jsonb_array_length(
      conjuntos.listar_decisiones_asamblea_demo(
        '88888888-8888-4888-8888-888888888888',
        '88888888-a001-4001-8001-888888888888'
      ) -> 'decisions'
    )
  ),
  2,
  'un residente ve las decisiones restantes una vez publicada el acta'
);

select is(
  (
    jsonb_array_length(
      conjuntos.listar_decisiones_asamblea_demo(
        '88888888-8888-4888-8888-888888888888',
        '88888888-a001-4001-8001-888888888888'
      ) -> 'attendees'
    )
  ),
  0,
  'un residente no recibe la lista de asistentes al consultar decisiones'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ffffffff-ffff-4fff-8fff-ffffffffff01","role":"authenticated"}',
  true
);

select is(
  (
    jsonb_array_length(
      conjuntos.listar_decisiones_asamblea_demo(
        '88888888-8888-4888-8888-888888888888',
        '88888888-a001-4001-8001-888888888888'
      ) -> 'attendees'
    )
  ),
  2,
  'la administración sí recibe la lista de asistentes acreditados'
);

reset role;
set local role postgres;

select is(
  (
    select count(*) from conjuntos.asamblea_decisiones
    where asamblea_id = '88888888-a001-4001-8001-888888888888'
  ),
  2::bigint,
  'quedan exactamente dos decisiones tras la eliminación'
);

select is(
  (
    select estado::text from conjuntos.asamblea_decisiones
    where titulo = 'Formalizar acuerdo de mantenimiento'
  ),
  'completada',
  'la decisión completada conserva su estado terminal'
);

select * from finish();
rollback;
