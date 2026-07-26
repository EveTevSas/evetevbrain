begin;
set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

-- Fixtures autocontenidos: se revierten al terminar y permiten ejecutar la
-- misma prueba contra local o contra un proyecto remoto vacío.
insert into conjuntos.conjuntos (id, nombre)
values
  ('11111111-1111-4111-8111-111111111111', 'Conjunto A'),
  ('22222222-2222-4222-8222-222222222222', 'Conjunto B')
on conflict (id) do nothing;

insert into conjuntos.miembros_conjunto (conjunto_id, usuario_id, rol)
values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'admin_conjunto'),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'residente'),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'consejo'),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'admin_conjunto')
on conflict (conjunto_id, usuario_id) do nothing;

insert into conjuntos.unidades (id, conjunto_id, codigo, tipo, coeficiente)
values
  ('11111111-0001-4001-8001-111111111111', '11111111-1111-4111-8111-111111111111', 'A-101', 'apartamento', 0.500000),
  ('11111111-0002-4002-8002-111111111111', '11111111-1111-4111-8111-111111111111', 'A-102', 'apartamento', 0.500000),
  ('22222222-0001-4001-8001-222222222222', '22222222-2222-4222-8222-222222222222', 'B-201', 'apartamento', 1.000000)
on conflict (id) do nothing;

insert into conjuntos.personas (id, conjunto_id, auth_usuario_id, nombre)
values (
  '11111111-1001-4001-8001-111111111111',
  '11111111-1111-4111-8111-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  'Residente A'
)
on conflict (id) do nothing;

insert into conjuntos.personas_unidades (
  id,
  conjunto_id,
  persona_id,
  unidad_id,
  relacion,
  responsable_pago,
  vigente_desde
)
values (
  '11111111-2001-4001-8001-111111111111',
  '11111111-1111-4111-8111-111111111111',
  '11111111-1001-4001-8001-111111111111',
  '11111111-0001-4001-8001-111111111111',
  'propietario',
  true,
  '2026-01-01'
)
on conflict (id) do nothing;

insert into conjuntos.generaciones_cuotas (
  id,
  conjunto_id,
  periodo,
  tipo,
  concepto,
  presupuesto_minor,
  idempotencia_clave,
  creado_por_usuario_id
)
values
  (
    '11111111-3001-4001-8001-111111111111',
    '11111111-1111-4111-8111-111111111111',
    '2026-07-01',
    'administracion',
    'Administración julio 2026',
    10000000,
    'administracion:2026-07',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  ),
  (
    '22222222-3001-4001-8001-222222222222',
    '22222222-2222-4222-8222-222222222222',
    '2026-07-01',
    'administracion',
    'Administración julio 2026',
    5000000,
    'administracion:2026-07',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
  )
on conflict (id) do nothing;

insert into conjuntos.cuotas (
  id,
  conjunto_id,
  generacion_id,
  unidad_id,
  concepto,
  monto_minor,
  coeficiente_aplicado,
  vence_en
)
values
  (
    '11111111-4001-4001-8001-111111111111',
    '11111111-1111-4111-8111-111111111111',
    '11111111-3001-4001-8001-111111111111',
    '11111111-0001-4001-8001-111111111111',
    'Administración julio 2026',
    5000000,
    0.500000,
    '2026-07-10'
  ),
  (
    '11111111-4002-4002-8002-111111111111',
    '11111111-1111-4111-8111-111111111111',
    '11111111-3001-4001-8001-111111111111',
    '11111111-0002-4002-8002-111111111111',
    'Administración julio 2026',
    5000000,
    0.500000,
    '2026-07-10'
  ),
  (
    '22222222-4001-4001-8001-222222222222',
    '22222222-2222-4222-8222-222222222222',
    '22222222-3001-4001-8001-222222222222',
    '22222222-0001-4001-8001-222222222222',
    'Administración julio 2026',
    5000000,
    1.000000,
    '2026-07-10'
  )
on conflict (id) do nothing;

