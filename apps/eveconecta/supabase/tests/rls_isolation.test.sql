begin;
set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

-- La limpieza vive dentro de la transacción y se revierte al terminar. Así las
-- aserciones no dependen de los datos comerciales que existan en el ambiente.
truncate table conjuntos.conjuntos cascade;

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

insert into conjuntos.parqueaderos (
  id,
  conjunto_id,
  codigo,
  codigo_normalizado,
  tipo,
  sector,
  numero,
  estado
)
values
  (
    '11111111-6001-4001-8001-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'L1-5',
    'L15',
    'zona',
    'L1',
    '5',
    'asignado'
  ),
  (
    '22222222-6001-4001-8001-222222222222',
    '22222222-2222-4222-8222-222222222222',
    'M2-3',
    'M23',
    'zona',
    'M2',
    '3',
    'asignado'
  )
on conflict (id) do nothing;

insert into conjuntos.vehiculos (
  id,
  conjunto_id,
  persona_id,
  unidad_id,
  placa,
  placa_normalizada,
  clase,
  marca,
  color,
  estado_acceso
)
values
  (
    '11111111-7001-4001-8001-111111111111',
    '11111111-1111-4111-8111-111111111111',
    '11111111-1001-4001-8001-111111111111',
    '11111111-0001-4001-8001-111111111111',
    'ABC123',
    'ABC123',
    'automovil',
    'Renault',
    'Gris',
    'autorizado'
  );

insert into conjuntos.personas (id, conjunto_id, nombre)
values (
  '22222222-1001-4001-8001-222222222222',
  '22222222-2222-4222-8222-222222222222',
  'Residente B'
)
on conflict (id) do nothing;

insert into conjuntos.vehiculos (
  id,
  conjunto_id,
  persona_id,
  unidad_id,
  placa,
  placa_normalizada,
  clase,
  marca,
  color,
  estado_acceso
)
values (
  '22222222-7001-4001-8001-222222222222',
  '22222222-2222-4222-8222-222222222222',
  '22222222-1001-4001-8001-222222222222',
  '22222222-0001-4001-8001-222222222222',
  'XYZ987',
  'XYZ987',
  'automovil',
  'Mazda',
  'Azul',
  'autorizado'
)
on conflict (id) do nothing;

insert into conjuntos.asignaciones_parqueadero (
  id,
  conjunto_id,
  parqueadero_id,
  unidad_id,
  vehiculo_id,
  vigente_desde,
  activa
)
values
  (
    '11111111-8001-4001-8001-111111111111',
    '11111111-1111-4111-8111-111111111111',
    '11111111-6001-4001-8001-111111111111',
    '11111111-0001-4001-8001-111111111111',
    '11111111-7001-4001-8001-111111111111',
    '2026-01-01',
    true
  ),
  (
    '22222222-8001-4001-8001-222222222222',
    '22222222-2222-4222-8222-222222222222',
    '22222222-6001-4001-8001-222222222222',
    '22222222-0001-4001-8001-222222222222',
    '22222222-7001-4001-8001-222222222222',
    '2026-01-01',
    true
  )
on conflict (id) do nothing;

