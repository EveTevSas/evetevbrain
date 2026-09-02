import type { ReactNode } from "react";
import { NavConsola } from "@/components/nav-consola";

/** Layout de las secciones autenticadas. El acceso lo garantiza el proxy (CA-1/2). */
export default function ConsolaLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <NavConsola />
      <main style={{ flex: 1, padding: "2rem", boxSizing: "border-box", maxWidth: 1200 }}>
        {children}
      </main>
    </div>
  );
}
