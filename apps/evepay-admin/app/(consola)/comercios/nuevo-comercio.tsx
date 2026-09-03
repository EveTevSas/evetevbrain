"use client";

import { AvisoClaves, ClaveUnaVez } from "@/components/clave-una-vez";
import { BarraPasos, Paso } from "@/components/pasos";
import { ArrowLeft, ArrowRight, Info, Plus } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { CamposPaso, PASOS, validarPaso } from "./campos-perfil";
import { crearComercio, type Resultado } from "./acciones";
import type { ComercioCreado } from "@/lib/api/evepay";

const boton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  borderRadius: 9,
  padding: "0.6rem 1.1rem",
  fontSize: "0.83rem",
  fontWeight: 700,
  cursor: "pointer"
};

const primario: React.CSSProperties = {
  ...boton,
  background: "linear-gradient(135deg, #0a2540 0%, #4b3075 100%)",
  color: "#fff",
  border: "none"
};

const secundario: React.CSSProperties = {
  ...boton,
  background: "transparent",
  border: "1px solid #E2E8F0",
  color: "#64748B",
  fontWeight: 600
};

export function NuevoComercio() {
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState(0);
  const [errorPaso, setErrorPaso] = useState<string | null>(null);
  // Compartido entre pasos: el paso de beneficiarios cambia según esto.
  const [tipoPersona, setTipoPersona] = useState("juridica");
  const formRef = useRef<HTMLFormElement>(null);

  const [estado, accion, enviando] = useActionState<Resultado<ComercioCreado> | null, FormData>(
    crearComercio,
    null
  );

  const creado = estado?.ok ? estado.datos : null;
  const ultimo = paso === PASOS.length - 1;

  function avanzar() {
    const form = formRef.current;
    if (!form) return;

    const problema = validarPaso(paso, form);
    if (problema) {
      setErrorPaso(problema);
      return;
    }
    setErrorPaso(null);
    setPaso((p) => Math.min(p + 1, PASOS.length - 1));
  }

  function retroceder() {
    setErrorPaso(null);
    setPaso((p) => Math.max(p - 1, 0));
  }

  /**
   * Antes de enviar se revisan TODOS los pasos, no solo el último: se puede
   * llegar al final volviendo atrás y vaciando un campo del camino.
   */
  function alEnviar(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    for (let i = 0; i < PASOS.length; i++) {
      const problema = validarPaso(i, form);
      if (problema) {
        e.preventDefault();
        setPaso(i);
        setErrorPaso(problema);
        return;
      }
    }
    setErrorPaso(null);
  }

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

        <button type="button" onClick={() => window.location.reload()} style={primario}>
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
          ...primario,
          marginBottom: "1.5rem",
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
      ref={formRef}
      action={accion}
      onSubmit={alEnviar}
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        padding: "1.5rem",
        marginBottom: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.2rem"
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: "1rem", color: "#0A2540" }}>Nuevo comercio</h2>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "#64748B" }}>
          Estos datos son los que permiten facturarle, notificarle y dispersarle lo recaudado.
        </p>
      </div>

      <BarraPasos pasos={[...PASOS]} actual={paso} onIr={setPaso} />

      {/* Los pasos se ocultan pero no se desmontan: si salieran del DOM, lo ya
          escrito no viajaría en el envío. */}
      {PASOS.map((_, i) => (
        <Paso key={i} visible={i === paso}>
          <CamposPaso paso={i} tipoPersona={tipoPersona} onTipoPersona={setTipoPersona} />
        </Paso>
      ))}

      {errorPaso && (
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
          {errorPaso}
        </p>
      )}

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
            color: "#B91C1C",
            whiteSpace: "pre-wrap"
          }}
        >
          {estado.error}
        </p>
      )}

      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
        {paso > 0 && (
          <button type="button" onClick={retroceder} disabled={enviando} style={secundario}>
            <ArrowLeft size={15} />
            Atrás
          </button>
        )}

        {!ultimo ? (
          <button type="button" onClick={avanzar} style={primario}>
            Siguiente
            <ArrowRight size={15} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={enviando}
            style={{
              ...primario,
              background: enviando
                ? "rgba(10,37,64,0.4)"
                : "linear-gradient(135deg, #0a2540 0%, #4b3075 100%)",
              cursor: enviando ? "not-allowed" : "pointer"
            }}
          >
            {enviando ? "Creando…" : "Crear comercio"}
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setAbierto(false);
            setPaso(0);
            setErrorPaso(null);
          }}
          disabled={enviando}
          style={secundario}
        >
          Cancelar
        </button>

        <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#94A3B8" }}>
          Paso {paso + 1} de {PASOS.length}
        </span>
      </div>
    </form>
  );
}
