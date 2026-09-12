"use client";

import { Campo, entrada } from "@/components/campos";
import type { Lote } from "@/lib/api/evepay";
import { formatoMonto } from "@/lib/formato";
import { CircleCheck, Send, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { aprobarLote, fallarLote, pagarLote } from "./acciones";

const boton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  borderRadius: 8,
  padding: "0.4rem 0.75rem",
  fontSize: "0.76rem",
  fontWeight: 700,
  cursor: "pointer",
  border: "1px solid #E2E8F0",
  background: "#fff",
  color: "#4b3075"
};

/**
 * Los tres pasos de un lote abierto según quién mira (spec `dispersion`,
 * `rbac-operativo`): aprobar (finanzas, otra persona que quien preparó),
 * registrar el pago hecho desde el banco (finanzas) o marcarlo fallido. El
 * monto no se edita al registrar el pago: es el del lote.
 */
export function AccionesLote({
  lote,
  actor,
  puedeAprobar,
  puedePagar
}: {
  lote: Lote;
  actor: string;
  puedeAprobar: boolean;
  puedePagar: boolean;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [modo, setModo] = useState<"nada" | "pagar" | "fallar">("nada");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const esQuienPreparo = lote.preparadoPor === actor;

  function correr(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    iniciar(async () => {
      const r = await fn();
      if (r.ok) {
        setModo("nada");
        router.refresh();
      } else {
        setError(r.error ?? "Error");
      }
    });
  }

  function enviarPago(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    correr(() => pagarLote(lote.id, datos));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {modo === "nada" && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          {lote.estado === "programado" && puedeAprobar && !esQuienPreparo && (
            <button
              type="button"
              disabled={pendiente}
              onClick={() => correr(() => aprobarLote(lote.id))}
              style={{ ...boton, background: "#0A2540", color: "#fff", border: "none" }}
            >
              <CircleCheck size={13} /> Aprobar lote
            </button>
          )}
          {lote.estado === "programado" && esQuienPreparo && (
            <span style={{ fontSize: "0.75rem", color: "#B45309" }}>
              Tú preparaste este lote: lo aprueba otra persona (cuatro ojos).
            </span>
          )}
          {lote.estado === "aprobado" && puedePagar && (
            <button
              type="button"
              onClick={() => setModo("pagar")}
              style={{ ...boton, background: "#15803D", color: "#fff", border: "none" }}
            >
              <Send size={13} /> Registrar pago
            </button>
          )}
          {puedePagar && (
            <button
              type="button"
              onClick={() => setModo("fallar")}
              style={{ ...boton, color: "#B91C1C" }}
            >
              <XCircle size={13} /> Marcar fallido
            </button>
          )}
        </div>
      )}

      {modo === "pagar" && (
        <form
          onSubmit={enviarPago}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.7rem",
            border: "1px solid #E2E8F0",
            borderRadius: 10,
            padding: "0.8rem 0.9rem"
          }}
        >
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#0A2540" }}>
            Transfiere <strong>{formatoMonto(lote.montoMinor, "COP")}</strong> a {lote.cuenta.banco}{" "}
            {lote.cuenta.tipoCuenta} <code>{lote.cuenta.numeroCuenta}</code> (
            {lote.cuenta.titularCuenta}) y registra aquí lo que dice el banco. El monto no se edita:
            es el del lote.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.7rem"
            }}
          >
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
              <input name="referenciaPago" required maxLength={120} autoFocus style={entrada} />
            </Campo>
            <Campo etiqueta="Comprobante" ayuda="Número o enlace, opcional">
              <input name="comprobante" maxLength={500} style={entrada} />
            </Campo>
          </div>
          {error && (
            <p role="alert" style={{ margin: 0, fontSize: "0.8rem", color: "#B91C1C" }}>
              {error}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="submit"
              disabled={pendiente}
              style={{ ...boton, background: "#15803D", color: "#fff", border: "none" }}
            >
              <Send size={13} /> {pendiente ? "Registrando…" : "Confirmar pago"}
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

      {modo === "fallar" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
            border: "1px solid #FECACA",
            borderRadius: 10,
            padding: "0.8rem 0.9rem"
          }}
        >
          <Campo
            etiqueta="¿Por qué falló?"
            requerido
            ayuda="Sus cobros vuelven a quedar disponibles para un lote nuevo"
          >
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={500}
              autoFocus
              style={entrada}
            />
          </Campo>
          {error && (
            <p role="alert" style={{ margin: 0, fontSize: "0.8rem", color: "#B91C1C" }}>
              {error}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              disabled={pendiente}
              onClick={() => correr(() => fallarLote(lote.id, motivo))}
              style={{ ...boton, background: "#B91C1C", color: "#fff", border: "none" }}
            >
              <XCircle size={13} /> {pendiente ? "Marcando…" : "Marcar fallido"}
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

      {modo === "nada" && error && (
        <p role="alert" style={{ margin: 0, fontSize: "0.8rem", color: "#B91C1C" }}>
          {error}
        </p>
      )}
    </div>
  );
}
