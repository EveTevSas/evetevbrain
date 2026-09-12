"use client";

import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { prepararLote } from "./acciones";

/** «Preparar lote» de un comercio (ops). La base decide qué entra y qué se retiene. */
export function PrepararLote({
  tenantId,
  deshabilitado,
  motivo
}: {
  tenantId: string;
  deshabilitado: boolean;
  motivo?: string;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function preparar() {
    setError(null);
    iniciar(async () => {
      const r = await prepararLote(tenantId);
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  }

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem" }}
    >
      <button
        type="button"
        onClick={preparar}
        disabled={pendiente || deshabilitado}
        title={motivo}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          borderRadius: 8,
          padding: "0.4rem 0.7rem",
          fontSize: "0.75rem",
          fontWeight: 700,
          cursor: pendiente || deshabilitado ? "not-allowed" : "pointer",
          border: "none",
          background:
            pendiente || deshabilitado
              ? "rgba(10,37,64,0.35)"
              : "linear-gradient(135deg, #0a2540 0%, #4b3075 100%)",
          color: "#fff",
          whiteSpace: "nowrap"
        }}
      >
        <ArrowUpRight size={13} /> {pendiente ? "Preparando…" : "Preparar lote"}
      </button>
      {error && (
        <span
          role="alert"
          style={{ fontSize: "0.72rem", color: "#B91C1C", maxWidth: 260, textAlign: "right" }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
