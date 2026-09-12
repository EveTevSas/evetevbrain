-- Solidez antes de producción (Fase 8): RLS en identity.tenants y la FK de
-- payments → merchants validada.
--
-- identity.tenants era la única tabla del núcleo sin RLS: el rol de la API
-- podía leer y escribir cualquier comercio con una consulta directa. Ahora la
-- política deja ver solo el tenant de la sesión, y las operaciones de la
-- consola (crear, renombrar, cambiar estado) pasan por funciones SECURITY
-- DEFINER con nombre, como el resto de lo que cruza comercios. El rastro de
-- auditoría lo sigue dejando la API en la misma transacción.

alter table identity.tenants enable row level security;

drop policy if exists tenant_isolation on identity.tenants;
create policy tenant_isolation on identity.tenants
  using (id = app_current_tenant());

-- Sin escritura directa: solo por las funciones de abajo.
revoke insert, update on identity.tenants from evepay_api;

create or replace function identity.admin_crear_tenant(p_legal_name text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = identity, pg_temp
as $$
declare v_id uuid;
begin
  if length(trim(p_legal_name)) < 3 or length(trim(p_display_name)) < 2 then
    raise exception 'La razón social y el nombre visible son obligatorios' using errcode = 'check_violation';
  end if;
  insert into identity.tenants (legal_name, display_name) values (trim(p_legal_name), trim(p_display_name))
  returning id into v_id;
  return v_id;
end $$;

create or replace function identity.admin_tenant_existe(p_tenant uuid)
returns boolean
language sql
security definer
set search_path = identity, pg_temp
stable
as $$
  select exists (select 1 from identity.tenants where id = p_tenant);
$$;

-- Devuelve los nombres ANTERIORES (bloqueando la fila), para que el rastro
-- diga exactamente qué se reemplazó; null si el comercio no existe.
create or replace function identity.admin_renombrar_tenant(p_tenant uuid, p_legal_name text, p_display_name text)
returns table (legal_name text, display_name text)
language plpgsql
security definer
set search_path = identity, pg_temp
as $$
declare v record;
begin
  select t.legal_name, t.display_name into v from identity.tenants t where t.id = p_tenant for update;
  if not found then
    return;
  end if;
  update identity.tenants set legal_name = trim(p_legal_name), display_name = trim(p_display_name), updated_at = now()
  where id = p_tenant;
  legal_name := v.legal_name;
  display_name := v.display_name;
  return next;
end $$;

-- Devuelve el estado nuevo, o null si el comercio no existe.
create or replace function identity.admin_cambiar_estado_tenant(p_tenant uuid, p_estado text)
returns text
language plpgsql
security definer
set search_path = identity, pg_temp
as $$
declare v_estado text;
begin
  if p_estado not in ('activo', 'inactivo') then
    raise exception 'Estado de comercio inválido: %', p_estado using errcode = 'check_violation';
  end if;
  update identity.tenants set status = p_estado, updated_at = now() where id = p_tenant
  returning status into v_estado;
  return v_estado;
end $$;

grant execute on function identity.admin_crear_tenant(text, text) to evepay_api;
grant execute on function identity.admin_tenant_existe(uuid) to evepay_api;
grant execute on function identity.admin_renombrar_tenant(uuid, text, text) to evepay_api;
grant execute on function identity.admin_cambiar_estado_tenant(uuid, text) to evepay_api;

-- ---------------------------------------------------------------------------
-- payments.merchant_id → merchants.id quedó NOT VALID en 0004. Si hubiera
-- cobros huérfanos la validación fallaría a mitad del despliegue con un
-- mensaje críptico; mejor decirlo claro y no aplicar la migración.
-- ---------------------------------------------------------------------------
do $$
declare v_huerfanos int;
begin
  select count(*) into v_huerfanos
  from evepay.payments p left join evepay.merchants m on m.id = p.merchant_id
  where m.id is null;
  if v_huerfanos > 0 then
    raise exception 'Hay % cobros cuyo merchant_id no existe en evepay.merchants: corrígelos antes de validar la FK', v_huerfanos;
  end if;
  alter table evepay.payments validate constraint payments_merchant_id_fkey;
end $$;
