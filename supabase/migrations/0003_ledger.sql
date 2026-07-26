-- EvePay — Fase 3: ledger inmutable de doble partida
-- La verdad contable de cada peso (§2). Asientos con líneas balanceadas,
-- inmutables, y saldo reconstruible desde los movimientos.

-- ---------------------------------------------------------------------------
-- evepay.ledger_entries  (asiento; agrupa líneas)
-- ---------------------------------------------------------------------------
create table if not exists evepay.ledger_entries (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references identity.tenants(id),
  payment_id uuid,
  kind       text not null,
  memo       text not null default '',
  posted_at  timestamptz not null default now()
);
create index if not exists ledger_entries_tenant_idx on evepay.ledger_entries(tenant_id);
-- Idempotencia: un mismo hecho contable de un pago no se asienta dos veces.
create unique index if not exists ledger_entries_payment_kind_uq
  on evepay.ledger_entries(tenant_id, payment_id, kind)
  where payment_id is not null;

-- ---------------------------------------------------------------------------
-- evepay.ledger_lines  (débitos y créditos del asiento)
-- ---------------------------------------------------------------------------
create table if not exists evepay.ledger_lines (
  id           uuid primary key default gen_random_uuid(),
  entry_id     uuid not null references evepay.ledger_entries(id),
  tenant_id    uuid not null references identity.tenants(id),
  account      text not null,
  direction    text not null check (direction in ('debit','credit')),
  amount_minor bigint not null check (amount_minor > 0)  -- centavos, nunca float
);
create index if not exists ledger_lines_entry_idx on evepay.ledger_lines(entry_id);
create index if not exists ledger_lines_account_idx on evepay.ledger_lines(tenant_id, account);

-- ---------------------------------------------------------------------------
-- RLS + inmutabilidad (reutiliza audit_is_immutable() de 0001)
-- ---------------------------------------------------------------------------
alter table evepay.ledger_entries enable row level security;
alter table evepay.ledger_lines   enable row level security;

drop policy if exists tenant_isolation on evepay.ledger_entries;
create policy tenant_isolation on evepay.ledger_entries
  using (tenant_id = app_current_tenant()) with check (tenant_id = app_current_tenant());

drop policy if exists tenant_isolation on evepay.ledger_lines;
create policy tenant_isolation on evepay.ledger_lines
  using (tenant_id = app_current_tenant()) with check (tenant_id = app_current_tenant());

drop trigger if exists ledger_entries_immutable on evepay.ledger_entries;
create trigger ledger_entries_immutable before update or delete on evepay.ledger_entries
  for each row execute function audit_is_immutable();

drop trigger if exists ledger_lines_immutable on evepay.ledger_lines;
create trigger ledger_lines_immutable before update or delete on evepay.ledger_lines
  for each row execute function audit_is_immutable();

grant select, insert on evepay.ledger_entries to evepay_api;
grant select, insert on evepay.ledger_lines   to evepay_api;
