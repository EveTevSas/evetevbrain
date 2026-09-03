"use client";

import type { ReactNode } from "react";

/** Controles del formulario de comercios, para que todos se vean igual. */

export const entrada: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#fff",
  border: "1px solid #E2E8F0",
  borderRadius: 9,
  padding: "0.55rem 0.75rem",
  fontSize: "0.85rem",
  color: "#0A2540",
  outline: "none"
};

export function Campo({
  etiqueta,
  ayuda,
  requerido,
  children
}: {
  etiqueta: string;
  ayuda?: string;
  requerido?: boolean;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#334155" }}>
        {etiqueta}
        {requerido && <span style={{ color: "#B91C1C" }}> *</span>}
      </span>
      {children}
      {ayuda && <span style={{ fontSize: "0.7rem", color: "#94A3B8" }}>{ayuda}</span>}
    </label>
  );
}

export function Seccion({
  titulo,
  descripcion,
  children
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  return (
    <fieldset
      style={{
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        padding: "1.1rem 1.2rem",
        margin: 0
      }}
    >
      <legend
        style={{
          fontSize: "0.78rem",
          fontWeight: 700,
          color: "#4b3075",
          padding: "0 0.4rem"
        }}
      >
        {titulo}
      </legend>
      {descripcion && (
        <p style={{ margin: "0 0 0.9rem", fontSize: "0.76rem", color: "#64748B", lineHeight: 1.5 }}>
          {descripcion}
        </p>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "0.9rem"
        }}
      >
        {children}
      </div>
    </fieldset>
  );
}

export function Casilla({
  etiqueta,
  nombre,
  defecto,
  ayuda
}: {
  etiqueta: string;
  nombre: string;
  defecto?: boolean;
  ayuda?: string;
}) {
  return (
    <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
      <input
        type="checkbox"
        name={nombre}
        defaultChecked={defecto}
        style={{ marginTop: 3, accentColor: "#4b3075" }}
      />
      <span>
        <span style={{ fontSize: "0.8rem", color: "#0A2540" }}>{etiqueta}</span>
        {ayuda && (
          <span style={{ display: "block", fontSize: "0.7rem", color: "#94A3B8" }}>{ayuda}</span>
        )}
      </span>
    </label>
  );
}
