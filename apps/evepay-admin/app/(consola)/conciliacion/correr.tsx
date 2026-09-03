"use client";

import { Scale } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { correrConciliacion } from "./acciones";
import type { Comercio, CorridaConciliacion } from "@/lib/api/evepay";

const control: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E2E8F0",
  borderRadius: 9,
  padding: "0.5rem 0.7rem",
  fontSize: "0.83rem",
  color: "#0A2540",
  outline: "none"
};

/** Primer y último día del mes pasado: el periodo que casi siempre se concilia. */
function mesAnterior() {
  const hoy = new Date();
  const desde = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - 1, 1));
  const hasta = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
  return { desde: desde.toISOString().slice(0, 10), hasta: hasta.toISOString().slice(0, 10) };
}

export function CorrerConciliacion({ comercios }: { comercios: Comercio[] }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const inicial = mesAnterior();

  const [tenantId, setTenantId] = useState(comercios[0]?.tenantId ?? "");
  const [desde, setDesde] = useState(inicial.desde);
  const [hasta, setHasta] = useState(inicial.hasta);
  const [resultado, setResultado] = useState<CorridaConciliacion | null>(null);
  const [error, setError] = useState<string | null>(null);

  function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    iniciar(async () => {
      const r = await correrConciliacion(
        tenantId,
        `${desde}T00:00:00.000Z`,
        `${hasta}T00:00:00.000Z`
      );
      if (r.ok) {
        setResultado(r.datos);
        router.refresh();
      } else {
        setResultado(null);
        setError(r.error);
      }
    });
  }

  const manual = resultado?.modo === "no_soportada";
  const tono = manual
    ? { bg: "#FFFBEB", bd: "#FDE68A", fg: "#B45309" }
    : { bg: "#F0FDF4", bd: "#BBF7D0", fg: "#15803D" };

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        padding: "1.4rem",
        marginBottom: "1.5rem"
      }}
    >
      <h2 style={{ margin: "0 0 0.9rem", fontSize: "0.98rem", color: "#0A2540" }}>
        Correr conciliación
      </h2>

      <form
        onSubmit={enviar}
        style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}
      >
        <select
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          aria-label="Comercio"
          required
          style={{ ...control, minWidth: 190 }}
        >
          {comercios.map((c) => (
            <option key={c.tenantId} value={c.tenantId}>
              {c.displayName}
            </option>
          ))}
        </select>

        <label style={{ fontSize: "0.78rem", color: "#64748B" }}>
          Desde{" "}
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            required
            style={control}
          />
        </label>
        <label style={{ fontSize: "0.78rem", color: "#64748B" }}>
          Hasta{" "}
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            required
            style={control}
          />
        </label>

        <button
          type="submit"
          disabled={pendiente || !tenantId}
          style={{
            ...control,
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            background: pendiente
              ? "rgba(10,37,64,0.4)"
              : "linear-gradient(135deg, #0a2540 0%, #4b3075 100%)",
            color: "#fff",
            border: "none",
            fontWeight: 700,
            cursor: pendiente ? "not-allowed" : "pointer"
          }}
        >
          <Scale size={14} />
          {pendiente ? "Conciliando…" : "Conciliar"}
        </button>
      </form>

      {error && (
        <p role="alert" style={{ margin: "0.8rem 0 0", fontSize: "0.8rem", color: "#B91C1C" }}>
          {error}
        </p>
      )}

      {resultado && (
        <div
          role="status"
          style={{
            marginTop: "0.9rem",
            background: tono.bg,
            border: `1px solid ${tono.bd}`,
            borderRadius: 10,
            padding: "0.75rem 0.95rem"
          }}
        >
          {manual ? (
            <>
              <p style={{ margin: 0, fontSize: "0.83rem", fontWeight: 700, color: tono.fg }}>
                Conciliación manual para este periodo
              </p>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#78350F" }}>
                {resultado.nota}
              </p>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: "0.83rem", color: tono.fg }}>
              <strong>{resultado.conciliados}</strong> conciliados ·{" "}
              <strong>{resultado.diferencias}</strong> con diferencia ·{" "}
              <strong>{resultado.huerfanosProveedor}</strong> huérfanos del proveedor ·{" "}
              <strong>{resultado.noConciliados}</strong> sin liquidar
            </p>
          )}
        </div>
      )}
    </div>
  );
}
