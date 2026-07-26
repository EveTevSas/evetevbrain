-- EvePay — Fase 2: webhooks del proveedor
-- Idempotencia de eventos + resolución del tenant de un cobro para el webhook
-- (operación de sistema, sin tenant del llamante).

-- ---------------------------------------------------------------------------
-- evepay.webhook_events  (idempotencia por event_id)
-- ---------------------------------------------------------------------------
create table if not exists evepay.webhook_events (
  event_id   text primary key,             -- id del evento del proveedor (único global)
  tenant_id  uuid not null references identity.tenants(id),
  provider   text not null default 'akua',
  type       text not null,
  at         timestamptz not null default now()
);
create index if not exists webhook_events_tenant_idx on evepay.webhook_events(tenant_id);

alter table evepay.webhook_events enable row level security;
drop policy if exists tenant_isolation on evepay.webhook_events;
create policy tenant_isolation on evepay.webhook_events
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());

grant select, insert on evepay.webhook_events to evepay_api;

-- ---------------------------------------------------------------------------
-- evepay.tenant_of_payment(provider_payment_id)
-- El webhook no trae tenant; lo resuelve por el id del proveedor. Como esa
-- búsqueda cruza tenants, va en una función SECURITY DEFINER (corre como owner,
-- controlada y mínima). La escritura posterior sí va acotada por RLS (SET LOCAL).
-- ---------------------------------------------------------------------------
create or replace function evepay.tenant_of_payment(p_provider_payment_id text)
returns table(payment_id uuid, tenant_id uuid, status text)
language sql
security definer
set search_path = evepay, public
as $$
  select id, tenant_id, status
  from evepay.payments
  where provider_payment_id = p_provider_payment_id
  limit 1;
$$;

grant execute on function evepay.tenant_of_payment(text) to evepay_api;
