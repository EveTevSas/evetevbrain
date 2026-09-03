"use client";

import { AvisoClaves, ClaveUnaVez } from "@/components/clave-una-vez";
import { BadgeCheck, BadgeX, KeyRound, Power, PowerOff } from "lucide-react";
import { useState, useTransition } from "react";
import { cambiarEstadoComercio, cambiarKyc, rotarApiKey } from "./acciones";
import type { ApiKeyRotada } from "@/lib/api/evepay";

const boton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.35rem",
  border: "1px solid #E2E8F0",
  background: "#fff",
  borderRadius: 8,
  padding: "0.4rem 0.65rem",
  fontSize: "0.75rem",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap"
};

export function AccionesComercio({
  tenantId,
  nombre,
  activo,
  kyc
}: {
  tenantId: string;
  nombre: string;
  activo: boolean;
  /** Estado del merchant; sin "aprobado" el comercio no puede cobrar. */
  kyc?: string;
}) {
  const [pendiente, iniciar] = useTransition();
  const [rotada, setRotada] = useState<ApiKeyRotada | null>(null);
  const [error, setError] = useState<string | null>(null);

  function rotar(environment: "live" | "test") {
    // Rotar revoca la clave anterior: lo que estuviera cobrando con ella deja
    // de funcionar en el acto. Por eso se confirma nombrando el comercio.
    const seguro = window.confirm(
      `Rotar la clave ${environment} de "${nombre}".\n\nLa clave actual deja de servir inmediatamente y todo lo que la use dejará de cobrar hasta que se actualice.\n\n¿Continuar?`
    );
    if (!seguro) return;

    setError(null);
    iniciar(async () => {
      const r = await rotarApiKey(tenantId, environment);
      if (r.ok) setRotada(r.datos);
      else setError(r.error);
    });
  }

  function alternarEstado() {
    const seguro = window.confirm(
      activo
        ? `Desactivar "${nombre}".\n\nNo podrá crear cobros nuevos. Su historial y su ledger siguen consultables.\n\n¿Continuar?`
        : `Reactivar "${nombre}" para que vuelva a poder cobrar.\n\n¿Continuar?`
    );
    if (!seguro) return;

    setError(null);
    iniciar(async () => {
      const r = await cambiarEstadoComercio(tenantId, !activo);
      if (!r.ok) setError(r.error);
    });
  }

  function decidirKyc(estado: "aprobado" | "rechazado") {
    const seguro = window.confirm(
      estado === "aprobado"
        ? `Aprobar el KYC de "${nombre}".\n\nHazlo solo cuando el comercio esté registrado en el panel del proveedor: a partir de aquí PUEDE COBRAR dinero real.\n\n¿Continuar?`
        : `Rechazar el KYC de "${nombre}".\n\nDejará de poder crear cobros. Su historial y su ledger se conservan.\n\n¿Continuar?`
    );
    if (!seguro) return;

    setError(null);
    iniciar(async () => {
      const r = await cambiarKyc(tenantId, estado);
      if (!r.ok) setError(r.error);
    });
  }

  const aprobado = kyc === "aprobado";

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}
    >
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
        {kyc && !aprobado && (
          <button
            type="button"
            onClick={() => decidirKyc("aprobado")}
            disabled={pendiente}
            style={{ ...boton, color: "#15803D", borderColor: "#BBF7D0", background: "#F0FDF4" }}
          >
            <BadgeCheck size={13} />
            Aprobar KYC
          </button>
        )}
        {kyc && aprobado && (
          <button
            type="button"
            onClick={() => decidirKyc("rechazado")}
            disabled={pendiente}
            style={{ ...boton, color: "#B45309" }}
          >
            <BadgeX size={13} />
            Rechazar KYC
          </button>
        )}
        <button
          type="button"
          onClick={() => rotar("live")}
          disabled={pendiente}
          style={{ ...boton, color: "#4b3075" }}
        >
          <KeyRound size={13} />
          Rotar live
        </button>
        <button
          type="button"
          onClick={() => rotar("test")}
          disabled={pendiente}
          style={{ ...boton, color: "#64748B" }}
        >
          <KeyRound size={13} />
          Rotar test
        </button>
        <button
          type="button"
          onClick={alternarEstado}
          disabled={pendiente}
          style={{ ...boton, color: activo ? "#B91C1C" : "#16A34A" }}
        >
          {activo ? <PowerOff size={13} /> : <Power size={13} />}
          {activo ? "Desactivar" : "Activar"}
        </button>
      </div>

      {error && (
        <p role="alert" style={{ margin: 0, fontSize: "0.75rem", color: "#B91C1C" }}>
          {error}
        </p>
      )}

      {rotada && (
        <div style={{ width: "100%", maxWidth: 520 }}>
          <AvisoClaves>
            <ClaveUnaVez etiqueta={`Nueva API key ${rotada.environment}`} valor={rotada.apiKey} />
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#92400E" }}>
              {rotada.desactivadas === 0
                ? "No había ninguna clave activa de este entorno."
                : `${rotada.desactivadas} clave(s) anterior(es) quedaron revocadas.`}
            </p>
          </AvisoClaves>
          <button
            type="button"
            onClick={() => setRotada(null)}
            style={{ ...boton, marginTop: "0.5rem", color: "#4b3075" }}
          >
            Ya la copié
          </button>
        </div>
      )}
    </div>
  );
}
