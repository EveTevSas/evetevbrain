-- Hub de Evetev (apps/hub) — spec specs/hub/hub-base.
--
-- El Hub es la torre de control de la COMPAÑÍA y comparte proyecto Supabase con
-- EvePay solo por la identidad (una cuenta de Google por persona). Sus datos
-- viven en el schema `hub` y los lee el rol `hub_app`, que NO recibe permisos
-- sobre evepay/identity/audit: la frontera del §6 de la arquitectura la hacen
-- los GRANT de este archivo. EvePay tampoco sabe que `hub` existe.

create schema if not exists hub;
grant usage on schema hub to hub_app;

-- --- Equipo & metas --------------------------------------------------------
create table if not exists hub.miembros (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique check (email = lower(email)),
  nombre      text not null check (length(trim(nombre)) >= 2),
  rol         text not null,                      -- texto libre: «Founder · Producto & Pagos»
  iniciales   text not null check (length(iniciales) between 1 and 3),
  activo      boolean not null default true,
  orden       int not null default 100,
  creado_en   timestamptz not null default now()
);

create table if not exists hub.metas (
  id          uuid primary key default gen_random_uuid(),
  miembro_id  uuid not null references hub.miembros(id) on delete cascade,
  titulo      text not null check (length(trim(titulo)) >= 3),
  avance      int  not null default 0 check (avance between 0 and 100),
  trimestre   text not null check (trimestre ~ '^[0-9]{4}-Q[1-4]$'),
  creada_en   timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);
create index if not exists metas_miembro_idx on hub.metas (miembro_id, trimestre);

create table if not exists hub.logros (
  id          uuid primary key default gen_random_uuid(),
  miembro_id  uuid not null references hub.miembros(id) on delete cascade,
  texto       text not null check (length(trim(texto)) >= 3),
  trimestre   text not null check (trimestre ~ '^[0-9]{4}-Q[1-4]$'),
  fecha       date not null default current_date
);
create index if not exists logros_miembro_idx on hub.logros (miembro_id, trimestre);

-- --- Portales & accesos ----------------------------------------------------
create table if not exists hub.portales (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  url         text not null check (url ~ '^https?://'),
  descripcion text not null default '',
  color       text not null default '#0A2540' check (color ~ '^#[0-9a-fA-F]{6}$'),
  estado      text not null default 'operando' check (estado in ('operando', 'beta', 'inactivo')),
  rol_acceso  text not null default '',
  orden       int not null default 100,
  creado_en   timestamptz not null default now()
);

-- --- Ingresos & costos -----------------------------------------------------
-- Facturas de proveedores por mes, en la unidad mínima (COP: pesos). Es lo que
-- el Hub POSEE; el costo del proveedor de pagos según el ledger lo trae EvePay
-- por API y se muestra como referencia, no se suma dos veces.
create table if not exists hub.costos_proveedor (
  id          uuid primary key default gen_random_uuid(),
  mes         date not null check (mes = date_trunc('month', mes)::date),
  proveedor   text not null,
  concepto    text not null default '',
  categoria   text not null check (categoria in ('pagos', 'infra', 'mensajeria', 'ia', 'herramientas', 'otros')),
  monto_minor bigint not null check (monto_minor >= 0),
  moneda      text not null default 'COP',
  creado_en   timestamptz not null default now(),
  unique (mes, proveedor, concepto)
);

-- Cierre mensual a mano: caja y gasto operativo (nómina, arriendo…). Con esto y
-- los ingresos se calculan quema, runway y resultado operativo.
create table if not exists hub.cierres_mes (
  mes                     date primary key check (mes = date_trunc('month', mes)::date),
  caja_minor              bigint not null check (caja_minor >= 0),
  gasto_operativo_minor   bigint not null check (gasto_operativo_minor >= 0),
  nota                    text,
  actualizado_en          timestamptz not null default now()
);

