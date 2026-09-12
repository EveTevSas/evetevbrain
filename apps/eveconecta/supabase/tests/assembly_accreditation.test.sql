begin;
set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

-- Fixtures autocontenidos y aislados de rls_isolation.test.sql: se revierten
-- al terminar la transacción.
truncate table conjuntos.conjuntos cascade;

insert into conjuntos.conjuntos (id, nombre)
values ('44444444-4444-4444-8444-444444444444', 'Conjunto Acreditación')
on conflict (id) do nothing;

insert into conjuntos.miembros_conjunto (conjunto_id, usuario_id, rol)
values
  ('44444444-4444-4444-8444-444444444444', 'cccccccc-cccc-4ccc-8ccc-cccccccccc01', 'admin_conjunto'),
  ('44444444-4444-4444-8444-444444444444', 'cccccccc-cccc-4ccc-8ccc-cccccccccc02', 'residente')
on conflict (conjunto_id, usuario_id) do nothing;

insert into conjuntos.unidades (id, conjunto_id, codigo, tipo, coeficiente)
values
  ('44444444-0001-4001-8001-444444444444', '44444444-4444-4444-8444-444444444444', 'A-101', 'apartamento', 40.000000),
  ('44444444-0002-4002-8002-444444444444', '44444444-4444-4444-8444-444444444444', 'A-102', 'apartamento', 60.000000)
on conflict (id) do nothing;

-- Propietario de A-101 (no tiene cuenta de acceso; solo aparece como
-- representado por un poder).
insert into conjuntos.personas (id, conjunto_id, nombre)
values ('44444444-1001-4001-8001-444444444444', '44444444-4444-4444-8444-444444444444', 'Propietario A-101')
on conflict (id) do nothing;

-- Apoderado que asiste en nombre del propietario de A-101.
insert into conjuntos.personas (id, conjunto_id, nombre)
values ('44444444-1002-4002-8002-444444444444', '44444444-4444-4444-8444-444444444444', 'Apoderado de A-101')
on conflict (id) do nothing;

-- Propietario de A-102, que asiste personalmente.
insert into conjuntos.personas (id, conjunto_id, nombre)
values ('44444444-1003-4003-8003-444444444444', '44444444-4444-4444-8444-444444444444', 'Propietario A-102')
on conflict (id) do nothing;

-- Residente de A-102 sin ser su propietario (asiste con voz, sin voto).
insert into conjuntos.personas (id, conjunto_id, nombre)
values ('44444444-1004-4004-8004-444444444444', '44444444-4444-4444-8444-444444444444', 'Residente A-102')
on conflict (id) do nothing;

-- Invitado sin unidad (p. ej. asesor externo).
insert into conjuntos.personas (id, conjunto_id, nombre)
values ('44444444-1005-4005-8005-444444444444', '44444444-4444-4444-8444-444444444444', 'Asesor externo')
on conflict (id) do nothing;

-- Persona anonimizada con vínculo vigente a A-102 (debe quedar inaccionable).
insert into conjuntos.personas (id, conjunto_id, nombre, anonimizada_en)
values (
  '44444444-1006-4006-8006-444444444444', '44444444-4444-4444-8444-444444444444', null, now()
)
on conflict (id) do nothing;

insert into conjuntos.personas_unidades (
  id, conjunto_id, persona_id, unidad_id, relacion, responsable_pago, vigente_desde
)
values
  (
    '44444444-2001-4001-8001-444444444444',
    '44444444-4444-4444-8444-444444444444',
    '44444444-1001-4001-8001-444444444444',
    '44444444-0001-4001-8001-444444444444',
    'propietario', true, '2026-01-01'
  ),
  (
    '44444444-2002-4002-8002-444444444444',
    '44444444-4444-4444-8444-444444444444',
    '44444444-1003-4003-8003-444444444444',
    '44444444-0002-4002-8002-444444444444',
    'propietario', true, '2026-01-01'
  ),
  (
    '44444444-2003-4003-8003-444444444444',
    '44444444-4444-4444-8444-444444444444',
    '44444444-1004-4004-8004-444444444444',
    '44444444-0002-4002-8002-444444444444',
    'residente', false, '2026-01-01'
  ),
  (
    '44444444-2004-4004-8004-444444444444',
    '44444444-4444-4444-8444-444444444444',
    '44444444-1006-4006-8006-444444444444',
    '44444444-0002-4002-8002-444444444444',
    'residente', false, '2026-01-01'
  )
