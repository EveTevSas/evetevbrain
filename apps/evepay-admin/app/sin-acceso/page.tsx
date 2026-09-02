"use client";

import { GradientBackground } from "@/components/ui/soft-pastel-blend";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

/** CA-2: usuario autenticado sin rol super_admin. No filtra qué existe adentro. */
export default function SinAccesoPage() {
  const router = useRouter();

  async function salir() {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

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
            maxWidth: 420,
            background: "rgba(255,255,255,0.72)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.9)",
            borderRadius: 20,
            padding: "2.5rem",
            textAlign: "center",
            boxShadow: "0 8px 40px rgba(10,37,64,0.1)"
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.25rem", color: "#0A2540" }}>Sin acceso</h1>
          <p style={{ fontSize: "0.85rem", color: "#64748B", lineHeight: 1.6 }}>
            Esta cuenta no tiene permisos para la consola de EvePay. Si crees que es un error,
            escribe al equipo de Evetev.
          </p>
          <button
            type="button"
            onClick={() => void salir()}
            style={{
              marginTop: "0.5rem",
              background: "linear-gradient(135deg, #0a2540 0%, #4b3075 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "0.7rem 1.5rem",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}
