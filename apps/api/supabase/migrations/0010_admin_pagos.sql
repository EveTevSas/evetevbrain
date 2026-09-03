-- Consultas de pagos para la consola de administración.
-- Spec: specs/evepay/admin-console/ (CA-15, CA-16).
--
-- Cross-tenant como el resto de lo administrativo: funciones SECURITY DEFINER
-- explícitas, nunca un rol que se salte RLS (§4). Cada función acota lo que
-- devuelve; no hay una que exponga "todo".

-- ---------------------------------------------------------------------------
-- CA-16: la línea de tiempo de un cobro necesita saber qué webhooks lo tocaron.
--
-- webhook_events guardaba tenant y tipo, pero no A QUÉ COBRO se refería el
-- evento, así que no había forma de reconstruir la historia de un pago. Se
-- añade la referencia; las filas anteriores se quedan en null, que es lo
-- honesto: de esas no lo sabemos.
--
-- `recibido_veces` cuenta los reenvíos. Hasta ahora un evento repetido se
-- descartaba en silencio y no quedaba rastro de que hubiera llegado. Que un
-- proveedor reenvíe cinco veces el mismo evento es justo el tipo de dato que
-- se busca cuando algo va raro.
-- ---------------------------------------------------------------------------
alter table evepay.webhook_events
  add column if not exists payment_id uuid references evepay.payments(id),
  add column if not exists recibido_veces int not null default 1,
  add column if not exists ultimo_en timestamptz;

create index if not exists webhook_events_payment_idx on evepay.webhook_events(payment_id);

grant update on evepay.webhook_events to evepay_api;

-- ---------------------------------------------------------------------------
-- CA-15: listado cross-tenant con filtros. La paginación va por keyset
-- (created_at, id) y no por OFFSET: con OFFSET, insertar un cobro mientras
-- alguien pagina desplaza las filas y se saltan o repiten registros — en una
-- lista de dinero eso se lee como un cobro perdido.
-- ---------------------------------------------------------------------------
create or replace function evepay.admin_listar_pagos(
  p_tenant      uuid    default null,
  p_estado      text    default null,
  p_desde       timestamptz default null,
  p_hasta       timestamptz default null,
  p_referencia  text    default null,
  p_limite      int     default 50,
  p_cursor_at   timestamptz default null,
  p_cursor_id   uuid    default null
)
returns table (
  id                  uuid,
  tenant_id           uuid,
  tenant_nombre       text,
  merchant_id         uuid,
  amount_minor        bigint,
  currency            text,
  reference           text,
  descripcion         text,
  status              text,
  provider            text,
  provider_payment_id text,
  created_at          timestamptz,
  updated_at          timestamptz
)
language sql
security definer
set search_path = evepay, identity, pg_temp
stable
as $$
  select
    p.id, p.tenant_id, t.display_name as tenant_nombre, p.merchant_id,
    p.amount_minor, p.currency, p.reference, p.description as descripcion,
    p.status, p.provider, p.provider_payment_id, p.created_at, p.updated_at
  from evepay.payments p
  join identity.tenants t on t.id = p.tenant_id
  where (p_tenant     is null or p.tenant_id = p_tenant)
    and (p_estado     is null or p.status = p_estado)
    and (p_desde      is null or p.created_at >= p_desde)
    and (p_hasta      is null or p.created_at <  p_hasta)
    and (p_referencia is null or p.reference ilike '%' || p_referencia || '%')
    and (
      p_cursor_at is null
      or (p.created_at, p.id) < (p_cursor_at, coalesce(p_cursor_id, p.id))
    )
  order by p.created_at desc, p.id desc
  limit least(greatest(coalesce(p_limite, 50), 1), 200);
$$;

grant execute on function evepay.admin_listar_pagos(
  uuid, text, timestamptz, timestamptz, text, int, timestamptz, uuid
) to evepay_api;

-- ---------------------------------------------------------------------------
-- CA-16: la historia completa de un cobro en una sola consulta, ordenada.
-- Tres orígenes distintos —transiciones, webhooks y asientos— unificados en la
-- misma forma para que la consola no tenga que cuadrarlos a mano.
-- ---------------------------------------------------------------------------
create or replace function evepay.admin_pago_timeline(p_payment uuid)
returns table (
  momento  timestamptz,
  origen   text,
  titulo   text,
  detalle  jsonb
)
language sql
security definer
set search_path = evepay, pg_temp
stable
as $$
  -- Transiciones de estado (quién la aplicó y desde dónde).
  select a.at as momento,
         'transicion'::text as origen,
         coalesce(a.from_status, 'nuevo') || ' → ' || a.to_status as titulo,
         jsonb_build_object('actor', a.actor, 'data', a.data) as detalle
  from evepay.payment_audit a
  where a.payment_id = p_payment

  union all

  -- Webhooks del proveedor, con cuántas veces llegó cada uno.
  select coalesce(w.ultimo_en, w.at) as momento,
         'webhook'::text,
         w.type,
         jsonb_build_object(
           'eventId', w.event_id,
           'provider', w.provider,
           'recibidoVeces', w.recibido_veces,
           'primeraVez', w.at
         )
  from evepay.webhook_events w
  where w.payment_id = p_payment

  union all

  -- Asientos contables ligados al cobro, con sus líneas.
  select e.posted_at,
         'ledger'::text,
         e.kind,
         jsonb_build_object(
           'memo', e.memo,
           'lineas', (
             select coalesce(jsonb_agg(jsonb_build_object(
                      'cuenta', l.account,
                      'direccion', l.direction,
                      'montoMinor', l.amount_minor
                    ) order by l.direction), '[]'::jsonb)
             from evepay.ledger_lines l where l.entry_id = e.id
           )
         )
  from evepay.ledger_entries e
  where e.payment_id = p_payment

  order by 1 asc;
$$;

grant execute on function evepay.admin_pago_timeline(uuid) to evepay_api;

-- Un cobro concreto, cross-tenant, para la vista de detalle.
create or replace function evepay.admin_pago(p_payment uuid)
returns table (
  id                  uuid,
  tenant_id           uuid,
  tenant_nombre       text,
  merchant_id         uuid,
  amount_minor        bigint,
  currency            text,
  reference           text,
  descripcion         text,
  status              text,
  provider            text,
  provider_payment_id text,
  checkout_url        text,
  created_at          timestamptz,
  updated_at          timestamptz
)
language sql
security definer
set search_path = evepay, identity, pg_temp
stable
as $$
  select
    p.id, p.tenant_id, t.display_name, p.merchant_id, p.amount_minor, p.currency,
    p.reference, p.description, p.status, p.provider, p.provider_payment_id,
    p.checkout_url, p.created_at, p.updated_at
  from evepay.payments p
  join identity.tenants t on t.id = p.tenant_id
  where p.id = p_payment;
$$;

grant execute on function evepay.admin_pago(uuid) to evepay_api;
