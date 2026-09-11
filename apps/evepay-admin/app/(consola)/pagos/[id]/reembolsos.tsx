"use client";

import { Campo, entrada } from "@/components/campos";
import type { Reembolso } from "@/lib/api/evepay";
import { formatoMonto } from "@/lib/formato";
import { RotateCcw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { registrarReembolso } from "../acciones";

const boton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  border: "1px solid #E2E8F0",
  background: "#fff",
  borderRadius: 9,
  padding: "0.45rem 0.85rem",
  fontSize: "0.78rem",
  fontWeight: 700,
  color: "#4b3075",
  cursor: "pointer"
};

/**
 * Reembolsos del cobro (spec reembolsos-contracargos). Asistido: finanzas ya
 * devolvió el dinero desde el banco y aquí lo registra; la base reparte
 * proporcionalmente lo del comercio, la comisión y su IVA, y asienta.
 */
export function Reembolsos({
  paymentId,
  montoCobro,
  moneda,
  estadoCobro,
  reembolsos,
  puedeRegistrar,
  proveedorReembolsaPorApi
}: {
  paymentId: string;
  montoCobro: number;
  moneda: string;
  estadoCobro: string;
  reembolsos: Reembolso[];
  puedeRegistrar: boolean;
  proveedorReembolsaPorApi: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const devuelto = reembolsos.reduce((a, r) => a + r.montoMinor, 0);
  const restante = montoCobro - devuelto;
  const puede =
    puedeRegistrar && (estadoCobro === "conciliado" || estadoCobro === "aprobado") && restante > 0;

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setError(null);
    iniciar(async () => {
      const r = await registrarReembolso(paymentId, datos);
      if (r.ok) {
        setAbierto(false);
        router.refresh();
      } else setError(r.error);
    });
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "0.8rem"
        }}
      >
        <h2 style={{ margin: 0, fontSize: "0.95rem", color: "#0A2540" }}>Reembolsos</h2>
        {puede && !abierto && (
          <button type="button" onClick={() => setAbierto(true)} style={boton}>
            <RotateCcw size={13} /> Registrar reembolso
          </button>
        )}
      </div>
      <p style={{ margin: "0 0 0.8rem", fontSize: "0.78rem", color: "#64748B" }}>
        Devuelto {formatoMonto(devuelto, moneda)} de {formatoMonto(montoCobro, moneda)}
        {restante > 0 ? ` · quedan ${formatoMonto(restante, moneda)}` : " · devuelto por completo"}.
        {!proveedorReembolsaPorApi &&
          " El proveedor no reembolsa por API: se paga desde el banco y se registra aquí."}
      </p>
      {abierto && (
        <form
          onSubmit={enviar}
          style={{
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: "1rem 1.1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.8rem",
            marginBottom: "1rem"
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.8rem"
            }}
          >
            <Campo etiqueta={`Monto a devolver (máx. ${formatoMonto(restante, moneda)})`} requerido>
              <input
                name="monto"
                inputMode="numeric"
                required
                defaultValue={String(restante)}
                autoFocus
                style={entrada}
              />
            </Campo>
            <Campo etiqueta="Fecha del pago" requerido>
              <input
                name="fecha"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                style={entrada}
              />
            </Campo>
            <Campo etiqueta="Referencia del banco" requerido>
              <input name="referenciaPago" required maxLength={120} style={entrada} />
            </Campo>
            <Campo etiqueta="Comprobante" ayuda="Opcional">
              <input name="comprobante" maxLength={500} style={entrada} />
            </Campo>
          </div>
          <Campo etiqueta="Motivo" requerido>
            <input name="motivo" required minLength={3} maxLength={500} style={entrada} />
          </Campo>
          <p style={{ margin: 0, fontSize: "0.74rem", color: "#64748B" }}>
            Se devuelve proporcionalmente lo del comercio, la comisión de EvePay y su IVA; el costo
            del proveedor no se recupera. Si el cobro ya se le pagó al comercio, queda debiendo y se
            descuenta de su siguiente lote.
          </p>
          {error && (
            <p role="alert" style={{ margin: 0, fontSize: "0.82rem", color: "#B91C1C" }}>
              {error}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              type="submit"
              disabled={pendiente}
              style={{ ...boton, background: "#0A2540", color: "#fff", border: "none" }}
            >
              <Save size={13} /> {pendiente ? "Registrando…" : "Registrar"}
            </button>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              style={{ ...boton, color: "#64748B" }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
      {reembolsos.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          {reembolsos.map((r) => (
            <div
              key={r.id}
              style={{
                fontSize: "0.8rem",
                color: "#0A2540",
                borderBottom: "1px solid #F1F5F9",
                paddingBottom: "0.45rem"
              }}
            >
              <strong>{formatoMonto(r.montoMinor, moneda)}</strong> ·{" "}
              {r.origen === "contracargo" ? "contracargo perdido" : "reembolso"} · {r.fechaPago} ·{" "}
              <code style={{ fontSize: "0.74rem" }}>{r.referenciaPago}</code>
              <div style={{ fontSize: "0.72rem", color: "#64748B" }}>
                {r.motivo} · comercio {formatoMonto(r.parteComercio, moneda)} · comisión{" "}
                {formatoMonto(r.parteComision, moneda)} · IVA {formatoMonto(r.parteIva, moneda)} ·{" "}
                {r.registradoPor}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