-- --- Cuenta canónica (contrato en @evetev/shared) --------------------------
create table if not exists hub.cuentas (
  id            uuid primary key default gen_random_uuid(),
  nombre_legal  text not null check (length(trim(nombre_legal)) >= 3),
  nit           text not null unique check (nit ~ '^[0-9]{5,20}$'),
  estado        text not null default 'onboarding' check (estado in ('onboarding', 'activa', 'suspendida', 'cerrada')),
  ciudad        text,
  creada_en     timestamptz not null default now()
);

create table if not exists hub.enlaces_producto (
  id                  uuid primary key default gen_random_uuid(),
  cuenta_id           uuid not null references hub.cuentas(id) on delete cascade,
  producto            text not null check (producto in ('evepay', 'eveconecta', 'eveledger')),
  suscripcion_estado  text check (suscripcion_estado in ('activa', 'morosa', 'cancelada')),
  mrr_minor           bigint check (mrr_minor >= 0),
  /* Referencia por id al tenant de EvePay; SIN foreign key a propósito: el Hub no toca identity. */
  evepay_tenant_id    uuid,
  origen              text not null default 'directo' check (origen in ('directo', 'eveconecta', 'eveledger')),
  creado_en           timestamptz not null default now(),
  unique (cuenta_id, producto),
  /* CA-4: mensualidad, faceta de pagos o ambas; EvePay no cobra mensualidad. */
  constraint enlace_con_contenido check (suscripcion_estado is not null or evepay_tenant_id is not null),
  constraint evepay_sin_mensualidad check (producto <> 'evepay' or suscripcion_estado is null),
  constraint mrr_con_estado check ((suscripcion_estado is null) = (mrr_minor is null))
);
create index if not exists enlaces_tenant_idx on hub.enlaces_producto (evepay_tenant_id);

-- --- Auditoría (CA-7) -------------------------------------------------------
create table if not exists hub.auditoria (
  id        bigint generated always as identity primary key,
  actor     text not null,
  accion    text not null,
  entidad   text not null,
  entidad_id text,
  detalle   jsonb not null default '{}'::jsonb,
  creada_en timestamptz not null default now()
);
create index if not exists hub_auditoria_fecha_idx on hub.auditoria (creada_en desc);

drop trigger if exists hub_auditoria_inmutable on hub.auditoria;
create trigger hub_auditoria_inmutable before update or delete on hub.auditoria
  for each row execute function audit.registro_inmutable();

-- --- Permisos: solo el schema hub ------------------------------------------
grant select, insert, update, delete on all tables in schema hub to hub_app;
grant usage, select on all sequences in schema hub to hub_app;
alter default privileges in schema hub grant select, insert, update, delete on tables to hub_app;
alter default privileges in schema hub grant usage, select on sequences to hub_app;
-- La auditoría solo crece.
revoke update, delete on hub.auditoria from hub_app;

-- --- Semilla: los portales que ya existen -----------------------------------
insert into hub.portales (nombre, url, descripcion, color, estado, rol_acceso, orden) values
  ('EvePay · Consola',        'https://admin.evepay.evetev.com', 'Operación de pagos: comercios, dispersión, riesgo.', '#4b3075', 'beta',     'super_admin · ops · finanzas', 10),
  ('EveConecta',              'https://conecta.evetev.com',       'Propiedad horizontal: cuotas y cobros vía EvePay.',   '#1D4ED8', 'operando', 'admin', 20),
  ('EveLedger',               'https://eveledger.vercel.app',     'Estaciones de servicio (MVP con cliente).',           '#15803D', 'operando', 'admin', 30),
  ('evetev.com',              'https://evetev.com',               'Sitio corporativo y landings.',                       '#0A2540', 'operando', 'editor', 40),
  ('GitHub · Evetev',         'https://github.com/EveTevSas/evetevbrain', 'Monorepo, CI, specs y documentación.',                '#1b1b24', 'operando', 'owner', 50),
  ('Supabase · EvePay',       'https://supabase.com/dashboard',   'Base y Auth de EvePay y del Hub.',                    '#3ECF8E', 'operando', 'owner', 60),
  ('Vercel',                  'https://vercel.com',               'Despliegues de las apps Next.',                       '#000000', 'operando', 'owner', 70)
on conflict (nombre) do nothing;
