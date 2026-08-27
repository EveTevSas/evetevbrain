"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { IconoError } from "@/components/iconos";
import { GradientBackground } from "@/components/ui/soft-pastel-blend";

const inicial: LoginState = {};
const CDN = "https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1";

export default function LoginPage() {
  const [state, formAction, pendiente] = useActionState(login, inicial);

  return (
    <div style={{ position: "relative", minHeight: "100vh", width: "100%" }}>
      {/* Fondo pastel */}
      <GradientBackground className="absolute inset-0" />

      {/* Contenido centrado */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
        }}
      >
        {/* Card */}
        <div
          style={{
            width: "100%",
            maxWidth: 400,
            background: "rgba(255,255,255,0.72)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.9)",
            borderRadius: 20,
            padding: "2.5rem",
            boxShadow: "0 8px 40px rgba(10,37,64,0.1)",
          }}
        >
          {/* Logo + nombre */}
          <div
            style={{
              marginBottom: "2rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.625rem",
              textAlign: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${CDN}/isotipos/isotipo-azul-noche.svg`}
              alt="Evetev"
              width={48}
              height={34}
            />
            <h1
              style={{
                fontFamily: "var(--font-brand)",
                fontWeight: 700,
                fontSize: "1.75rem",
                color: "#0A2540",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              EveLedger
            </h1>
            <p
              style={{
                fontSize: "0.82rem",
                color: "#64748B",
                margin: 0,
              }}
            >
              Operación diaria de tu estación · por Evetev
            </p>
          </div>

          {/* Formulario */}
          <form
            action={formAction}
            style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}
          >
            {/* Correo */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label
                htmlFor="email"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#334155",
                  letterSpacing: "0.03em",
                }}
              >
                Correo
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "rgba(255,255,255,0.8)",
                  border: "1px solid #E2E8F0",
                  borderRadius: 10,
                  padding: "0.7rem 0.9rem",
                  color: "#0A2540",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
            </div>

            {/* Contraseña */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <label
                htmlFor="password"
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#334155",
                  letterSpacing: "0.03em",
                }}
              >
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "rgba(255,255,255,0.8)",
                  border: "1px solid #E2E8F0",
                  borderRadius: 10,
                  padding: "0.7rem 0.9rem",
                  color: "#0A2540",
                  fontSize: "0.9rem",
                  outline: "none",
                }}
              />
            </div>

            {/* Error */}
            {state.error && (
              <p
                role="alert"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: 9,
                  padding: "0.6rem 0.875rem",
                  fontSize: "0.85rem",
                  color: "#B91C1C",
                  margin: 0,
                }}
              >
                <IconoError className="h-4 w-4 shrink-0" />
                {state.error}
              </p>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={pendiente}
              style={{
                width: "100%",
                marginTop: "0.25rem",
                background: pendiente
                  ? "rgba(0,93,111,0.4)"
                  : "linear-gradient(135deg, #0a2540 0%, #4b3075 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "0.8rem",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor: pendiente ? "not-allowed" : "pointer",
                letterSpacing: "0.02em",
                boxShadow: pendiente ? "none" : "0 4px 20px rgba(75,48,117,0.35)",
                transition: "opacity 0.15s",
              }}
            >
              {pendiente ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
