-- Grants faltantes para evepay_api (detectados en Fase 6b).
-- Las migraciones anteriores omitieron los permisos de INSERT en identity.tenants
-- y SELECT/INSERT en evepay.merchants.

GRANT USAGE ON SCHEMA identity TO evepay_api;
GRANT USAGE ON SCHEMA evepay  TO evepay_api;

-- identity.tenants: la API necesita crear tenants (admin) y leerlos (auth).
GRANT SELECT, INSERT ON identity.tenants TO evepay_api;

-- evepay.merchants: SELECT para buscar, INSERT para crear (el UPDATE ya estaba en 0004).
GRANT SELECT, INSERT ON evepay.merchants TO evepay_api;

-- evepay.payments: SELECT + INSERT + UPDATE para el ciclo completo de cobros.
GRANT SELECT, INSERT, UPDATE ON evepay.payments          TO evepay_api;
GRANT SELECT, INSERT          ON evepay.payment_idempotency TO evepay_api;
GRANT SELECT, INSERT          ON evepay.payment_audit    TO evepay_api;
