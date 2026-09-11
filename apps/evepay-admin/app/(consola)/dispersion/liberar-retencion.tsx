"use client";

import { entrada } from "@/components/campos";
import { Unlock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { liberarRetencion } from "./acciones";

/** «Liberar» una retención con motivo; quién puede depende del tipo (la API lo exige). */
export function LiberarRetencion({ id }: { id: string }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  function liberar() {
    setError(null);
    iniciar(async () => {
      const r = await liberarRetencion(id, motivo);
      if (r.ok) {
        setAbierto(false);
        router.refresh();
      } else setError(r.error);
    });
  }

  const boton: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    borderRadius: 8,
    padding: "0.35rem 0.65rem",
    fontSize: "0.74rem",
    fontWeight: 700,
    cursor: "pointer",
    border: "1px solid #E2E8F0",
    background: "#fff",
    color: "#4b3075"
  };

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} style={boton}>
        <Unlock size={12} /> Liberar
      </button>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", minWidth: 220 }}>
      <input
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="¿Por qué se libera?"
        maxLength={500}
        autoFocus
        style={{ ...entrada, padding: "0.35rem 0.6rem", fontSize: "0.78rem" }}
      />
      {error && (
        <span role="alert" style={{ fontSize: "0.72rem", color: "#B91C1C" }}>
          {error}
        </span>
      )}
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <button
          type="button"
          disabled={pendiente}
          onClick={liberar}
          style={{ ...boton, background: "#0A2540", color: "#fff", border: "none" }}
        >
          <Unlock size={12} /> {pendiente ? "Liberando…" : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          style={{ ...boton, color: "#64748B" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
