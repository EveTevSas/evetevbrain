"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setSession } from "@/lib/auth";
import ParticlesBackground from "@/components/ui/particles-bg";

const CDN = "https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1";

export default function LoginPage() {
  const router  = useRouter();
  const [key, setKey]         = useState("");
  const [error, setError]     = useState("");
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
      setError(
        err instanceof ApiError && err.status === 403
          ? "API key inválida. Verifica que sea correcta."
          : "No se pudo conectar con el servidor. Intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      {/* ── Panel izquierdo 60% — solo partículas ────────────── */}
      <div
        className="login-brand-panel"
        style={{
          display: "none",      /* mobile: oculto; desktop: block via CSS */
          flex: "0 0 60%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <ParticlesBackground />
      </div>

      {/* ── Panel derecho 40% — logo + formulario ────────────── */}
      <div style={{
        flex: "0 0 100%",       /* mobile: 100% */
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        padding: "2rem 2rem",
        minHeight: "100vh",
      }} className="login-form-panel">
        <div style={{ width: "100%", maxWidth: 380 }}>

          {/* Isotipo + logotipo */}
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <Link href="/" style={{
              display: "inline-flex", alignItems: "center",
              gap: "0.75rem", textDecoration: "none"
            }}>
              <img
                src={`${CDN}/isotipos/isotipo-azul-noche.svg`}
                alt="Evetev"
                width={44}
                height={32}
              />
              <span style={{
                fontFamily: "'Baloo 2', sans-serif",
                fontWeight: 700,
                fontSize: "1.8rem",
                color: "var(--eve-azul-noche)",
                letterSpacing: "-0.01em",
              }}>
                EvePay
              </span>
            </Link>
            <p style={{
              marginTop: "0.5rem",
              color: "var(--eve-pizarra)",
              fontSize: "0.875rem",
            }}>
              Portal del comercio
            </p>
          </div>

          {/* Card formulario */}
          <div className="card" style={{ boxShadow: "0 4px 24px rgba(10,37,64,.08)" }}>
            <h1 style={{ marginBottom: "0.25rem", fontSize: "1.25rem" }}>
              Iniciar sesión
            </h1>
            <p style={{ marginBottom: "1.5rem", color: "var(--eve-pizarra)", fontSize: "0.875rem" }}>
              Ingresa tu API key de producción o sandbox.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{
                  display: "block", fontSize: "0.8rem", fontWeight: 500,
                  color: "var(--eve-azul-noche)", marginBottom: "6px",
                }}>
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
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: "0.5rem",
                  background: "#fee2e2", color: "var(--eve-error)",
                  borderRadius: "var(--eve-radio-sm)", padding: "0.75rem", fontSize: "0.85rem",
                }}>
                  <span aria-hidden>⚠</span> {error}
                </div>
              )}

              <button
                className="btn btn-cta"
                type="submit"
                disabled={loading || !key.trim()}
              >
                {loading ? "Verificando..." : "Entrar"}
              </button>
            </form>
          </div>

          <p style={{
            textAlign: "center", marginTop: "1.5rem",
            fontSize: "0.8rem", color: "var(--eve-muted)",
          }}>
            ¿Sin credenciales?{" "}
            <a href="mailto:hola@evetev.com" style={{
              color: "var(--eve-electrico)", textDecoration: "none", fontWeight: 500,
            }}>
              Escríbenos
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