on conflict (id) do nothing;

insert into conjuntos.asambleas (
  id, conjunto_id, titulo, tipo, modalidad, inicia_en, ubicacion, orden_del_dia, estado, creado_por_usuario_id
)
values
  (
    '44444444-a001-4001-8001-444444444444',
    '44444444-4444-4444-8444-444444444444',
    'Asamblea de acreditación',
    'ordinaria', 'presencial', '2026-12-15 19:00:00-05', 'Salón social',
    'Verificación del quórum y aprobación del orden del día.',
    'programada', 'cccccccc-cccc-4ccc-8ccc-cccccccccc01'
  ),
  (
    '44444444-a002-4002-8002-444444444444',
    '44444444-4444-4444-8444-444444444444',
    'Asamblea cerrada',
    'ordinaria', 'presencial', '2026-11-15 19:00:00-05', 'Salón social',
    'Sesión ya finalizada.',
    'cerrada', 'cccccccc-cccc-4ccc-8ccc-cccccccccc01'
  ),
  (
    '44444444-a003-4003-8003-444444444444',
    '44444444-4444-4444-8444-444444444444',
    'Asamblea sin dossier previo',
    'ordinaria', 'presencial', '2026-10-15 19:00:00-05', 'Salón social',
    'Simula datos de demo sembrados antes de este bloque, sin clave dossier.',
    'programada', 'cccccccc-cccc-4ccc-8ccc-cccccccccc01'
  )
on conflict (id) do nothing;

-- La tercera asamblea deliberadamente NO trae clave "dossier" en el snapshot,
-- igual que los datos sembrados por scripts/seed-commercial-demo.mjs: el
-- cliente sintetiza el dossier completo con normalizeAssembly cuando la clave
-- está ausente, así que obtener_escenario_demo no debe inyectarla.
insert into conjuntos.escenarios_demo (conjunto_id, snapshot)
values (
  '44444444-4444-4444-8444-444444444444',
  '{"assemblies":[{"id":"44444444-a001-4001-8001-444444444444","dossier":{}},{"id":"44444444-a002-4002-8002-444444444444","dossier":{}},{"id":"44444444-a003-4003-8003-444444444444"}],"audit":[]}'::jsonb
)
on conflict (conjunto_id) do nothing;

select plan(26);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccc02","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.acreditar_asistente_asamblea_demo(
       '44444444-4444-4444-8444-444444444444',
       '44444444-a001-4001-8001-444444444444',
       'propietario',
       '44444444-1003-4003-8003-444444444444',
       'A-102'
     ) $$,
  '42501',
  'Tu rol no permite acreditar asistentes',
  'un residente no puede acreditar asistentes'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccc01","role":"authenticated"}',
  true
);

select lives_ok(
  $$ select conjuntos.acreditar_asistente_asamblea_demo(
       '44444444-4444-4444-8444-444444444444',
       '44444444-a001-4001-8001-444444444444',
       'propietario',
       '44444444-1003-4003-8003-444444444444',
       'A-102'
     ) $$,
  'la administración acredita al propietario de su propia unidad'
);

select throws_ok(
  $$ select conjuntos.acreditar_asistente_asamblea_demo(
       '44444444-4444-4444-8444-444444444444',
       '44444444-a001-4001-8001-444444444444',
       'residente_con_voz',
       '44444444-1004-4004-8004-444444444444',
       'A-102'
     ) $$,
  '23505',
  'Esa unidad ya tiene una acreditación activa en esta asamblea',
  'una unidad no admite una segunda acreditación activa (bloquea doble representación)'
);

select is(
  (
    select count(*)
    from conjuntos.asamblea_acreditaciones
    where asamblea_id = '44444444-a001-4001-8001-444444444444'
      and unidad_id = '44444444-0002-4002-8002-444444444444'
      and revocado_en is null
  ),
  1::bigint,
  'la unidad de A-102 queda con exactamente una acreditación activa'
);

select throws_ok(
  $$ select conjuntos.acreditar_asistente_asamblea_demo(
       '44444444-4444-4444-8444-444444444444',
       '44444444-a001-4001-8001-444444444444',
       'propietario',
       '44444444-1004-4004-8004-444444444444',
       'A-102'
     ) $$,
  '22023',
  'Quien asiste no es propietario vigente de esa unidad',
  'un residente sin ser propietario no puede acreditarse con calidad propietario'
);

