"use client";

import { Campo, Casilla, entrada } from "@/components/campos";
import type { BalanceDispersion, PoliticaDispersion } from "@/lib/api/evepay";
import { formatoMonto } from "@/lib/formato";
import { porcentaje } from "@/lib/tarifas";
import { Pencil, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { guardarPoliticaDispersion } from "../acciones";

const boton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  borderRadius: 9,
  padding: "0.45rem 0.85rem",
  fontSize: "0.78rem",
  fontWeight: 700,
  cursor: "pointer"
};

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{ fontSize: "0.67rem", fontWeight: 700, color: "#94A3B8", letterSpacing: "0.04em" }}
      >
        {etiqueta.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: "0.85rem",
          color: "#0A2540",
          marginTop: "0.15rem",
          fontVariantNumeric: "tabular-nums"
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Bloque «Dispersión» de la ficha: la política (solo super_admin la edita) y el balance. */
export function PoliticaDispersionBloque({
  tenantId,
  politica,
  balance,
  puedeEditar
}: {
  tenantId: string;
  politica: PoliticaDispersion;
  balance: BalanceDispersion;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setError(null);
    iniciar(async () => {
      const r = await guardarPoliticaDispersion(tenantId, datos);
      if (r.ok) {
        setEditando(false);
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
          marginBottom: "1.1rem",
          flexWrap: "wrap"
        }}
      >
        <h2 style={{ margin: 0, fontSize: "0.98rem", color: "#0A2540" }}>Dispersión</h2>
        {!editando && puedeEditar && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            style={{ ...boton, background: "#fff", border: "1px solid #E2E8F0", color: "#4b3075" }}
          >
            <Pencil size={13} /> Cambiar política
          </button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
          marginBottom: "1.2rem"
        }}
      >
        <Dato etiqueta="Disponible">
          <strong style={{ color: balance.disponibleMinor > 0 ? "#15803D" : "#0A2540" }}>
            {formatoMonto(balance.disponibleMinor, "COP")}
          </strong>
        </Dato>
        <Dato etiqueta="Pendiente">{formatoMonto(balance.pendienteMinor, "COP")}</Dato>
        <Dato etiqueta="Retenido">{formatoMonto(balance.retenidoMinor, "COP")}</Dato>
        <Dato etiqueta="En lote">{formatoMonto(balance.enLoteMinor, "COP")}</Dato>
        <Dato etiqueta="Cuenta de destino">
          {balance.cuentaCertificada ? (
            balance.cuentaDetalle
          ) : (
            <span style={{ color: "#B91C1C" }}>
              {balance.cuentaDetalle ? "sin certificar" : "sin cuenta"}
            </span>
          )}
        </Dato>
      </div>

      {!editando ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "1rem"
          }}
        >
          <Dato etiqueta="Liquidación">T+{politica.diasLiquidacion}</Dato>
          <Dato etiqueta="Reserva por lote">{porcentaje(politica.reservaBps)}</Dato>
          <Dato etiqueta="Reserva se libera a los">{politica.diasReserva} días</Dato>
          <Dato etiqueta="Primer cobro">
            {politica.retenerPrimerCobro ? "Se retiene hasta revisarlo" : "No se retiene"}
          </Dato>
        </div>
      ) : (
        <form
          onSubmit={enviar}
          style={{
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: "1rem 1.1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.9rem"
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "0.9rem"
            }}
          >
            <Campo etiqueta="Días de liquidación (T+N)" requerido ayuda="0 a 30">
              <input
                name="diasLiquidacion"
                type="number"
                min={0}
                max={30}
                defaultValue={politica.diasLiquidacion}
                required
                style={entrada}
              />
            </Campo>
            <Campo etiqueta="Reserva por lote (%)" requerido ayuda="0 a 50. Ej.: 2,5">
              <input
                name="reservaPorcentaje"
                defaultValue={String(politica.reservaBps / 100).replace(".", ",")}
                required
                inputMode="decimal"
                style={entrada}
              />
            </Campo>
            <Campo etiqueta="La reserva se libera a los (días)" requerido ayuda="0 a 365">
              <input
                name="diasReserva"
                type="number"
                min={0}
                max={365}
                defaultValue={politica.diasReserva}
                required
                style={entrada}
              />
            </Campo>
          </div>
          <Casilla
            etiqueta="Retener el primer cobro hasta revisarlo"
            nombre="retenerPrimerCobro"
            defecto={politica.retenerPrimerCobro}
            ayuda="La única defensa antes de la Fase 9"
          />
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748B" }}>
            Rige para los lotes que se preparen desde ahora. Queda en la auditoría con el antes y el
            después.
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
              style={{
                ...boton,
                background: pendiente
                  ? "rgba(10,37,64,0.4)"
                  : "linear-gradient(135deg, #0a2540 0%, #4b3075 100%)",
                color: "#fff",
                border: "none"
              }}
            >
              <Save size={13} /> {pendiente ? "Guardando…" : "Guardar política"}
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              disabled={pendiente}
              style={{
                ...boton,
                background: "transparent",
                border: "1px solid #E2E8F0",
                color: "#64748B",
                fontWeight: 600
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
