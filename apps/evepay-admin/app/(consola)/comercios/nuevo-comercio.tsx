"use client";

import { AvisoClaves, ClaveUnaVez } from "@/components/clave-una-vez";
import { Info, Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { crearComercio, type Resultado } from "./acciones";
import type { ComercioCreado } from "@/lib/api/evepay";

const entrada: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#fff",
  border: "1px solid #E2E8F0",
  borderRadius: 9,
  padding: "0.6rem 0.8rem",
  fontSize: "0.87rem",
  color: "#0A2540",
  outline: "none"
};

const etiqueta: React.CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 600,
  color: "#334155",
  letterSpacing: "0.03em"
};

export function NuevoComercio() {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, enviando] = useActionState<Resultado<ComercioCreado> | null, FormData>(
    crearComercio,
    null
  );

  const creado = estado?.ok ? estado.datos : null;

  if (creado) {
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #E2E8F0",
          borderRadius: 14,
          padding: "1.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem"
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1rem", color: "#0A2540" }}>Comercio creado</h2>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#64748B" }}>
            Tenant <code>{creado.tenantId}</code>
          </p>
        </div>

        <AvisoClaves>
          <ClaveUnaVez etiqueta="API key de producción (live)" valor={creado.apiKey} />
          <ClaveUnaVez etiqueta="API key de pruebas (test)" valor={creado.testApiKey} />
        </AvisoClaves>

        {creado.pasoManualProveedor && (
          <p
            style={{
              margin: 0,
              display: "flex",
              gap: "0.5rem",
              alignItems: "flex-start",
              background: "rgba(75,48,117,0.07)",
              border: "1px solid rgba(75,48,117,0.2)",
              borderRadius: 9,
              padding: "0.7rem 0.9rem",
              fontSize: "0.82rem",
              color: "#4b3075",
              lineHeight: 1.5
            }}
          >
            <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              <strong>Queda un paso fuera de EvePay.</strong> {creado.pasoManualProveedor}
            </span>
          </p>
        )}

        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            alignSelf: "flex-start",
            background: "linear-gradient(135deg, #0a2540 0%, #4b3075 100%)",
            color: "#fff",
            border: "none",
            borderRadius: 9,
            padding: "0.6rem 1.1rem",
            fontSize: "0.83rem",
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          Ya las copié, continuar
        </button>
      </div>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.45rem",
          marginBottom: "1.5rem",
          background: "linear-gradient(135deg, #0a2540 0%, #4b3075 100%)",
          color: "#fff",
          border: "none",
          borderRadius: 9,
          padding: "0.6rem 1.05rem",
          fontSize: "0.84rem",
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(75,48,117,0.28)"
        }}
      >
        <Plus size={16} />
        Nuevo comercio
      </button>
    );
  }

  return (
    <form
      action={accion}
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        padding: "1.5rem",
        marginBottom: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        maxWidth: 560
      }}
    >
      <h2 style={{ margin: 0, fontSize: "1rem", color: "#0A2540" }}>Nuevo comercio</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        <label htmlFor="legalName" style={etiqueta}>
          Razón social
        </label>
        <input id="legalName" name="legalName" required minLength={3} style={entrada} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        <label htmlFor="displayName" style={etiqueta}>
          Nombre visible
        </label>
        <input id="displayName" name="displayName" required minLength={2} style={entrada} />
      </div>

      {estado && !estado.ok && (
        <p
          role="alert"
          style={{
            margin: 0,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 9,
            padding: "0.6rem 0.85rem",
            fontSize: "0.83rem",
            color: "#B91C1C"
          }}
        >
          {estado.error}
        </p>
      )}

      <div style={{ display: "flex", gap: "0.6rem" }}>
        <button
          type="submit"
          disabled={enviando}
          style={{
            background: enviando
              ? "rgba(10,37,64,0.4)"
              : "linear-gradient(135deg, #0a2540 0%, #4b3075 100%)",
            color: "#fff",
            border: "none",
            borderRadius: 9,
            padding: "0.6rem 1.1rem",
            fontSize: "0.83rem",
            fontWeight: 700,
            cursor: enviando ? "not-allowed" : "pointer"
          }}
        >
          {enviando ? "Creando…" : "Crear comercio"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          disabled={enviando}
          style={{
            background: "transparent",
            border: "1px solid #E2E8F0",
            borderRadius: 9,
            padding: "0.6rem 1.1rem",
            fontSize: "0.83rem",
            fontWeight: 600,
            color: "#64748B",
            cursor: "pointer"
          }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
