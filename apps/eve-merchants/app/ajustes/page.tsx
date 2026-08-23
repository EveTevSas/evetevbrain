"use client";
import { useEffect, useState } from "react";
import { api, ApiError, type WebhookEndpoint } from "@/lib/api";
import { getApiKey } from "@/lib/auth";

export default function AjustesPage() {
  const [webhook, setWebhook] = useState<WebhookEndpoint | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const key = getApiKey();
    if (!key) return;
    api.webhooks
      .obtener(key)
      .then(setWebhook)
      .catch((e: ApiError) => {
        if (e.status !== 404) console.error(e);
      })
      .finally(() => setLoading(false));
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const key = getApiKey();
    if (!key || !url) return;
    setSaving(true);
    setMsg(null);
    try {
      if (webhook) {
        const updated = await api.webhooks.actualizar(key, { url });
        setWebhook(updated);
        setMsg({ ok: true, text: "URL actualizada correctamente." });
      } else {
        const created = await api.webhooks.registrar(key, url);
        setWebhook(created);
        setSecret(created.secret ?? null);
        setMsg({
          ok: true,
          text: "Endpoint registrado. Guarda el secreto — no se mostrará de nuevo."
        });
      }
      setUrl("");
    } catch {
      setMsg({ ok: false, text: "Error al guardar. Verifica la URL e intenta de nuevo." });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivo() {
    const key = getApiKey();
    if (!key || !webhook) return;
    const updated = await api.webhooks
      .actualizar(key, { activa: !webhook.activa })
      .catch(() => null);
    if (updated) setWebhook(updated);
  }

  const codeStyle: React.CSSProperties = {
    background: "var(--eve-tinte)",
    padding: "0.15rem 0.4rem",
    borderRadius: 4,
    fontSize: "0.82em",
    fontFamily: "'JetBrains Mono', monospace",
    color: "var(--eve-azul-noche)"
  };

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ marginBottom: "0.25rem" }}>Ajustes</h1>
        <p style={{ color: "var(--eve-pizarra)", fontSize: "0.875rem" }}>
          Configura tu endpoint de webhooks.
        </p>
      </div>

      {/* Webhook endpoint */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginBottom: "0.25rem" }}>Webhook endpoint</h2>
        <p style={{ margin: "0 0 1.25rem", fontSize: "0.85rem", color: "var(--eve-pizarra)" }}>
          EvePay enviará eventos <code style={codeStyle}>payment.completed</code> y{" "}
          <code style={codeStyle}>payment.failed</code> a esta URL.
        </p>

        {loading ? (
          <div style={{ color: "var(--eve-pizarra)", fontSize: "0.875rem" }}>Cargando...</div>
        ) : (
          <>
            {webhook && (
              <div
                style={{
                  background: "var(--eve-tinte)",
                  border: "1px solid var(--eve-linea)",
                  borderRadius: 10,
                  padding: "1rem",
                  marginBottom: "1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <p
                    style={{
                      margin: "0 0 0.25rem",
                      fontWeight: 600,
                      color: "var(--eve-azul-noche)",
                      fontSize: "0.875rem"
                    }}
                  >
                    Endpoint actual
                  </p>
                  <p
                    className="mono"
                    style={{
                      margin: "0 0 0.5rem",
                      color: "var(--eve-pizarra)",
                      fontSize: "0.8rem"
                    }}
                  >
                    {webhook.url}
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span className={`pill ${webhook.activa ? "pill-green" : "pill-gray"}`}>
                      {webhook.activa ? "Activo" : "Inactivo"}
                    </span>
                    <button
                      onClick={toggleActivo}
                      className="btn btn-ghost"
                      style={{ fontSize: "0.75rem", padding: "0.2rem 0.75rem" }}
                    >
                      {webhook.activa ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Secreto: se muestra una sola vez */}
            {secret && (
              <div
                style={{
                  background: "#fef9c3",
                  border: "1px solid #fde047",
                  borderRadius: 10,
                  padding: "1rem",
                  marginBottom: "1.25rem"
                }}
              >
                <p
                  style={{
                    margin: "0 0 0.5rem",
                    fontWeight: 700,
                    color: "#854d0e",
                    fontSize: "0.85rem"
                  }}
                >
                  ⚠ Guarda este secreto — no se mostrará de nuevo
                </p>
                <p
                  className="mono"
                  style={{
                    margin: "0 0 0.75rem",
                    background: "#fff",
                    padding: "0.5rem 0.75rem",
                    borderRadius: 6,
                    fontSize: "0.8rem",
                    wordBreak: "break-all",
                    color: "var(--eve-azul-noche)"
                  }}
                >
                  {secret}
                </p>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#92400e" }}>
                  Úsalo para verificar la firma <code style={codeStyle}>evepay-signature</code> en
                  cada evento recibido.
                </p>
              </div>
            )}

            <form
              onSubmit={guardar}
              style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}
            >
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--eve-azul-noche)",
                    marginBottom: "0.25rem"
                  }}
                >
                  {webhook ? "Nueva URL" : "URL del endpoint"}
                </label>
                <input
                  className="input"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://mi-sistema.com/webhooks/evepay"
                  required
                />
              </div>
              <button className="btn btn-cta" type="submit" disabled={saving || !url}>
                {saving ? "Guardando..." : webhook ? "Actualizar URL" : "Registrar endpoint"}
              </button>
            </form>

            {msg && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem",
                  borderRadius: 8,
                  background: msg.ok ? "#dcfce7" : "#fee2e2",
                  color: msg.ok ? "var(--eve-exito)" : "var(--eve-error)",
                  fontSize: "0.85rem"
                }}
              >
                {msg.text}
              </div>
            )}
          </>
        )}
      </div>

      {/* Docs de firma */}
      <div className="card">
        <h2 style={{ marginBottom: "0.5rem" }}>Cómo verificar la firma</h2>
        <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "var(--eve-pizarra)" }}>
          Cada evento incluye el header <code style={codeStyle}>evepay-signature</code>. Verifica
          con HMAC-SHA256 antes de procesar:
        </p>
        <pre
          style={{
            background: "var(--eve-azul-noche)",
            color: "#e2e8f0",
            borderRadius: 10,
            padding: "1.25rem",
            fontSize: "0.78rem",
            overflowX: "auto",
            margin: 0,
            fontFamily: "'JetBrains Mono', monospace"
          }}
        >{`// Node.js
const [t, v1sig] = req.headers['evepay-signature'].split(',');
const timestamp = t.replace('t=', '');
const expected = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(\`\${timestamp}.\${rawBody}\`)
  .digest('hex');
if (expected !== v1sig.replace('v1=', '')) {
  return res.status(400).send('Firma inválida');
}`}</pre>
      </div>
    </div>
  );
}
