"use client";

import { GradientBackground } from "@/components/soft-pastel-blend";
import { isSafeInternalPath } from "@/lib/auth/acceso";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const LOCAL = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1") ?? false;

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    typeof window !== "undefined" && window.location.search.includes("error=google")
      ? "Google no completó el ingreso. Intenta de nuevo."
      : null
  );
  const [conCorreo, setConCorreo] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function destino(): string {
    const next = new URLSearchParams(window.location.search).get("next");
    return isSafeInternalPath(next) ? next : "/";
  }

  async function conGoogle() {
    setBusy(true);
    setError(null);
    const { error: e } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destino())}`,
        queryParams: { prompt: "select_account" }
      }
    });
    if (e) {
      setError("No se pudo abrir Google. Si estás en local, entra con correo.");
      setBusy(false);
    }
  }

  async function conClave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: e } = await getSupabaseBrowserClient().auth.signInWithPassword({
      email: email.trim(),
      password
    });
    if (e) {
      setError("Correo o contraseña incorrectos.");
      setBusy(false);
      return;
    }
    router.replace(destino());
    router.refresh();
  }

  const boton: React.CSSProperties = {
    width: "100%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.6rem",
    padding: "0.8rem 1rem",
    borderRadius: 12,
    fontSize: "0.9rem",
    fontWeight: 700,
    cursor: busy ? "wait" : "pointer"
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", width: "100%" }}>
      <GradientBackground />
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
            maxWidth: 400,
            background: "rgba(255,255,255,0.78)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.9)",
            borderRadius: 20,
            padding: "2.25rem",
            boxShadow: "0 8px 40px rgba(10,37,64,0.1)"
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginBottom: "1.4rem" }}
          >
            <Image src="/marca/isotipo-azul-noche.svg" alt="" width={34} height={34} />
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.15rem", color: "#0A2540" }}>Evetev</div>
              <div style={{ fontSize: "0.76rem", color: "#64748B" }}>
                Hub interno · torre de control
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void conGoogle()}
            disabled={busy}
            style={{ ...boton, background: "#0A2540", color: "#fff", border: "none" }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path
                fill="#EA4335"
                d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"
              />
              <path
                fill="#FBBC05"
                d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4-13.5-9.7l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
              />
            </svg>
            {busy ? "Abriendo Google…" : "Entrar con Google"}
          </button>
          <p
            style={{
              margin: "0.7rem 0 0",
              fontSize: "0.76rem",
              color: "#64748B",
              textAlign: "center"
            }}
          >
            Solo cuentas del dominio de Evetev.
          </p>

          {(LOCAL || conCorreo) && (
            <form
              onSubmit={conClave}
              style={{ marginTop: "1.4rem", display: "grid", gap: "0.6rem" }}
            >
              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "#94A3B8",
                  letterSpacing: "0.06em"
                }}
              >
                CON CORREO {LOCAL ? "(ENTORNO LOCAL)" : ""}
              </div>
              <input
                type="email"
                required
                placeholder="correo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  padding: "0.65rem 0.8rem",
                  borderRadius: 10,
                  border: "1px solid #E2E8F0",
                  fontSize: "0.88rem"
                }}
              />
              <input
                type="password"
                required
                placeholder="contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  padding: "0.65rem 0.8rem",
                  borderRadius: 10,
                  border: "1px solid #E2E8F0",
                  fontSize: "0.88rem"
                }}
              />
              <button
                type="submit"
                disabled={busy}
                style={{
                  ...boton,
                  background: "#fff",
                  color: "#0A2540",
                  border: "1px solid #E2E8F0"
                }}
              >
                Entrar
              </button>
            </form>
          )}
          {!LOCAL && !conCorreo && (
            <button
              type="button"
              onClick={() => setConCorreo(true)}
              style={{
                marginTop: "0.9rem",
                background: "none",
                border: "none",
                color: "#64748B",
                fontSize: "0.76rem",
                cursor: "pointer",
                width: "100%"
              }}
            >
              Entrar con correo y contraseña
            </button>
          )}

          {error && (
            <p
              role="alert"
              style={{ margin: "1rem 0 0", fontSize: "0.82rem", color: "#B91C1C", fontWeight: 600 }}
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