select throws_ok(
  $$ select conjuntos.acreditar_asistente_asamblea_demo(
       '44444444-4444-4444-8444-444444444444',
       '44444444-a001-4001-8001-444444444444',
       'residente_con_voz',
       '44444444-1006-4006-8006-444444444444',
       'A-102'
     ) $$,
  '22023',
  'Quien asiste no tiene un vínculo vigente con esa unidad',
  'una persona anonimizada no puede acreditarse aunque conserve el vínculo'
);

select throws_ok(
  $$ select conjuntos.acreditar_asistente_asamblea_demo(
       '44444444-4444-4444-8444-444444444444',
       '44444444-a001-4001-8001-444444444444',
       'apoderado',
       '44444444-1002-4002-8002-444444444444',
       'A-101',
       '44444444-1004-4004-8004-444444444444'
     ) $$,
  '22023',
  'El representado no es propietario vigente de esa unidad',
  'el apoderado no puede invocar un poder de quien no es el propietario vigente'
);

select lives_ok(
  $$ select conjuntos.acreditar_asistente_asamblea_demo(
       '44444444-4444-4444-8444-444444444444',
       '44444444-a001-4001-8001-444444444444',
       'apoderado',
       '44444444-1002-4002-8002-444444444444',
       'A-101',
       '44444444-1001-4001-8001-444444444444'
     ) $$,
  'el apoderado con un poder del propietario vigente sí queda acreditado'
);

select throws_ok(
  $$ select conjuntos.acreditar_asistente_asamblea_demo(
       '44444444-4444-4444-8444-444444444444',
       '44444444-a001-4001-8001-444444444444',
       'apoderado',
       '44444444-1001-4001-8001-444444444444',
       'A-101',
       '44444444-1001-4001-8001-444444444444'
     ) $$,
  '22023',
  'El apoderado exige un representado distinto de quien asiste',
  'nadie puede autorrepresentarse como su propio apoderado'
);

select throws_ok(
  $$ select conjuntos.acreditar_asistente_asamblea_demo(
       '44444444-4444-4444-8444-444444444444',
       '44444444-a001-4001-8001-444444444444',
       'invitado',
       '44444444-1005-4005-8005-444444444444',
       'A-101'
     ) $$,
  '22023',
  'El invitado no referencia unidad ni representación',
  'el invitado no puede referenciar una unidad'
);

select lives_ok(
  $$ select conjuntos.acreditar_asistente_asamblea_demo(
       '44444444-4444-4444-8444-444444444444',
       '44444444-a001-4001-8001-444444444444',
       'invitado',
       '44444444-1005-4005-8005-444444444444'
     ) $$,
  'un invitado se acredita sin ocupar ninguna unidad'
);

select throws_ok(
  $$ select conjuntos.acreditar_asistente_asamblea_demo(
       '44444444-4444-4444-8444-444444444444',
       '44444444-a002-4002-8002-444444444444',
       'invitado',
       '44444444-1005-4005-8005-444444444444'
     ) $$,
  '22023',
  'La asamblea ya está cerrada',
  'no se acredita a nadie en una asamblea cerrada'
);

-- Quórum real: A-101 (coef. 40, apoderado) y A-102 (coef. 60, propietario)
-- están representados; el invitado no aporta coeficiente.
select is(
  (
    conjuntos.obtener_escenario_demo('44444444-4444-4444-8444-444444444444')
      -> 'assemblies' -> 0 ->> 'quorumPercent'
  ),
  '100',
  'el quórum se calcula desde el coeficiente de las acreditaciones con voto'
);

select is(
  (
    conjuntos.obtener_escenario_demo('44444444-4444-4444-8444-444444444444')
      -> 'assemblies' -> 0 ->> 'representedUnits'
  ),
  '2',
  'las unidades representadas cuentan toda acreditación activa con unidad'
);

select is(
  (
    conjuntos.obtener_escenario_demo('44444444-4444-4444-8444-444444444444')
      -> 'assemblies' -> 0 -> 'dossier' ->> 'validatedProxies'
  ),
  '1',
  'el conteo de poderes solo incluye acreditaciones de calidad apoderado'
);

select ok(
  not (
    (
      select asamblea.item
      from jsonb_array_elements(
        conjuntos.obtener_escenario_demo('44444444-4444-4444-8444-444444444444') -> 'assemblies'
      ) as asamblea(item)
      where asamblea.item ->> 'id' = '44444444-a003-4003-8003-444444444444'
    ) ? 'dossier'
  ),
  'una asamblea sin dossier previo no recibe uno inyectado (el cliente sintetiza el suyo)'
);

