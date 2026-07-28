-- Fase 6b: funciones SECURITY DEFINER para el panel admin de Evetev.
-- El panel necesita leer datos cross-tenant (todos los comercios) sin filtro RLS.
-- Solo el rol evepay_api puede ejecutarlas; protegidas adicionalmente por ADMIN_SECRET en la API.

CREATE OR REPLACE FUNCTION identity.admin_listar_comercios()
RETURNS TABLE (
  tenant_id       UUID,
  legal_name      TEXT,
  display_name    TEXT,
  tenant_status   TEXT,
  creado_en       TIMESTAMPTZ,
  merchant_id     UUID,
  merchant_status TEXT,
  key_prefix      TEXT,
  key_environment TEXT,
  key_activa      BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    t.id               AS tenant_id,
    t.legal_name,
    t.display_name,
    t.status           AS tenant_status,
    t.created_at       AS creado_en,
    m.id               AS merchant_id,
    m.status           AS merchant_status,
    k.key_prefix,
    k.environment      AS key_environment,
    k.activa           AS key_activa
  FROM identity.tenants t
  LEFT JOIN evepay.merchants m  ON m.tenant_id = t.id
  LEFT JOIN identity.merchant_api_keys k ON k.tenant_id = t.id
  ORDER BY t.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION identity.admin_listar_comercios() TO evepay_api;
