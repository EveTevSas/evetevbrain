-- Ficha de un comercio concreto para la consola.
--
-- Sin esto, mostrar un comercio obligaba a pedir la lista entera y buscarlo en
-- memoria: con veinte comercios da igual, con quinientos son quinientas filas
-- más sus claves en cada apertura de la ficha.
--
-- Devuelve la misma forma que admin_listar_comercios() para que la consola no
-- tenga que entender dos estructuras distintas del mismo objeto.
create or replace function identity.admin_comercio(p_tenant uuid)
returns table (
  tenant_id       uuid,
  legal_name      text,
  display_name    text,
  tenant_status   text,
  creado_en       timestamptz,
  merchant_id     uuid,
  merchant_status text,
  key_prefix      text,
  key_environment text,
  key_activa      boolean
)
language sql
security definer
set search_path = identity, evepay, pg_temp
stable
as $$
  select
    t.id, t.legal_name, t.display_name, t.status, t.created_at,
    m.id, m.status, k.key_prefix, k.environment, k.activa
  from identity.tenants t
  left join evepay.merchants m on m.tenant_id = t.id
  left join identity.merchant_api_keys k on k.tenant_id = t.id
  where t.id = p_tenant
  order by k.creada_en desc nulls last;
$$;

grant execute on function identity.admin_comercio(uuid) to evepay_api;
