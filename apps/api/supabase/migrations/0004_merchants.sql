-- EvePay — Fase 5: onboarding de comercios (merchants)

-- Id del comercio en el proveedor (Akua) para correlacionar el webhook.
alter table evepay.merchants add column if not exists provider_merchant_id text;

-- Resolución cross-tenant del comercio por su id de proveedor (para el webhook,
-- que se autentica por firma, no por tenant). SECURITY DEFINER, mínima y controlada.
create or replace function evepay.merchant_by_provider(p_provider_merchant_id text)
returns table(merchant_id uuid, tenant_id uuid, status text)
language sql
security definer
set search_path = evepay, public
as $$
  select id, tenant_id, status
  from evepay.merchants
  where provider_merchant_id = p_provider_merchant_id
  limit 1;
$$;

grant execute on function evepay.merchant_by_provider(text) to evepay_api;
grant update on evepay.merchants to evepay_api;
