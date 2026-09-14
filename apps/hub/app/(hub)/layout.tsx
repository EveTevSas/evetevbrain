import type { ReactNode } from "react";
import { ConfiguracionPendiente } from "@/components/configuracion-pendiente";
import { NavHub } from "@/components/nav-hub";
import { sesionActual } from "@/lib/auth/sesion";
import { diagnosticoBase } from "@/lib/db";

/**
 * Secciones autenticadas: el proxy ya exigió sesión y dominio (CA-1, CA-2).
 * Antes de pintar nada se comprueba la base: si falta la variable, el rol o la
 * migración, se dice cuál, en vez de un 500 sin explicación.
 */
export default async function HubLayout({ children }: { children: ReactNode }) {
  const [{ nombre, email }, problema] = await Promise.all([sesionActual(), diagnosticoBase()]);
  if (problema) return <ConfiguracionPendiente motivo={problema} />;
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
