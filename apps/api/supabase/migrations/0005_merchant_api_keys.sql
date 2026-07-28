-- Fase 6a: credenciales de autenticación de comercios.
-- La clave real NUNCA se almacena; solo el hash SHA-256 (§4).

CREATE TABLE identity.merchant_api_keys (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID    NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
  key_hash      TEXT    NOT NULL UNIQUE,
  key_prefix    TEXT    NOT NULL,                           -- primeros 16 chars para la UI
  environment   TEXT    NOT NULL DEFAULT 'live'
                        CHECK (environment IN ('live', 'test')),
  label         TEXT,
  activa        BOOLEAN NOT NULL DEFAULT true,
  creada_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: el rol evepay_api solo puede leer/escribir sus propias keys.
ALTER TABLE identity.merchant_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_own_tenant"
  ON identity.merchant_api_keys
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- El rol de la API necesita acceso para validar keys entrantes.
-- El SELECT sin RLS lo maneja una función SECURITY DEFINER que no expone otras keys.
GRANT SELECT ON identity.merchant_api_keys TO evepay_api;
GRANT INSERT, UPDATE ON identity.merchant_api_keys TO evepay_api;

-- Función SECURITY DEFINER para validar una key sin filtro de tenant (la key
-- es la única credencial — no sabemos el tenant hasta validarla).
CREATE OR REPLACE FUNCTION identity.validar_api_key(p_hash TEXT)
RETURNS TABLE(tenant_id UUID, activa BOOLEAN)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id, activa
  FROM identity.merchant_api_keys
  WHERE key_hash = p_hash
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION identity.validar_api_key(TEXT) TO evepay_api;