insert into conjuntos.eventos_acceso_vehicular (
  id,
  conjunto_id,
  vehiculo_id,
  placa_normalizada,
  direccion,
  decision,
  motivo,
  origen,
  unidad_id,
  parqueadero_id,
  actor_usuario_id
)
values
  (
    '11111111-9001-4001-8001-111111111111',
    '11111111-1111-4111-8111-111111111111',
    '11111111-7001-4001-8001-111111111111',
    'ABC123',
    'ingreso',
    'autorizado',
    'registered_vehicle',
    'permanente',
    '11111111-0001-4001-8001-111111111111',
    '11111111-6001-4001-8001-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  ),
  (
    '22222222-9001-4001-8001-222222222222',
    '22222222-2222-4222-8222-222222222222',
    '22222222-7001-4001-8001-222222222222',
    'XYZ987',
    'ingreso',
    'autorizado',
    'registered_vehicle',
    'permanente',
    '22222222-0001-4001-8001-222222222222',
    '22222222-6001-4001-8001-222222222222',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
  )
on conflict (id) do nothing;

insert into conjuntos.mascotas (
  id,
  conjunto_id,
  persona_id,
  unidad_id,
  tipo,
  anio_nacimiento,
  tamano,
  nombre,
  estado
)
values
  (
    '11111111-a001-4001-8001-111111111111',
    '11111111-1111-4111-8111-111111111111',
    '11111111-1001-4001-8001-111111111111',
    '11111111-0001-4001-8001-111111111111',
    'perro',
    2021,
    'mediano',
    'Milo',
    'activo'
  ),
  (
    '22222222-a001-4001-8001-222222222222',
    '22222222-2222-4222-8222-222222222222',
    '22222222-1001-4001-8001-222222222222',
    '22222222-0001-4001-8001-222222222222',
    'gato',
    2020,
    'pequeno',
    'Luna',
    'activo'
  )
on conflict (id) do nothing;

insert into conjuntos.comunicados (
  id,
  conjunto_id,
  titulo,
  mensaje,
  audiencia,
  canales,
  publicado_en,
  entrega_porcentaje,
  estado,
  creado_por_usuario_id
)
values
  (
    '11111111-b001-4001-8001-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'Comunicado conjunto A',
    'Mensaje visible para los residentes del conjunto A.',
    'all_residents',
    array['app', 'email'],
    now(),
    100,
    'publicado',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  ),
  (
    '22222222-b001-4001-8001-222222222222',
    '22222222-2222-4222-8222-222222222222',
    'Comunicado conjunto B',
    'Mensaje visible para los residentes del conjunto B.',
    'all_residents',
    array['app'],
    now(),
    100,
    'publicado',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
  )
on conflict (id) do nothing;

insert into conjuntos.asambleas (
  id,
  conjunto_id,
  titulo,
  tipo,
  modalidad,
  inicia_en,
  ubicacion,
  orden_del_dia,
  estado,
  creado_por_usuario_id
)
values
  (
    '11111111-c001-4001-8001-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'Asamblea conjunto A',
    'ordinaria',
    'presencial',
    '2026-12-10 19:00:00-05',
    'Salón social A',
    'Verificación del quórum y presentación de informes.',
    'programada',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  ),
  (
    '22222222-c001-4001-8001-222222222222',
    '22222222-2222-4222-8222-222222222222',
    'Asamblea conjunto B',
    'extraordinaria',
    'virtual',
    '2026-12-11 19:00:00-05',
    'https://asamblea.example.com/b',
    'Verificación del quórum y votación extraordinaria.',
    'programada',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
  )
on conflict (id) do nothing;

insert into conjuntos.escenarios_demo (conjunto_id, snapshot)
values
  (
    '11111111-1111-4111-8111-111111111111',
    '{"visitors":[],"reservations":[],"audit":[]}'::jsonb
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '{"visitors":[],"reservations":[],"audit":[]}'::jsonb
  )
on conflict (conjunto_id) do nothing;

select plan(51);

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

select lives_ok(
  $$ select conjuntos.autorizar_visitante_residente_demo(
       '11111111-1111-4111-8111-111111111111',
       'Visitante autorizado',
       '4435',
       'RML355',
       now(),
       now() + interval '8 hours'
     ) $$,
  'el residente puede autorizar un visitante para su propia unidad'
);

select is(
  (
    select conjuntos.obtener_escenario_demo(
      '11111111-1111-4111-8111-111111111111'
    ) -> 'visitors' -> 0 ->> 'unit'
  ),
  'A-101',
  'la autorización queda limitada a la unidad vigente del residente'
);

select throws_ok(
  $$ select conjuntos.autorizar_visitante_residente_demo(
       '22222222-2222-4222-8222-222222222222',
       'Visitante indebido',
       '8899',
       null,
       now(),
       now() + interval '8 hours'
     ) $$,
  '42501',
  'Solo un residente puede autorizar visitantes desde este perfil',
  'el residente no puede autorizar visitantes para otra copropiedad'
);

select lives_ok(
  $$ select conjuntos.reservar_zona_residente_demo(
       '11111111-1111-4111-8111-111111111111',
       'Salón social Arrayán',
       current_date + 30,
       '15:00'::time
     ) $$,
  'el residente puede reservar una zona común para su propia unidad'
);

select is(
  (
    select conjuntos.obtener_escenario_demo(
      '11111111-1111-4111-8111-111111111111'
    ) -> 'reservations' -> 0 ->> 'unit'
  ),
  'A-101',
  'la reserva queda limitada a la unidad vigente del residente'
);

select is(
  (
    select conjuntos.obtener_escenario_demo(
      '11111111-1111-4111-8111-111111111111'
    ) -> 'reservations' -> 0 ->> 'resident'
  ),
  'Residente A',
  'la identidad de la reserva se deriva del usuario autenticado'
);

select throws_ok(
  $$ select conjuntos.reservar_zona_residente_demo(
       '11111111-1111-4111-8111-111111111111',
       'Salón social Arrayán',
       current_date + 30,
       '15:00'::time
     ) $$,
  '23505',
  'La zona ya está reservada para esa fecha y hora',
  'no se puede duplicar una reserva para la misma zona, fecha y hora'
);

select throws_ok(
  $$ select conjuntos.reservar_zona_residente_demo(
       '22222222-2222-4222-8222-222222222222',
       'Cancha múltiple',
       current_date + 30,
       '16:00'::time
     ) $$,
  '42501',
  'Solo un residente puede reservar zonas comunes desde este perfil',
  'el residente no puede reservar en otra copropiedad'
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

select is(
  (select count(*) from conjuntos.vehiculos),
  1::bigint,
  'el residente solo ve los vehículos de su unidad'
);

select lives_ok(
  $$ insert into conjuntos.vehiculos (
       id, conjunto_id, persona_id, unidad_id, placa, placa_normalizada,
       clase, marca, color, estado_acceso
     ) values (
       '11111111-7002-4002-8002-111111111111',
       '11111111-1111-4111-8111-111111111111',
       '11111111-1001-4001-8001-111111111111',
       '11111111-0001-4001-8001-111111111111',
       'RES123', 'RES123', 'automovil', 'Renault', 'Gris', 'autorizado'
     ) $$,
  'el residente puede registrar un vehículo para su propia persona y unidad'
);

select throws_ok(
  $$ insert into conjuntos.vehiculos (
       id, conjunto_id, persona_id, unidad_id, placa, placa_normalizada,
       clase, marca, color, estado_acceso
     ) values (
       '22222222-7002-4002-8002-222222222222',
       '22222222-2222-4222-8222-222222222222',
       '22222222-1001-4001-8001-222222222222',
       '22222222-0001-4001-8001-222222222222',
       'OTR123', 'OTR123', 'automovil', 'Mazda', 'Azul', 'autorizado'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "vehiculos"',
  'el residente no puede registrar vehículos para otra copropiedad'
);

select results_eq(
  $$ select codigo::text from conjuntos.parqueaderos order by codigo $$,
  $$ values ('L1-5'::text) $$,
  'el residente solo ve el parqueadero asignado a su unidad'
);

select is(
  (select count(*) from conjuntos.eventos_acceso_vehicular),
  1::bigint,
  'el residente solo ve los eventos vehiculares de su unidad'
);

select is(
  (select count(*) from conjuntos.mascotas),
  1::bigint,
  'el residente solo ve las mascotas de su unidad'
);

select is(
  (select count(*) from conjuntos.comunicados),
  1::bigint,
  'el residente solo consulta comunicados de su conjunto'
);

select throws_ok(
  $$ insert into conjuntos.comunicados (
       conjunto_id, titulo, mensaje, audiencia, canales, publicado_en,
       estado, creado_por_usuario_id
     ) values (
       '11111111-1111-4111-8111-111111111111',
       'Comunicado indebido',
       'El residente no debe poder crear este comunicado.',
       'all_residents',
       array['app'],
       now(),
       'publicado',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "comunicados"',
  'el residente no puede crear comunicados'
);

select is(
  (select count(*) from conjuntos.asambleas),
  1::bigint,
  'el residente solo consulta asambleas de su conjunto'
);

select throws_ok(
  $$ insert into conjuntos.asambleas (
       conjunto_id, titulo, tipo, modalidad, inicia_en, ubicacion,
       orden_del_dia, estado, creado_por_usuario_id
     ) values (
       '11111111-1111-4111-8111-111111111111',
       'Asamblea indebida',
       'ordinaria',
       'presencial',
       '2026-12-12 19:00:00-05',
       'Salón social A',
       'El residente no debe poder programar esta asamblea.',
       'programada',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "asambleas"',
  'el residente no puede programar asambleas'
);

insert into storage.objects (bucket_id, name, owner_id, metadata)
values (
  'eveconecta-pet-photos',
  '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/11111111-a001-4001-8001-111111111111/perfil.jpg',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  '{"mimetype":"image/jpeg","size":128}'::jsonb
);

select is(
  (
    select count(*)
    from storage.objects
    where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/11111111-a001-4001-8001-111111111111/perfil.jpg'
  ),
  1::bigint,
  'el residente puede almacenar la foto bajo su propia ruta privada'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id, metadata)
     values (
       'eveconecta-pet-photos',
       '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/11111111-a001-4001-8001-111111111111/perfil.jpg',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
       '{"mimetype":"image/jpeg","size":128}'::jsonb
     ) $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'el residente no puede escribir una foto bajo la ruta de otro usuario'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id, metadata)
     values (
       'eveconecta-case-images',
       '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/cccccccc-cccc-4ccc-8ccc-cccccccccccc/1.jpg',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
       '{"mimetype":"image/jpeg","size":128}'::jsonb
     ) $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'el residente no puede almacenar evidencias en nombre de la administración'
);

update conjuntos.mascotas
set estado = 'inactivo'
where id = '11111111-a001-4001-8001-111111111111';

update conjuntos.mascotas
set estado = 'inactivo'
where id = '22222222-a001-4001-8001-222222222222';

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

select is(
  (select count(*) from conjuntos.vehiculos),
  2::bigint,
  'el administrador solo ve los vehículos de su conjunto'
);

select throws_ok(
  $$ insert into conjuntos.vehiculos (
       id, conjunto_id, persona_id, unidad_id, placa, placa_normalizada,
       clase, marca, color, estado_acceso
     ) values (
       '11111111-7003-4003-8003-111111111111',
       '11111111-1111-4111-8111-111111111111',
       '11111111-1001-4001-8001-111111111111',
       '11111111-0001-4001-8001-111111111111',
       'ADM123', 'ADM123', 'automovil', 'Renault', 'Blanco', 'autorizado'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "vehiculos"',
  'la administración no registra vehículos en nombre del residente'
);

select is(
  (select count(*) from conjuntos.mascotas),
  1::bigint,
  'el administrador solo ve el censo de mascotas de su conjunto'
);

select is(
  (select count(*) from conjuntos.comunicados),
  1::bigint,
  'la administración solo consulta comunicados de su conjunto'
);

select lives_ok(
  $$ insert into conjuntos.comunicados (
       conjunto_id, titulo, mensaje, audiencia, canales, publicado_en,
       estado, creado_por_usuario_id
     ) values (
       '11111111-1111-4111-8111-111111111111',
       'Comunicado administrativo',
       'La administración puede registrar este comunicado.',
       'all_residents',
       array['app'],
       now(),
       'publicado',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
     ) $$,
  'la administración puede crear comunicados en su conjunto'
);

select is(
  (select count(*) from conjuntos.asambleas),
  1::bigint,
  'la administración solo consulta asambleas de su conjunto'
);

select lives_ok(
  $$ insert into conjuntos.asambleas (
       conjunto_id, titulo, tipo, modalidad, inicia_en, ubicacion,
       orden_del_dia, estado, creado_por_usuario_id
     ) values (
       '11111111-1111-4111-8111-111111111111',
       'Asamblea administrativa',
       'extraordinaria',
       'hibrida',
       '2026-12-13 19:00:00-05',
       'Salón social y enlace seguro',
       'La administración puede programar esta asamblea.',
       'programada',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
     ) $$,
  'la administración puede programar asambleas en su conjunto'
);

select is(
  (
    select count(*)
    from storage.objects
    where name = '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/11111111-a001-4001-8001-111111111111/perfil.jpg'
  ),
  1::bigint,
  'la administración puede consultar las fotos privadas de su conjunto'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id, metadata)
     values (
       'eveconecta-case-images',
       '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/cccccccc-cccc-4ccc-8ccc-cccccccccccc/1.jpg',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
       '{"mimetype":"image/jpeg","size":128}'::jsonb
     ) $$,
  'la administración puede almacenar una imagen del caso bajo su ruta privada'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id, metadata)
     values (
       'eveconecta-case-images',
       '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2/cccccccc-cccc-4ccc-8ccc-cccccccccccc/2.jpg',
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
       '{"mimetype":"image/jpeg","size":128}'::jsonb
     ) $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'la administración no puede almacenar evidencias bajo la ruta de otro usuario'
);

select throws_ok(
  $$ insert into conjuntos.mascotas (
       conjunto_id, persona_id, unidad_id, tipo, anio_nacimiento, tamano, nombre
     ) values (
       '11111111-1111-4111-8111-111111111111',
       '11111111-1001-4001-8001-111111111111',
       '11111111-0001-4001-8001-111111111111',
       'gato', 2022, 'pequeno', 'Nube'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "mascotas"',
  'la administración no registra mascotas en nombre del residente'
);

update conjuntos.vehiculos
set estado_acceso = 'suspendido'
where id = '22222222-7001-4001-8001-222222222222';

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
  (select public from storage.buckets where id = 'eveconecta-pet-photos'),
  false,
  'el bucket de fotos de mascotas permanece privado'
);

select is(
  (select public from storage.buckets where id = 'eveconecta-case-images'),
  false,
  'el bucket de imágenes de PQRS permanece privado'
);

select is(
  (
    select codigo
    from conjuntos.unidades
    where id = '22222222-0001-4001-8001-222222222222'
  ),
  'B-201',
  'RLS también impide modificar una fila de otro conjunto'
);

select is(
  (
    select estado_acceso::text
    from conjuntos.vehiculos
    where id = '22222222-7001-4001-8001-222222222222'
  ),
  'autorizado',
  'RLS impide suspender un vehículo de otro conjunto'
);

select is(
  (
    select estado::text
    from conjuntos.mascotas
    where id = '11111111-a001-4001-8001-111111111111'
  ),
  'inactivo',
  'el residente puede inactivar una mascota de su unidad'
);

select is(
  (
    select estado::text
    from conjuntos.mascotas
    where id = '22222222-a001-4001-8001-222222222222'
  ),
  'activo',
  'RLS impide inactivar una mascota de otro conjunto'
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
      and not (tabla.relrowsecurity and tabla.relforcerowsecurity)
  ),
  0::bigint,
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

select throws_ok(
  $$ update conjuntos.eventos_acceso_vehicular
     set motivo = 'unknown_vehicle'
     where id = '11111111-9001-4001-8001-111111111111' $$,
  'P0001',
  'Los registros de conjuntos.eventos_acceso_vehicular son inmutables',
  'los eventos de acceso vehicular son inmutables'
);

select * from finish();
rollback;
