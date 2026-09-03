"use client";

import { RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { reverificarPago } from "../acciones";
import type { ResultadoReverificacion } from "@/lib/api/evepay";

/**
 * Reverificación manual contra el proveedor (CA-17, CA-18).
 *
 * El resultado se muestra en tres tonos distintos porque significan cosas
 * distintas: cambió el estado, coincidía ya, o el proveedor dice algo que la
 * máquina de estados no permite aplicar. Ese último caso es el interesante:
 * no es un error, es una discrepancia que alguien tiene que mirar.
 */
export function Reverificar({ paymentId }: { paymentId: string }) {
  const [pendiente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoReverificacion | null>(null);
  const [error, setError] = useState<string | null>(null);

  function ejecutar() {
    setError(null);
    iniciar(async () => {
      const r = await reverificarPago(paymentId);
      if (r.ok) setResultado(r.datos);
      else {
        setResultado(null);
        setError(r.error);
      }
    });
  }

  const discrepancia =
    resultado && !resultado.cambio && resultado.estadoLocal !== resultado.estadoProveedor;
  const tono = resultado?.cambio
    ? { bg: "#F0FDF4", bd: "#BBF7D0", fg: "#15803D" }
    : discrepancia
      ? { bg: "#FFFBEB", bd: "#FDE68A", fg: "#B45309" }
      : { bg: "#F8FAFC", bd: "#E2E8F0", fg: "#475569" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <button
        type="button"
        onClick={ejecutar}
        disabled={pendiente}
        style={{
          alignSelf: "flex-start",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          background: pendiente
            ? "rgba(10,37,64,0.4)"
            : "linear-gradient(135deg, #0a2540 0%, #4b3075 100%)",
          color: "#fff",
          border: "none",
          borderRadius: 9,
          padding: "0.5rem 0.95rem",
          fontSize: "0.8rem",
          fontWeight: 700,
          cursor: pendiente ? "not-allowed" : "pointer"
        }}
      >
        <RefreshCw size={14} />
        {pendiente ? "Consultando al proveedor…" : "Reverificar con el proveedor"}
      </button>

      {error && (
        <p role="alert" style={{ margin: 0, fontSize: "0.8rem", color: "#B91C1C" }}>
          {error}
        </p>
      )}

      {resultado && (
        <div
          role="status"
          style={{
            background: tono.bg,
            border: `1px solid ${tono.bd}`,
            borderRadius: 10,
            padding: "0.7rem 0.9rem"
          }}
        >
          <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 600, color: tono.fg }}>
            {resultado.detalle}
          </p>
          {resultado.cambio && (
            <p style={{ margin: "0.3rem 0 0", fontSize: "0.75rem", color: "#64748B" }}>
              Recarga la página para ver la transición en la línea de tiempo.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
