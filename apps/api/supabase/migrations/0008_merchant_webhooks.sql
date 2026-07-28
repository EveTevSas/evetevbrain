-- Fase 6e: webhooks salientes a comercios.
-- Cuando un pago cambia de estado, EvePay firma y envía un evento HTTP al comercio.

CREATE TABLE evepay.merchant_webhooks (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID    NOT NULL REFERENCES identity.tenants(id) ON DELETE CASCADE,
  url         TEXT    NOT NULL,
  secret      TEXT    NOT NULL,   -- secreto de firma (mostrado una sola vez al registrar)
  events      TEXT[]  NOT NULL DEFAULT ARRAY['payment.completed','payment.failed'],
  activa      BOOLEAN NOT NULL DEFAULT true,
  creada_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE evepay.merchant_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON evepay.merchant_webhooks
  USING  (tenant_id = app_current_tenant())
  WITH CHECK (tenant_id = app_current_tenant());

GRANT SELECT, INSERT, UPDATE ON evepay.merchant_webhooks TO evepay_api;

-- Función SECURITY DEFINER para que el servicio de entrega resuelva
-- la config del webhook dado el tenant_id del pago (sin exponer otras filas).
CREATE OR REPLACE FUNCTION evepay.webhook_config_por_tenant(p_tenant_id UUID)
RETURNS TABLE(id UUID, url TEXT, secret TEXT, events TEXT[], activa BOOLEAN)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id, url, secret, events, activa
  FROM evepay.merchant_webhooks
  WHERE tenant_id = p_tenant_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION evepay.webhook_config_por_tenant(UUID) TO evepay_api;
