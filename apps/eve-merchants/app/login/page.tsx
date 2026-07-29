"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const merchant = await api.merchants.me(key.trim());
      setSession(key.trim(), merchant);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("API key inválida. Verifica que sea correcta.");
      } else {
        setError("No se pudo conectar con el servidor. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--gray-50)" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 1rem" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="var(--coral)" />
              <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="20" fontWeight="700">E</text>
            </svg>
            <span style={{ fontSize: "1.4rem", fontWeight: "700", color: "var(--navy)" }}>EvePay</span>
          </div>
          <p style={{ color: "var(--gray-400)", fontSize: "0.875rem", margin: 0 }}>Portal del Comercio</p>
        </div>

        <div className="card">
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.25rem", fontWeight: "700", color: "var(--navy)" }}>
            Iniciar sesión
          </h1>
          <p style={{ margin: "0 0 1.5rem", color: "var(--gray-400)", fontSize: "0.875rem" }}>
            Ingresa tu API key de producción o sandbox.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "var(--gray-600)", marginBottom: "0.375rem" }}>
                API Key
              </label>
              <input
                className="input mono"
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="evpk_live_..."
                required
                autoFocus
              />
            </div>

            {error && (
              <div style={{ background: "#fee2e2", color: "var(--red)", borderRadius: "0.5rem", padding: "0.75rem", fontSize: "0.85rem" }}>
                {error}
              </div>
            )}

            <button className="btn-primary" type="submit" disabled={loading || !key.trim()}>
              {loading ? "Verificando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.8rem", color: "var(--gray-400)" }}>
          ¿No tienes credenciales? Contacta a{" "}
          <a href="mailto:hola@evetev.com" style={{ color: "var(--coral)", textDecoration: "none" }}>hola@evetev.com</a>
        </p>
      </div>
    </div>
  );
}
