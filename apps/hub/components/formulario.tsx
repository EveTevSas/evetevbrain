import type { ReactNode } from "react";

export const entrada: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #E2E8F0",
  borderRadius: 9,
  padding: "0.5rem 0.7rem",
  fontSize: "0.84rem",
  color: "#0A2540",
  background: "#fff"
};

export function Campo({
  etiqueta,
  children,
  ayuda
}: {
  etiqueta: string;
  children: ReactNode;
  ayuda?: string;
}) {
  return (
    <label
      style={{
        display: "grid",
        gap: "0.3rem",
        fontSize: "0.74rem",
        fontWeight: 600,
        color: "#475569"
      }}
    >
      {etiqueta}
      {children}
      {ayuda && (
        <span style={{ fontSize: "0.7rem", color: "#94A3B8", fontWeight: 400 }}>{ayuda}</span>
      )}
    </label>
  );
}

export function Boton({
  children,
  secundario,
  peligro
}: {
  children: ReactNode;
  secundario?: boolean;
  peligro?: boolean;
}) {
  return (
    <button
      type="submit"
      style={{
        border: secundario || peligro ? "1px solid #E2E8F0" : "none",
        background: peligro
          ? "#fff"
          : secundario
            ? "#fff"
            : "linear-gradient(135deg, #0a2540 0%, #4b3075 100%)",
        color: peligro ? "#B91C1C" : secundario ? "#0A2540" : "#fff",
        borderRadius: 9,
        padding: "0.5rem 0.9rem",
        fontSize: "0.78rem",
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap"
      }}
    >
      {children}
    </button>
  );
}

/** Formulario plegado: el Hub es de lectura la mayor parte del tiempo; editar es la excepción. */
export function Plegable({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <details
      style={{
        border: "1px dashed #CBD5E1",
        borderRadius: 12,
        padding: "0.7rem 1rem",
        background: "#FAFAF8"
      }}
    >
      <summary style={{ cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, color: "#4b3075" }}>
        {titulo}
      </summary>
      <div style={{ marginTop: "0.9rem" }}>{children}</div>
    </details>
  );
}

export const rejilla: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "0.7rem",
  alignItems: "end"
};
