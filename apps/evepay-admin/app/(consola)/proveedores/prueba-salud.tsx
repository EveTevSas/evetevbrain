"use client";

import { Activity, CircleAlert, CircleCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { comprobarSalud } from "./acciones";
import type { SaludProveedor } from "@/lib/api/evepay";

/** Botón de comprobación en vivo del proveedor activo (CA-12). */
export function PruebaSalud({ proveedor }: { proveedor: string }) {
  const [pendiente, iniciar] = useTransition();
  const [salud, setSalud] = useState<SaludProveedor | null>(null);
  const [error, setError] = useState<string | null>(null);

  function ejecutar() {
    setError(null);
    iniciar(async () => {
      const r = await comprobarSalud();
      if (r.ok) setSalud(r.datos);
      else {
        setSalud(null);
        setError(r.error);
      }
    });
  }

  const tono = salud?.ok
    ? { bg: "#F0FDF4", bd: "#BBF7D0", fg: "#15803D" }
    : { bg: "#FEF2F2", bd: "#FECACA", fg: "#B91C1C" };

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
        <Activity size={15} />
        {pendiente ? "Comprobando…" : `Comprobar ${proveedor}`}
      </button>

      {error && (
        <p role="alert" style={{ margin: 0, fontSize: "0.8rem", color: "#B91C1C" }}>
          {error}
        </p>
      )}

      {salud && (
        <div
          role="status"
          style={{
            background: tono.bg,
            border: `1px solid ${tono.bd}`,
            borderRadius: 10,
            padding: "0.7rem 0.9rem",
            display: "flex",
            gap: "0.55rem",
            alignItems: "flex-start"
          }}
        >
          {salud.ok ? (
            <CircleCheck size={16} color={tono.fg} style={{ flexShrink: 0, marginTop: 1 }} />
          ) : (
            <CircleAlert size={16} color={tono.fg} style={{ flexShrink: 0, marginTop: 1 }} />
          )}
          <div>
            <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 600, color: tono.fg }}>
              {salud.detalle}
            </p>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "#64748B" }}>
              {new Date(salud.verificadoEn).toLocaleString("es-CO")} · {salud.duracionMs} ms
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
