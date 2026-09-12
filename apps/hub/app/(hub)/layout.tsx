import type { ReactNode } from "react";
import { NavHub } from "@/components/nav-hub";
import { sesionActual } from "@/lib/auth/sesion";

/** Secciones autenticadas: el proxy ya exigió sesión y dominio (CA-1, CA-2). */
export default async function HubLayout({ children }: { children: ReactNode }) {
  const { nombre, email } = await sesionActual();
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <NavHub nombre={nombre} email={email} />
      <main
        style={{ flex: 1, padding: "2rem", boxSizing: "border-box", maxWidth: 1280, minWidth: 0 }}
      >
        {children}
      </main>
    </div>
  );
}
