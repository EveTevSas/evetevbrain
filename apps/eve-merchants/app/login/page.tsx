"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setSession } from "@/lib/auth";

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

      {/* ── Panel izquierdo: imagen completa, sin texto ───────── */}
      <div
        className="login-brand-panel"
        style={{
          display: "none",   /* mobile oculto; desktop: flex via CSS */
          flex: 1,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Image
          src="/mascota/arriba.jpeg"
          alt=""
          fill
          style={{ objectFit: "cover", objectPosition: "center" }}
          priority
        />
      </div>

      {/* ── Panel derecho: logo + formulario ─────────────────── */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--eve-tinte)",
        padding: "2rem 1.5rem"
      }}>
        <div style={{ width: "100%", maxWidth: 400 }}>

          {/* Logo + isotipo — siempre visible en este panel */}
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <Link href="/" style={{
              display: "inline-flex", alignItems: "center",
              gap: "0.75rem", textDecoration: "none"
            }}>
              <img
                src={`${CDN}/isotipos/isotipo-azul-noche.svg`}
                alt="Evetev"
                width={40}
                height={29}
              />
              <span style={{
                fontFamily: "'Baloo 2', sans-serif",
                fontWeight: 700,
                fontSize: "1.6rem",
                color: "var(--eve-azul-noche)",
                letterSpacing: "-0.01em"
              }}>
                EvePay
              </span>
            </Link>
            <p style={{
              marginTop: "0.5rem",
              color: "var(--eve-pizarra)",
              fontSize: "0.85rem"
            }}>
              Portal del comercio
            </p>
          </div>

          {/* Formulario */}
          <div className="card">
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
                  color: "var(--eve-azul-noche)", marginBottom: "6px"
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
                  borderRadius: "var(--eve-radio-sm)", padding: "0.75rem", fontSize: "0.85rem"
                }}>
                  <span aria-hidden>⚠</span> {error}
                </div>
              )}

              <button className="btn btn-cta" type="submit" disabled={loading || !key.trim()}>
                {loading ? "Verificando..." : "Entrar"}
              </button>
            </form>
          </div>

          <p style={{
            textAlign: "center", marginTop: "1.5rem",
            fontSize: "0.8rem", color: "var(--eve-muted)"
          }}>
            ¿Sin credenciales?{" "}
            <a href="mailto:hola@evetev.com" style={{
              color: "var(--eve-electrico)", textDecoration: "none", fontWeight: 500
            }}>
              Escríbenos
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
