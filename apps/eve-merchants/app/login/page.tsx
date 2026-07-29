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

      {/* ── Panel izquierdo ───────────────────────────────────── */}
      <div
        className="login-brand-panel"
        style={{
          display: "none",           /* mobile: oculto; desktop: flex vía CSS */
          flex: 1,
          position: "relative",
          overflow: "hidden",
          background: "var(--eve-azul-noche)",
          flexDirection: "column",
        }}
      >
        {/* Logo arriba */}
        <div style={{
          position: "relative", zIndex: 3,
          padding: "2.25rem 2.5rem",
          display: "flex", alignItems: "center", gap: "0.625rem"
        }}>
          <img src={`${CDN}/isotipos/isotipo-blanco.svg`} alt="" width={26} height={19} />
          <span style={{
            fontFamily: "'Baloo 2',sans-serif", fontWeight: 600,
            fontSize: "1.05rem", color: "#FDFEFF"
          }}>
            EvePay
          </span>
        </div>

        {/* Copy centrado verticalmente en la mitad superior */}
        <div style={{
          position: "relative", zIndex: 3,
          padding: "0 2.5rem",
          flex: "0 0 auto"
        }}>
          <p style={{
            fontFamily: "'Baloo 2',sans-serif", fontWeight: 700,
            fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
            color: "#FDFEFF", margin: "0 0 0.75rem", lineHeight: 1.2
          }}>
            Tu portal de pagos
          </p>
          <p style={{
            fontSize: "0.9rem", color: "rgba(255,255,255,0.5)",
            margin: 0, lineHeight: 1.7, maxWidth: 300
          }}>
            Revisa transacciones, cobros y configuración de EvePay en un solo lugar.
          </p>
        </div>

        {/* Mascota al fondo — sin caja visible */}
        <div style={{
          position: "absolute",
          bottom: 0, left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          height: "70%",
          zIndex: 1
        }}>
          {/* Gradiente que funde el top del JPEG blanco con el panel azul */}
          <div style={{
            position: "absolute",
            top: 0, left: 0, right: 0, height: "55%",
            background: "linear-gradient(to bottom, #0A2540 0%, transparent 100%)",
            zIndex: 2,
            pointerEvents: "none"
          }} />
          <Image
            src="/mascota/mascota-saludando.jpeg"
            alt="Mascota Evetev"
            fill
            style={{ objectFit: "contain", objectPosition: "bottom center" }}
            priority
          />
        </div>
      </div>

      {/* ── Panel derecho: formulario ─────────────────────────── */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--eve-tinte)",
        padding: "2rem 1.5rem"
      }}>
        <div style={{ width: "100%", maxWidth: 400 }}>

          {/* Logo — visible solo en mobile */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }} className="login-logo-mobile">
            <Link href="/" style={{
              display: "inline-flex", alignItems: "center",
              gap: "0.625rem", textDecoration: "none"
            }}>
              <img src={`${CDN}/isotipos/isotipo-azul-noche.svg`} alt="Evetev" width={34} height={24} />
              <span style={{
                fontFamily: "'Baloo 2',sans-serif", fontWeight: 600,
                fontSize: "1.3rem", color: "var(--eve-azul-noche)"
              }}>
                EvePay
              </span>
            </Link>
            <p style={{ marginTop: "0.375rem", color: "var(--eve-pizarra)", fontSize: "0.85rem" }}>
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
