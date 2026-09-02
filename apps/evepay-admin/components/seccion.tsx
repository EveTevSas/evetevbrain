import type { ReactNode } from "react";

export function TituloSeccion({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <header style={{ marginBottom: "1.5rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "#0A2540" }}>{titulo}</h1>
      <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem", color: "#64748B" }}>{descripcion}</p>
    </header>
  );
}

export function Tarjeta({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        padding: "1.5rem"
      }}
    >
      {children}
    </div>
  );
}

/** Placeholder de una sección aún no implementada: dice qué viene y de qué fase. */
export function SeccionPendiente({ fase, criterios }: { fase: string; criterios: string[] }) {
  return (
    <Tarjeta>
      <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: "#4b3075" }}>
        En construcción — {fase} de specs/evepay/admin-console/
      </p>
      <ul
        style={{
          margin: "0.75rem 0 0",
          paddingLeft: "1.1rem",
          fontSize: "0.85rem",
          color: "#475569",
          lineHeight: 1.9
        }}
      >
        {criterios.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </Tarjeta>
  );
}
