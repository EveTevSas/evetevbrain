-- Auditoría de las acciones de la consola de administración.
-- Spec: specs/evepay/admin-console/ (CA-4, CA-5).
--
-- POR QUÉ UNA TABLA APARTE. evepay.payment_audit registra las transiciones de
-- un cobro y vive dentro de su tenant. Esto es otra cosa: quién del equipo de
-- Evetev hizo qué, a través de todos los comercios. No pertenece a ningún
-- tenant, así que no puede llevar la política de aislamiento de las demás.
--
-- CÓMO SE PROTEGE. La tabla queda con RLS activo y SIN ninguna política: eso
-- niega el acceso directo incluso al rol de la API. Lo único que entra o sale
-- son las dos funciones SECURITY DEFINER de abajo, que son el contrato. Así el
-- rastro no se puede leer ni escribir por accidente desde otra consulta.

create table if not exists audit.admin_actions (
  id          uuid primary key default gen_random_uuid(),
  -- Quién: el correo del super_admin (o su `sub` si el token no lo trae).
  actor       text not null,
  -- Qué: verbo estable y consultable, p. ej. 'comercio.crear'.
  accion      text not null,
  -- Sobre qué recayó: tipo ('tenant', 'api_key', 'pago') e identificador.
  objeto_tipo text,
  objeto_id   text,
  -- Detalle no sensible. NUNCA claves ni secretos: de una API key se guarda su
  -- prefijo, que es justo lo que se puede mostrar en pantalla.
  detalle     jsonb not null default '{}'::jsonb,
  creado_en   timestamptz not null default now()
);

create index if not exists admin_actions_creado_idx on audit.admin_actions (creado_en desc);
create index if not exists admin_actions_objeto_idx on audit.admin_actions (objeto_tipo, objeto_id);

-- Inmutabilidad: un rastro que se puede editar no es un rastro. Mensaje propio
-- porque el de 0001 nombra a payment_audit.
create or replace function audit.registro_inmutable() returns trigger
language plpgsql as $$
begin
  raise exception 'La auditoría es inmutable: no se permite % sobre %', tg_op, tg_table_name;
end $$;

drop trigger if exists admin_actions_inmutable on audit.admin_actions;
create trigger admin_actions_inmutable before update or delete on audit.admin_actions
  for each row execute function audit.registro_inmutable();

alter table audit.admin_actions enable row level security;

-- ---------------------------------------------------------------------------
-- El único camino de escritura. Devuelve el id para que quien la llama pueda
-- referirlo; si esto falla, la acción que la invocó debe fallar también (CA-5).
-- ---------------------------------------------------------------------------
create or replace function audit.registrar_accion_admin(
  p_actor       text,
  p_accion      text,
  p_objeto_tipo text default null,
  p_objeto_id   text default null,
  p_detalle     jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = audit, pg_temp
as $$
declare v_id uuid;
begin
  if coalesce(trim(p_actor), '') = '' or coalesce(trim(p_accion), '') = '' then
    raise exception 'La auditoría exige actor y acción';
  end if;

  insert into audit.admin_actions (actor, accion, objeto_tipo, objeto_id, detalle)
  values (p_actor, p_accion, p_objeto_tipo, p_objeto_id, coalesce(p_detalle, '{}'::jsonb))
  returning id into v_id;

  return v_id;
end $$;

-- El único camino de lectura (para la consola).
create or replace function audit.admin_listar_acciones(p_limite int default 100)
returns table (
  id          uuid,
  actor       text,
  accion      text,
  objeto_tipo text,
  objeto_id   text,
  detalle     jsonb,
  creado_en   timestamptz
)
language sql
security definer
set search_path = audit, pg_temp
stable
as $$
  select a.id, a.actor, a.accion, a.objeto_tipo, a.objeto_id, a.detalle, a.creado_en
  from audit.admin_actions a
  order by a.creado_en desc
  limit least(greatest(coalesce(p_limite, 100), 1), 500);
$$;

grant usage on schema audit to evepay_api;
grant execute on function audit.registrar_accion_admin(text, text, text, text, jsonb) to evepay_api;
grant execute on function audit.admin_listar_acciones(int) to evepay_api;

-- ---------------------------------------------------------------------------
-- Fase B: desactivar un comercio exige poder cambiar su estado. Hasta ahora el
-- rol de la API solo podía leer e insertar tenants.
-- ---------------------------------------------------------------------------
grant update on identity.tenants to evepay_api;

-- ---------------------------------------------------------------------------
-- CA-10: un comercio desactivado no puede cobrar.
--
-- Hasta ahora `activa` solo miraba la clave: desactivar el tenant cambiaba su
-- estado en pantalla pero sus claves seguían cobrando, que es exactamente lo
-- que la desactivación viene a impedir. Ahora la clave sirve solo si además su
-- comercio está activo.
--
-- Se resuelve aquí y no en la API a propósito: es la única puerta por la que
-- entra una API key, así que cualquier endpoint futuro queda cubierto sin que
-- nadie tenga que acordarse de comprobarlo.
-- ---------------------------------------------------------------------------
create or replace function identity.validar_api_key(p_hash text)
returns table(tenant_id uuid, activa boolean)
language sql
security definer
stable
as $$
  select k.tenant_id, (k.activa and t.status = 'activo') as activa
  from identity.merchant_api_keys k
  join identity.tenants t on t.id = k.tenant_id
  where k.key_hash = p_hash
  limit 1;
$$;

grant execute on function identity.validar_api_key(text) to evepay_api;
