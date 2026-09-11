"use client";

import { Campo, entrada } from "@/components/campos";
import type { CuadreCustodia } from "@/lib/api/evepay";
import { formatoMonto } from "@/lib/formato";
import { CircleAlert, CircleCheck, Landmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { registrarSaldoRecaudo } from "./acciones";

/**
 * Cuadre de custodia (CA-8): lo que el libro dice que hay en la cuenta de
 * recaudo contra lo que dice el banco. El saldo del banco se registra a mano
 * del extracto; si no coincide con el libro, aquí se ve como descuadre.
 */
export function CuadreDeCustodia({ cuadre }: { cuadre: CuadreCustodia }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const sinSaldo = cuadre.saldoBanco === null;
  const descuadre = cuadre.diferencia !== null && cuadre.diferencia !== 0;
  const tono = descuadre
    ? { bg: "#FEF2F2", bd: "#FECACA", fg: "#B91C1C" }
    : sinSaldo
      ? { bg: "#FFFBEB", bd: "#FDE68A", fg: "#B45309" }
      : { bg: "#F0FDF4", bd: "#BBF7D0", fg: "#15803D" };

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setError(null);
    iniciar(async () => {
      const r = await registrarSaldoRecaudo(datos);
      if (r.ok) {
        setAbierto(false);
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div
      role={descuadre ? "alert" : "status"}
      style={{
        background: tono.bg,
        border: `1px solid ${tono.bd}`,
        borderRadius: 12,
        padding: "0.9rem 1.1rem",
        marginBottom: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.8rem"
      }}
    >
      <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", flexWrap: "wrap" }}>
        {descuadre || sinSaldo ? (
          <CircleAlert size={17} color={tono.fg} style={{ flexShrink: 0, marginTop: 2 }} />
        ) : (
          <CircleCheck size={17} color={tono.fg} style={{ flexShrink: 0, marginTop: 2 }} />
        )}
        <div style={{ flex: 1, minWidth: 240 }}>
          <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: tono.fg }}>
            {descuadre
              ? `Descuadre de custodia al ${cuadre.fecha}: ${formatoMonto(Math.abs(cuadre.diferencia ?? 0), "COP")} ${
                  (cuadre.diferencia ?? 0) > 0
                    ? "más en el banco que en el libro"
                    : "menos en el banco que en el libro"
                }`
              : sinSaldo
                ? `Sin saldo del banco registrado para el ${cuadre.fecha}`
                : `Custodia cuadrada al ${cuadre.fecha}`}
          </p>
          <p
            style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#334155", lineHeight: 1.5 }}
          >
            El libro dice que en la cuenta de recaudo hay{" "}
            <strong>{formatoMonto(cuadre.saldoLibro, "COP")}</strong> de todos los comercios.{" "}
            {sinSaldo
              ? "Registra el saldo del extracto para comparar: no saber no es lo mismo que cuadrar."
              : `El banco dice ${formatoMonto(cuadre.saldoBanco ?? 0, "COP")} (registrado por ${cuadre.registradoPor}).`}
          </p>
        </div>
        {!abierto && (
          <button
            type="button"
            onClick={() => setAbierto(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 9,
              padding: "0.45rem 0.85rem",
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "#4b3075",
              cursor: "pointer"
            }}
          >
            <Landmark size={13} />
            Registrar saldo del banco
          </button>
        )}
      </div>

      {abierto && (
        <form
          onSubmit={enviar}
          style={{
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 10,
            padding: "0.9rem 1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.8rem"
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "0.9rem"
            }}
          >
            <Campo etiqueta="Fecha del saldo" requerido>
              <input
                name="fecha"
                type="date"
                required
                defaultValue={cuadre.fecha}
                style={entrada}
              />
            </Campo>
            <Campo
              etiqueta="Saldo de la cuenta de recaudo"
              requerido
              ayuda="En pesos, del extracto"
            >
              <input name="saldoMinor" inputMode="numeric" required autoFocus style={entrada} />
            </Campo>
            <Campo etiqueta="Nota" ayuda="Opcional">
              <input name="nota" maxLength={500} style={entrada} />
            </Campo>
          </div>
          <p style={{ margin: 0, fontSize: "0.74rem", color: "#64748B" }}>
            Es un registro nuevo, no una corrección del anterior: para una fecha vale el último.
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
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                background: pendiente
                  ? "rgba(10,37,64,0.4)"
                  : "linear-gradient(135deg, #0a2540 0%, #4b3075 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 9,
                padding: "0.45rem 0.85rem",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: pendiente ? "not-allowed" : "pointer"
              }}
            >
              <Landmark size={13} />
              {pendiente ? "Guardando…" : "Guardar saldo"}
            </button>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              disabled={pendiente}
              style={{
                background: "transparent",
                border: "1px solid #E2E8F0",
                color: "#64748B",
                borderRadius: 9,
                padding: "0.45rem 0.85rem",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer"
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
