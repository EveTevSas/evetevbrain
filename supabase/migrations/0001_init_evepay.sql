-- EvePay — esquema inicial (Fase 0 + 1)
-- Cimientos no-reescribibles (§1, §4): multi-tenancy con RLS + idempotencia/auditoría.
--
-- Aislamiento por tenant: el backend hace `SET LOCAL app.tenant_id = '<uuid>'`
-- al inicio de cada transacción; las políticas RLS filtran por ese valor.
-- IMPORTANTE: el rol con el que conecta la API NO debe ser owner ni BYPASSRLS,
-- de lo contrario las políticas se ignoran. Ver supabase/README.md.

-- ---------------------------------------------------------------------------
-- Schemas
-- ---------------------------------------------------------------------------
create schema if not exists identity;   -- tenants (= comercios) y auth
create schema if not exists evepay;      -- dominio de la plataforma de pagos
create schema if not exists audit;       -- auditoría transversal

-- Helper: tenant actual desde la variable de sesión (null-safe).
create or replace function app_current_tenant() returns uuid
language sql stable as $$
  select nullif(current_setting('app.tenant_id', true), '')::uuid
$$;

-- ---------------------------------------------------------------------------
-- identity.tenants  (el comercio es el tenant de EvePay)
-- ---------------------------------------------------------------------------
create table if not exists identity.tenants (
  id            uuid primary key default gen_random_uuid(),
  legal_name    text not null,
  display_name  text not null,
  status        text not null default 'activo',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- evepay.merchants  (comercio dentro del tenant; se mapea al merchant de Akua)
-- ---------------------------------------------------------------------------
create table if not exists evepay.merchants (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references identity.tenants(id),
  legal_name  text not null,
  provider    text not null default 'akua',
  status      text not null default 'pendiente',
  created_at  timestamptz not null default now()
);
create index if not exists merchants_tenant_idx on evepay.merchants(tenant_id);

-- ---------------------------------------------------------------------------
-- evepay.payments  (el cobro; máquina de estados)
--   creado -> pendiente -> aprobado | fallido -> conciliado
-- ---------------------------------------------------------------------------
create table if not exists evepay.payments (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references identity.tenants(id),
  merchant_id         uuid not null,
  amount_minor        bigint not null check (amount_minor > 0),  -- centavos, nunca float
  currency            text not null,
  reference           text not null,
  description         text,
  status              text not null default 'pendiente',
  provider            text not null default 'akua',
  provider_payment_id text,
  checkout_url        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists payments_tenant_idx on evepay.payments(tenant_id);

-- ---------------------------------------------------------------------------
-- evepay.payment_idempotency  (dedupe de creación de cobros)
--   UNIQUE por (tenant_id, idempotency_key) — la DB garantiza la unicidad,
--   resolviendo la concurrencia (criterio EARS 7).
-- ---------------------------------------------------------------------------
create table if not exists evepay.payment_idempotency (
  tenant_id       uuid not null references identity.tenants(id),
  idempotency_key text not null,
  request_hash    text not null,
  payment_id      uuid not null references evepay.payments(id),
  created_at      timestamptz not null default now(),
  primary key (tenant_id, idempotency_key)
);

-- ---------------------------------------------------------------------------
-- evepay.payment_audit  (append-only; cada transición de estado)
-- ---------------------------------------------------------------------------
create table if not exists evepay.payment_audit (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references identity.tenants(id),
  payment_id  uuid not null references evepay.payments(id),
  from_status text,
  to_status   text not null,
  actor       text not null,
  data        jsonb,
  at          timestamptz not null default now()
);
create index if not exists payment_audit_payment_idx on evepay.payment_audit(payment_id);

-- Blindaje del append-only: sin UPDATE ni DELETE en la auditoría.
create or replace function audit_is_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'payment_audit es inmutable: no se permite % ', tg_op;
end $$;

drop trigger if exists payment_audit_no_update on evepay.payment_audit;
create trigger payment_audit_no_update before update or delete on evepay.payment_audit
  for each row execute function audit_is_immutable();

-- ---------------------------------------------------------------------------
-- RLS — aislamiento por tenant (§4). Test obligatorio: A jamás ve filas de B.
-- ---------------------------------------------------------------------------
alter table evepay.merchants          enable row level security;
alter table evepay.payments           enable row level security;
alter table evepay.payment_idempotency enable row level security;
alter table evepay.payment_audit      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['merchants','payments','payment_idempotency','payment_audit']
  loop
    execute format($f$
      drop policy if exists tenant_isolation on evepay.%1$I;
      create policy tenant_isolation on evepay.%1$I
        using (tenant_id = app_current_tenant())
        with check (tenant_id = app_current_tenant());
    $f$, t);
  end loop;
end $$;
