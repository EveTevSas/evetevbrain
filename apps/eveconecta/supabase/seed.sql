-- Datos completamente ficticios para desarrollo local y pruebas de RLS.
insert into conjuntos.conjuntos (id, nombre, nit, ciudad)
values
  ('11111111-1111-4111-8111-111111111111', 'Conjunto Senderos Demo', '900000001-1', 'Bogotá'),
  ('22222222-2222-4222-8222-222222222222', 'Conjunto Mirador Demo', '900000002-2', 'Medellín')
on conflict (id) do nothing;

insert into conjuntos.miembros_conjunto (conjunto_id, usuario_id, rol)
values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'admin_conjunto'),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'residente'),
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'consejo'),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'admin_conjunto'),
  ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'residente')
on conflict (conjunto_id, usuario_id) do nothing;

insert into conjuntos.unidades (id, conjunto_id, codigo, tipo, coeficiente)
values
  ('11111111-0001-4001-8001-111111111111', '11111111-1111-4111-8111-111111111111', 'A-101', 'apartamento', 0.500000),
  ('11111111-0002-4002-8002-111111111111', '11111111-1111-4111-8111-111111111111', 'A-102', 'apartamento', 0.500000),
  ('22222222-0001-4001-8001-222222222222', '22222222-2222-4222-8222-222222222222', 'B-201', 'apartamento', 1.000000)
on conflict (id) do nothing;

insert into conjuntos.personas (id, conjunto_id, auth_usuario_id, nombre, email)
values
  (
    '11111111-1001-4001-8001-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'Residente Uno',
    'residente.uno@example.invalid'
  ),
  (
    '22222222-1001-4001-8001-222222222222',
    '22222222-2222-4222-8222-222222222222',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    'Residente Dos',
    'residente.dos@example.invalid'
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
values
  (
    '11111111-2001-4001-8001-111111111111',
    '11111111-1111-4111-8111-111111111111',
    '11111111-1001-4001-8001-111111111111',
    '11111111-0001-4001-8001-111111111111',
    'propietario',
    true,
    '2026-01-01'
  ),
  (
    '22222222-2001-4001-8001-222222222222',
    '22222222-2222-4222-8222-222222222222',
    '22222222-1001-4001-8001-222222222222',
    '22222222-0001-4001-8001-222222222222',
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
