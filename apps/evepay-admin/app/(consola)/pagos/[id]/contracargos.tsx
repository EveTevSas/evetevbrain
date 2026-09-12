"use client";

import { Campo, entrada } from "@/components/campos";
import type { Contracargo } from "@/lib/api/evepay";
import { formatoMonto } from "@/lib/formato";
import { AlertTriangle, FileText, Gavel } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { evidenciaContracargo, registrarContracargo, resolverContracargo } from "../acciones";

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
const tono = {
  recibido: "#B45309",
  en_evidencia: "#1D4ED8",
  ganado: "#15803D",
  perdido: "#B91C1C"
} as const;

/** Contracargos del cobro: recibido → en_evidencia → ganado | perdido, con la fecha límite a la vista. */
export function Contracargos({
  paymentId,
  montoCobro,
  moneda,
  estadoCobro,
  contracargos,
  puedeGestionar,
  puedeResolver
}: {
  paymentId: string;
  montoCobro: number;
  moneda: string;
  estadoCobro: string;
  contracargos: Contracargo[];
  puedeGestionar: boolean;
  puedeResolver: boolean;
}) {
  const router = useRouter();
  const [modo, setModo] = useState<"nada" | "nuevo" | "evidencia" | "resolver">("nada");
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [evidencia, setEvidencia] = useState("");
  const abierto = contracargos.find((c) => c.estado === "recibido" || c.estado === "en_evidencia");

  function correr(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    iniciar(async () => {
      const r = await fn();
      if (r.ok) {
        setModo("nada");
        router.refresh();
      } else setError(r.error ?? "Error");
    });
  }
  function enviarNuevo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    correr(() => registrarContracargo(paymentId, d));
  }
  function enviarResolver(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    if (abierto) correr(() => resolverContracargo(abierto.id, paymentId, d));
  }

  const puedeAbrir =
    puedeGestionar && !abierto && (estadoCobro === "aprobado" || estadoCobro === "conciliado");

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
        <h2 style={{ margin: 0, fontSize: "0.95rem", color: "#0A2540" }}>Contracargos</h2>
        {modo === "nada" && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {puedeAbrir && (
              <button type="button" onClick={() => setModo("nuevo")} style={boton}>
                <AlertTriangle size={13} /> Registrar contracargo
              </button>
            )}
            {abierto && puedeGestionar && (
              <button
                type="button"
                onClick={() => {
                  setEvidencia(abierto.evidencia ?? "");
                  setModo("evidencia");
                }}
                style={boton}
              >
                <FileText size={13} /> Evidencia
              </button>
            )}
            {abierto && puedeResolver && (
              <button
                type="button"
                onClick={() => setModo("resolver")}
                style={{ ...boton, background: "#0A2540", color: "#fff", border: "none" }}
              >
                <Gavel size={13} /> Resolver
              </button>
            )}
          </div>
        )}
      </div>

      {modo === "nuevo" && (
        <form
          onSubmit={enviarNuevo}
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
            <Campo etiqueta="Monto reclamado" requerido>
              <input
                name="monto"
                inputMode="numeric"
                required
                defaultValue={String(montoCobro)}
                autoFocus
                style={entrada}
              />
            </Campo>
            <Campo etiqueta="Fecha límite de evidencia" requerido>
              <input name="fechaLimiteEvidencia" type="date" required style={entrada} />
            </Campo>
            <Campo etiqueta="Referencia de la red" ayuda="Opcional">
              <input name="referenciaRed" maxLength={120} style={entrada} />
            </Campo>
          </div>
          <Campo etiqueta="Motivo que da la red" requerido>
            <input name="motivoRed" required minLength={3} maxLength={500} style={entrada} />
          </Campo>
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
              {pendiente ? "Registrando…" : "Registrar"}
            </button>
            <button
              type="button"
              onClick={() => setModo("nada")}
              style={{ ...boton, color: "#64748B" }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {modo === "evidencia" && abierto && (
        <div
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
          <Campo
            etiqueta="Evidencia enviada a la red"
            requerido
            ayuda="Qué se envió: factura, correos, entrega, enlace al archivo"
          >
            <textarea
              value={evidencia}
              onChange={(e) => setEvidencia(e.target.value)}
              rows={4}
              maxLength={4000}
              style={{ ...entrada, fontFamily: "inherit" }}
            />
          </Campo>
          {error && (
            <p role="alert" style={{ margin: 0, fontSize: "0.82rem", color: "#B91C1C" }}>
              {error}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              type="button"
              disabled={pendiente}
              onClick={() => correr(() => evidenciaContracargo(abierto.id, paymentId, evidencia))}
              style={{ ...boton, background: "#0A2540", color: "#fff", border: "none" }}
            >
              {pendiente ? "Guardando…" : "Guardar evidencia"}
            </button>
            <button
              type="button"
              onClick={() => setModo("nada")}
              style={{ ...boton, color: "#64748B" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {modo === "resolver" && abierto && (
        <form
          onSubmit={enviarResolver}
          style={{
            border: "1px solid #FDE68A",
            background: "#FFFBEB",
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
            <Campo etiqueta="Resultado" requerido>
              <select name="resultado" defaultValue="perdido" style={entrada}>
                <option value="ganado">Ganado (nada cambia)</option>
                <option value="perdido">
                  Perdido (sale {formatoMonto(abierto.montoMinor, moneda)})
                </option>
              </select>
            </Campo>
            <Campo etiqueta="Fecha del débito" ayuda="Si se perdió">
              <input
                name="fecha"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                style={entrada}
              />
            </Campo>
            <Campo etiqueta="Referencia del débito" ayuda="Si se perdió; por defecto la de la red">
              <input name="referenciaPago" maxLength={120} style={entrada} />
            </Campo>
          </div>
          <Campo etiqueta="Nota">
            <input name="nota" maxLength={500} style={entrada} />
          </Campo>
          <p style={{ margin: 0, fontSize: "0.74rem", color: "#78350F" }}>
            <strong>Perdido no se deshace:</strong> el dinero sale del libro como un reembolso total
            del contracargo y el cobro queda reembolsado.
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
              style={{ ...boton, background: "#B45309", color: "#fff", border: "none" }}
            >
              <Gavel size={13} /> {pendiente ? "Resolviendo…" : "Confirmar resultado"}
            </button>
            <button
              type="button"
              onClick={() => setModo("nada")}
              style={{ ...boton, color: "#64748B" }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {modo === "nada" && error && (
        <p role="alert" style={{ margin: "0 0 0.6rem", fontSize: "0.82rem", color: "#B91C1C" }}>
          {error}
        </p>
      )}

      {contracargos.length === 0 ? (
        <p style={{ margin: 0, fontSize: "0.8rem", color: "#94A3B8" }}>Sin contracargos.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {contracargos.map((c) => (
            <div
              key={c.id}
              style={{
                fontSize: "0.8rem",
                color: "#0A2540",
                borderBottom: "1px solid #F1F5F9",
                paddingBottom: "0.5rem"
              }}
            >
              <strong style={{ color: tono[c.estado] }}>{c.estado.replace("_", " ")}</strong> ·{" "}
              {formatoMonto(c.montoMinor, moneda)} · {c.motivoRed}
              {(c.estado === "recibido" || c.estado === "en_evidencia") && (
                <span
                  style={{
                    marginLeft: "0.5rem",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    color: c.diasParaEvidencia <= 2 ? "#B91C1C" : "#B45309"
                  }}
                >
                  {c.diasParaEvidencia < 0
                    ? `venció hace ${-c.diasParaEvidencia} día(s)`
                    : `evidencia vence en ${c.diasParaEvidencia} día(s) (${c.fechaLimiteEvidencia})`}
                </span>
              )}
              <div style={{ fontSize: "0.72rem", color: "#64748B" }}>
                recibido por {c.recibidoPor} · {new Date(c.recibidoEn).toLocaleDateString("es-CO")}
                {c.evidencia &&
                  ` · evidencia: ${c.evidencia.slice(0, 80)}${c.evidencia.length > 80 ? "…" : ""}`}
                {c.resueltoPor &&
                  ` · resuelto por ${c.resueltoPor}${c.resolucionNota ? `: ${c.resolucionNota}` : ""}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
