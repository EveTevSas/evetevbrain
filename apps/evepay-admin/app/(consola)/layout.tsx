import { Suspense, type ReactNode } from "react";
import { NavConsola, type Insignias } from "@/components/nav-consola";
import { listarContracargos, resumenOperativo } from "@/lib/api/evepay";
import { sesionActual } from "@/lib/auth/rol";

/**
 * Layout de las secciones autenticadas. El acceso lo garantiza el proxy (CA-1/2).
 * Las insignias del menú son lo que pide atención hoy: comercios sin KYC,
 * cobros retenidos por riesgo y contracargos abiertos. Si la API no responde,
 * el menú se pinta sin ellas: nunca bloquea la navegación.
 */
export default async function ConsolaLayout({ children }: { children: ReactNode }) {
  const { actor, rol } = await sesionActual();
  const insignias: Insignias = {};
  try {
    const [r, contracargos] = await Promise.all([resumenOperativo(), listarContracargos()]);
    insignias.comercios = r.comerciosSinKyc;
    insignias.riesgo = r.colaRiesgo;
    insignias.contracargos = contracargos.filter(
      (c) => c.estado === "recibido" || c.estado === "en_evidencia"
    ).length;
  } catch {
    /* sin insignias */
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Suspense fallback={<aside style={{ width: 236, flexShrink: 0 }} />}>
        <NavConsola actor={actor} rol={rol} insignias={insignias} />
      </Suspense>
      <main style={{ flex: 1, padding: "2rem", boxSizing: "border-box", maxWidth: 1200 }}>
        {children}
      </main>
    </div>
  );
}
