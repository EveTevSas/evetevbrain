"use client";

import { GradientBackground } from "@/components/ui/soft-pastel-blend";
import { isSafeInternalPath } from "@/lib/auth/permissions";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (authError) {
      setError("No pudimos validar esas credenciales. El acceso lo aprovisiona el equipo.");
      setBusy(false);
      return;
    }

    const requestedPath = new URLSearchParams(window.location.search).get("next");
    router.replace(isSafeInternalPath(requestedPath) ? requestedPath : "/");
    router.refresh();
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh", width: "100%" }}>
      <GradientBackground illustrationUrl="/marca/pasarela-de-pago.webp" />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem"
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: "rgba(255,255,255,0.72)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.9)",
            borderRadius: 20,
            padding: "2.5rem",
            boxShadow: "0 8px 40px rgba(10,37,64,0.1)"
          }}
        >
          <div
            style={{
              marginBottom: "2rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.625rem",
              textAlign: "center"
            }}
          >
            <Image
              src="/marca/isotipo-azul-noche.svg"
              alt="EvePay"
              width={42}
              height={42}
              priority
            />
            <h1
              style={{
                fontWeight: 700,
                fontSize: "1.75rem",
                color: "#0A2540",
                margin: 0,
                letterSpacing: "-0.01em"
              }}
            >
              EvePay Admin
            </h1>
            <p style={{ fontSize: "0.82rem", color: "#64748B", margin: 0 }}>
              Consola de operación de la pasarela · uso exclusivo de Evetev
            </p>
          </div>

          <form
            onSubmit={submit}
            style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label
                htmlFor="email"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#334155",
                  letterSpacing: "0.03em"
                }}
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "rgba(255,255,255,0.8)",
                  border: "1px solid #E2E8F0",
                  borderRadius: 10,
                  padding: "0.7rem 0.9rem",
                  color: "#0A2540",
                  fontSize: "0.9rem",
                  outline: "none"
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label
                htmlFor="password"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#334155",
                  letterSpacing: "0.03em"
                }}
              >
                Contraseña
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "rgba(255,255,255,0.8)",
                    border: "1px solid #E2E8F0",
                    borderRadius: 10,
                    padding: "0.7rem 2.75rem 0.7rem 0.9rem",
                    color: "#0A2540",
                    fontSize: "0.9rem",
                    outline: "none"
                  }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#94A3B8",
                    display: "flex",
                    alignItems: "center",
                    padding: 4
                  }}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                aria-live="polite"
                style={{
                  margin: 0,
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: 9,
                  padding: "0.6rem 0.875rem",
                  fontSize: "0.85rem",
                  color: "#B91C1C"
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              style={{
                width: "100%",
                marginTop: "0.25rem",
                background: busy
                  ? "rgba(10,37,64,0.4)"
                  : "linear-gradient(135deg, #0a2540 0%, #4b3075 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "0.8rem",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor: busy ? "not-allowed" : "pointer",
                letterSpacing: "0.02em",
                boxShadow: busy ? "none" : "0 4px 20px rgba(75,48,117,0.35)",
                transition: "opacity 0.15s"
              }}
            >
              {busy ? "Validando…" : "Entrar a la consola"}
            </button>
          </form>

          <p
            style={{
              marginTop: "1.25rem",
              fontSize: "0.72rem",
              color: "#94A3B8",
              textAlign: "center",
              lineHeight: 1.6
            }}
          >
            Sesión validada con Supabase Auth · rol super_admin requerido · cada acción queda
            auditada
          </p>
        </div>
      </div>
    </div>
  );
}
