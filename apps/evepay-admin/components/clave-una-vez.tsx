"use client";

import { Check, Copy, TriangleAlert } from "lucide-react";
import { useState } from "react";

/**
 * Muestra una API key recién generada. Es la ÚNICA vez que existe en texto
 * plano: la base solo guarda su hash SHA-256, así que si se cierra esta caja
 * sin copiarla, no hay forma de recuperarla —solo rotarla—. Por eso el aviso
 * es parte del componente y no una nota al pie que se pueda olvidar de poner.
 */
export function ClaveUnaVez({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const [copiada, setCopiada] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiada(true);
      setTimeout(() => setCopiada(false), 2000);
    } catch {
      // Sin permiso de portapapeles queda la selección manual: el valor está
      // a la vista, que es lo que importa.
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#334155" }}>{etiqueta}</span>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <code
          style={{
            flex: 1,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "0.78rem",
            background: "#ffffff",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            padding: "0.5rem 0.65rem",
            wordBreak: "break-all",
            color: "#0A2540"
          }}
        >
          {valor}
        </code>
        <button
          type="button"
          onClick={() => void copiar()}
          aria-label={`Copiar ${etiqueta}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            border: "1px solid #E2E8F0",
            background: "#fff",
            borderRadius: 8,
            padding: "0.5rem 0.7rem",
            cursor: "pointer",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: copiada ? "#16A34A" : "#4b3075",
            whiteSpace: "nowrap"
          }}
        >
          {copiada ? <Check size={14} /> : <Copy size={14} />}
          {copiada ? "Copiada" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

export function AvisoClaves({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#FFFBEB",
        border: "1px solid #FDE68A",
        borderRadius: 12,
        padding: "1rem 1.15rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem"
      }}
    >
      <p
        style={{
          margin: 0,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.82rem",
          fontWeight: 700,
          color: "#92400E"
        }}
      >
        <TriangleAlert size={16} />
        Cópialas ahora: no se pueden volver a ver
      </p>
      {children}
    </div>
  );
}