select is(
  (
    select asamblea.item ->> 'quorumPercent'
    from jsonb_array_elements(
      conjuntos.obtener_escenario_demo('44444444-4444-4444-8444-444444444444') -> 'assemblies'
    ) as asamblea(item)
    where asamblea.item ->> 'id' = '44444444-a003-4003-8003-444444444444'
  ),
  '0',
  'el quórum de una asamblea sin acreditaciones se calcula igual en cero, con o sin dossier previo'
);

select is(
  (
    select jsonb_array_length(
      conjuntos.listar_asistentes_asamblea_demo(
        '44444444-4444-4444-8444-444444444444',
        '44444444-a001-4001-8001-444444444444'
      )
    )
  ),
  3,
  'la lista de asistentes trae las tres acreditaciones activas'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccc02","role":"authenticated"}',
  true
);

select throws_ok(
  $$ select conjuntos.listar_asistentes_asamblea_demo(
       '44444444-4444-4444-8444-444444444444',
       '44444444-a001-4001-8001-444444444444'
     ) $$,
  '42501',
  'Tu rol no permite consultar los asistentes',
  'un residente no puede listar los asistentes acreditados'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccc01","role":"authenticated"}',
  true
);

-- Revocar libera el cupo de la unidad.
select lives_ok(
  $$ select conjuntos.revocar_acreditacion_asamblea_demo(
       '44444444-4444-4444-8444-444444444444',
       '44444444-a001-4001-8001-444444444444',
       (
         select id from conjuntos.asamblea_acreditaciones
         where asamblea_id = '44444444-a001-4001-8001-444444444444'
           and unidad_id = '44444444-0001-4001-8001-444444444444'
           and revocado_en is null
       )
     ) $$,
  'la administración puede revocar una acreditación activa'
);

select throws_ok(
  $$ select conjuntos.revocar_acreditacion_asamblea_demo(
       '44444444-4444-4444-8444-444444444444',
       '44444444-a001-4001-8001-444444444444',
       (
         select id from conjuntos.asamblea_acreditaciones
         where asamblea_id = '44444444-a001-4001-8001-444444444444'
           and unidad_id = '44444444-0001-4001-8001-444444444444'
       )
     ) $$,
  'P0002',
  'La acreditación no existe o ya estaba revocada',
  'una acreditación ya revocada no puede revocarse otra vez'
);

select lives_ok(
  $$ select conjuntos.acreditar_asistente_asamblea_demo(
       '44444444-4444-4444-8444-444444444444',
       '44444444-a001-4001-8001-444444444444',
       'propietario',
       '44444444-1001-4001-8001-444444444444',
       'A-101'
     ) $$,
  'revocar libera la unidad para una nueva acreditación'
);

-- Aislamiento entre conjuntos: la unidad A-101 pertenece a otro conjunto.
select throws_ok(
  $$ select conjuntos.acreditar_asistente_asamblea_demo(
       '11111111-1111-4111-8111-111111111111',
       '44444444-a001-4001-8001-444444444444',
       'propietario',
       '44444444-1001-4001-8001-444444444444',
       'A-101'
     ) $$,
  '42501',
  'Tu rol no permite acreditar asistentes',
  'no se puede acreditar sobre una asamblea de otro conjunto'
);

select throws_ok(
  $$ select conjuntos.acreditar_asistente_asamblea_demo(
       '44444444-4444-4444-8444-444444444444',
       '44444444-a001-4001-8001-444444444444',
       'residente_con_voz',
       '44444444-1005-4005-8005-444444444444',
       'A-999'
     ) $$,
  '22023',
  'La unidad indicada no existe en esta copropiedad',
  'no se puede acreditar una unidad que no existe'
);

reset role;
set local role postgres;

select is(
  (select public from storage.buckets where id = 'eveconecta-assembly-proxies'),
  false,
  'el bucket de evidencia de poderes permanece privado'
);

select is(
  (
    select count(*)
    from conjuntos.asamblea_acreditaciones
    where asamblea_id = '44444444-a001-4001-8001-444444444444'
      and revocado_en is null
  ),
  3::bigint,
  'quedan tres acreditaciones activas tras la revocación y el reingreso'
);

select * from finish();
rollback;