insert into conjuntos.movimientos_cuenta (
  id,
  conjunto_id,
  unidad_id,
  cuota_id,
  tipo,
  monto_minor,
  idempotencia_clave,
  actor_usuario_id,
  motivo
)
values
  (
    '11111111-5001-4001-8001-111111111111',
    '11111111-1111-4111-8111-111111111111',
    '11111111-0001-4001-8001-111111111111',
    '11111111-4001-4001-8001-111111111111',
    'cuota_generada',
    5000000,
    'cuota:11111111-4001-4001-8001-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'Generación de cuota ordinaria'
  ),
  (
    '11111111-5002-4002-8002-111111111111',
    '11111111-1111-4111-8111-111111111111',
    '11111111-0002-4002-8002-111111111111',
    '11111111-4002-4002-8002-111111111111',
    'cuota_generada',
    5000000,
    'cuota:11111111-4002-4002-8002-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'Generación de cuota ordinaria'
  ),
  (
    '22222222-5001-4001-8001-222222222222',
    '22222222-2222-4222-8222-222222222222',
    '22222222-0001-4001-8001-222222222222',
    '22222222-4001-4001-8001-222222222222',
    'cuota_generada',
    5000000,
    'cuota:22222222-4001-4001-8001-222222222222',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'Generación de cuota ordinaria'
  )
on conflict (id) do nothing;

select plan(13);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2","role":"authenticated"}',
  true
);

select results_eq(
  $$ select codigo::text from conjuntos.unidades order by codigo $$,
  $$ values ('A-101'::text) $$,
  'el residente solo ve su unidad'
);

select is(
  (select count(*) from conjuntos.cuotas),
  1::bigint,
  'el residente solo ve la cuota de su unidad'
);

select is(
  (select count(*) from conjuntos.movimientos_cuenta),
  1::bigint,
  'el residente solo ve los movimientos de su unidad'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1","role":"authenticated"}',
  true
);

select results_eq(
  $$ select codigo::text from conjuntos.unidades order by codigo $$,
  $$ values ('A-101'::text), ('A-102'::text) $$,
  'el administrador ve todas las unidades de su conjunto'
);

select is(
  (select count(*) from conjuntos.cuotas),
  2::bigint,
  'el administrador ve las cuotas de su conjunto'
);

update conjuntos.unidades
set codigo = 'NO-DEBE-CAMBIAR'
where id = '22222222-0001-4001-8001-222222222222';

select is(
  (select count(*) from conjuntos.unidades where conjunto_id = '22222222-2222-4222-8222-222222222222'),
  0::bigint,
  'el administrador no ve filas de otro conjunto'
);

reset role;
set local role postgres;

select is(
  (
    select codigo
    from conjuntos.unidades
    where id = '22222222-0001-4001-8001-222222222222'
  ),
  'B-201',
  'RLS también impide modificar una fila de otro conjunto'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3","role":"authenticated"}',
  true
);

select is(
  (select count(*) from conjuntos.unidades),
  2::bigint,
  'el consejo puede consultar el inventario de unidades'
);

select is(
  (select count(*) from conjuntos.cuotas),
  0::bigint,
  'el consejo no accede al detalle de deuda por unidad'
);

reset role;
set local role postgres;

select is(
  (
    select count(*)
    from pg_catalog.pg_class as tabla
    inner join pg_catalog.pg_namespace as esquema
      on esquema.oid = tabla.relnamespace
    where esquema.nspname = 'conjuntos'
      and tabla.relkind = 'r'
      and tabla.relrowsecurity
      and tabla.relforcerowsecurity
  ),
  9::bigint,
  'todas las tablas del dominio tienen RLS habilitado y forzado'
);

select is(
  (
    select count(*)
    from pg_catalog.pg_constraint as restriccion
    inner join pg_catalog.pg_class as tabla_destino
      on tabla_destino.oid = restriccion.confrelid
    inner join pg_catalog.pg_namespace as esquema_destino
      on esquema_destino.oid = tabla_destino.relnamespace
    where restriccion.conrelid = 'conjuntos.cuotas'::regclass
      and restriccion.contype = 'f'
      and esquema_destino.nspname = 'evepay'
  ),
  0::bigint,
  'cuotas no tiene llaves foráneas hacia EvePay'
);

select is(
  (
    select count(*)
    from pg_catalog.pg_namespace
    where nspname = 'evepay'
  ),
  0::bigint,
  'el proyecto de EveConecta no contiene el schema evepay'
);

select throws_ok(
  $$ update conjuntos.movimientos_cuenta
     set motivo = 'mutación indebida'
     where id = '11111111-5001-4001-8001-111111111111' $$,
  'P0001',
  'Los registros de conjuntos.movimientos_cuenta son inmutables',
  'los movimientos de cuenta son inmutables incluso para el propietario de la tabla'
);

select * from finish();
rollback;
