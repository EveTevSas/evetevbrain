/**
 * Plantilla de página de login — Evetev
 *
 * CÓMO USAR:
 *  1. Copia este archivo a `app/login/page.tsx` en tu app Next.js
 *  2. Copia `soft-pastel-blend.tsx` a `components/ui/soft-pastel-blend.tsx`
 *  3. Busca TODO: y reemplaza con los valores de tu app
 *  4. Ajusta la lógica de autenticación (Supabase, NextAuth, etc.)
 *
 * DEPENDENCIAS:
 *  - lucide-react  (Eye, EyeOff)
 *  - next/navigation (useRouter)
 *  - Tu cliente de autenticación
 *
 * NOTA: Este es un Client Component por el manejo de estado del formulario.
 */

"use client";

import { GradientBackground } from "@/components/ui/soft-pastel-blend";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

// TODO: Importar el cliente de autenticación de tu app
// import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// TODO: Importar helper de rutas seguras si tu app lo tiene
// import { isSafeInternalPath } from "@/lib/auth/permissions";

type BusyAction = "login" | "recovery" | null;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ text: string; tone: "error" | "info" } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("login");
    setMessage(null);

    // TODO: Reemplaza con tu lógica de autenticación
    // Ejemplo con Supabase:
    // const supabase = getSupabaseBrowserClient();
    // const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    // if (error) {
    //   setMessage({ text: "No pudimos validar esas credenciales.", tone: "error" });
    //   setBusy(null);
    //   return;
    // }

    // TODO: Redirigir al destino solicitado o a la raíz
    // const requestedPath = new URLSearchParams(window.location.search).get("next");
    // router.replace(isSafeInternalPath(requestedPath) ? requestedPath : "/");
    router.replace("/");
    router.refresh();
  }

  async function recoverAccess() {
    if (!email.trim()) {
      setMessage({ text: "Escribe primero el correo asociado a tu cuenta.", tone: "error" });
      return;
    }

    setBusy("recovery");
    setMessage(null);

    // TODO: Reemplaza con tu lógica de recuperación de contraseña
    // Ejemplo con Supabase:
    // const redirectTo = `${window.location.origin}/auth/callback?next=/actualizar-contrasena`;
    // const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email.trim(), { redirectTo });
    // if (error) {
    //   setMessage({ text: "No pudimos procesar la solicitud.", tone: "error" });
    // } else {
    //   setMessage({ text: "Si el correo está registrado, recibirás un enlace.", tone: "info" });
    // }

    setBusy(null);
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh", width: "100%" }}>
      {/* Fondo pastel — agregar illustrationUrl si la app tiene ilustración */}
      {/* TODO: Si usas imagen: illustrationUrl="/marca/NOMBRE.webp" */}
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
          padding: "1.5rem"
        }}
      >
        {/* Card glassmorphism */}
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
          {/* Logo + nombre */}
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
            {/* TODO: Reemplaza con el isotipo de tu app */}
            {/* Opción A: componente BrandMark */}
            {/* <BrandMark priority size={42} /> */}
            {/* Opción B: imagen directa del CDN */}
            <Image src="/marca/isotipo-azul-noche.svg" alt="Logo" width={42} height={42} priority />
            {/* TODO: Cambiar por el nombre de tu app */}
            <h1
              style={{
                fontWeight: 700,
                fontSize: "1.75rem",
                color: "#0A2540",
                margin: 0,
                letterSpacing: "-0.01em"
              }}
            >
              NombreApp {/* ← CAMBIAR */}
            </h1>
            {/* TODO: Ajustar el subtítulo según el contexto de la app */}
            <p style={{ fontSize: "0.82rem", color: "#64748B", margin: 0 }}>
              Subtítulo descriptivo de la app {/* ← CAMBIAR */}
            </p>
          </div>

          {/* Formulario */}
          <form
            onSubmit={submit}
            style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}
          >
            {/* Campo: correo */}
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

            {/* Campo: contraseña */}
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

            {/* Recuperar acceso */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void recoverAccess()}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: busy !== null ? "not-allowed" : "pointer",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "#4b3075",
                  opacity: busy !== null ? 0.5 : 1,
                  padding: 0
                }}
              >
                {busy === "recovery" ? "Enviando…" : "Recuperar acceso"}
              </button>
            </div>

            {/* Mensaje de error o confirmación */}
            {message && (
              <p
                role={message.tone === "error" ? "alert" : "status"}
                aria-live="polite"
                style={{
                  margin: 0,
                  background:
                    message.tone === "error" ? "rgba(239,68,68,0.08)" : "rgba(75,48,117,0.07)",
                  border: `1px solid ${
                    message.tone === "error" ? "rgba(239,68,68,0.25)" : "rgba(75,48,117,0.2)"
                  }`,
                  borderRadius: 9,
                  padding: "0.6rem 0.875rem",
                  fontSize: "0.85rem",
                  color: message.tone === "error" ? "#B91C1C" : "#4b3075"
                }}
              >
                {message.text}
              </p>
            )}

            {/* Botón principal */}
            <button
              type="submit"
              disabled={busy !== null}
              style={{
                width: "100%",
                marginTop: "0.25rem",
                background:
                  busy !== null
                    ? "rgba(10,37,64,0.4)"
                    : "linear-gradient(135deg, #0a2540 0%, #4b3075 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "0.8rem",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor: busy !== null ? "not-allowed" : "pointer",
                letterSpacing: "0.02em",
                boxShadow: busy !== null ? "none" : "0 4px 20px rgba(75,48,117,0.35)",
                transition: "opacity 0.15s"
              }}
            >
              {/* TODO: Cambiar por el nombre de tu app */}
              {busy === "login" ? "Validando…" : "Entrar a NombreApp"}
            </button>
          </form>

          {/* Pie de seguridad */}
          {/* TODO: Ajustar el texto según la tecnología de autenticación */}
          <p
            style={{
              marginTop: "1.25rem",
              fontSize: "0.72rem",
              color: "#94A3B8",
              textAlign: "center",
              lineHeight: 1.6
            }}
          >
            Sesión validada con Supabase Auth · acceso restringido
          </p>
        </div>
      </div>
    </div>
  );
}
