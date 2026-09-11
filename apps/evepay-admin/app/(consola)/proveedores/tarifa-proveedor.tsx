"use client";

import { Campo, entrada } from "@/components/campos";
import type { TarifaProveedorAdmin, TarifaVigenteDeComercio } from "@/lib/api/evepay";
import { formatoMonto } from "@/lib/formato";
import { COBRO_DE_REFERENCIA, montoDigitado, porcentaje, porcentajeABps } from "@/lib/tarifas";
import { desglosarCobro } from "@evetev/shared";
import { Pencil, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { asignarTarifaProveedor } from "./acciones";

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

/**
 * Bloque «Tarifa que nos cobra» de cada proveedor (spec `comisiones`).
 *
 * Cambiarla afecta a todos los comercios a la vez desde el siguiente cobro,
 * así que antes de guardar se dice a cuántos les quedaría margen negativo en
 * el cobro de referencia, con el mismo `desglosarCobro` que usa la API.
 */
export function TarifaProveedor({
  tarifa,
  tarifasComercios
}: {
  tarifa: TarifaProveedorAdmin;
  /** La tarifa vigente de cada comercio, para medir el efecto del cambio. */
  tarifasComercios: TarifaVigenteDeComercio[];
}) {
  const router = useRouter();
  const vigente = tarifa.vigente;

  const [editando, setEditando] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  const [porcentajeTexto, setPorcentajeTexto] = useState(
    vigente ? String(vigente.bps / 100).replace(".", ",") : "0"
  );
  const [fijoTexto, setFijoTexto] = useState(vigente ? String(vigente.fijoMinor) : "0");
  const [descuenta, setDescuenta] = useState(vigente?.descuentaEnConsignacion ?? true);

  const bps = porcentajeABps(porcentajeTexto);
  const fijoMinor = montoDigitado(fijoTexto);
  const propuestaValida =
    Number.isInteger(bps) &&
    bps >= 0 &&
    bps <= 10_000 &&
    Number.isInteger(fijoMinor) &&
    fijoMinor >= 0;

  const enNegativo = propuestaValida
    ? tarifasComercios.filter(
        (tc) => desglosarCobro(COBRO_DE_REFERENCIA, tc, { bps, fijoMinor }).margen < 0
      ).length
    : 0;

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setError(null);
    iniciar(async () => {
      const r = await asignarTarifaProveedor(tarifa.provider, datos);
      if (r.ok) {
        setGuardado(true);
        setEditando(false);
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.7rem",
          flexWrap: "wrap",
          marginBottom: "0.6rem"
        }}
      >
        <h3 style={{ margin: 0, fontSize: "0.72rem", color: "#334155" }}>TARIFA QUE NOS COBRA</h3>
        {!editando && (
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            {guardado && (
              <span
                role="status"
                style={{ fontSize: "0.78rem", color: "#15803D", fontWeight: 600 }}
              >
                Tarifa actualizada.
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setEditando(true);
                setGuardado(false);
                setError(null);
              }}
              style={{
                ...boton,
                background: "#fff",
                border: "1px solid #E2E8F0",
                color: "#4b3075"
              }}
            >
              <Pencil size={13} />
              {vigente ? "Cambiar tarifa" : "Configurar tarifa"}
            </button>
          </div>
        )}
      </div>

      {!editando &&
        (vigente ? (
          <p style={{ margin: 0, fontSize: "0.83rem", color: "#0A2540", lineHeight: 1.6 }}>
            <strong>
              {porcentaje(vigente.bps)} + {formatoMonto(vigente.fijoMinor, "COP")}
            </strong>{" "}
            por transacción ·{" "}
            {vigente.descuentaEnConsignacion
              ? "la descuenta de lo que consigna"
              : "la factura aparte y consigna el monto completo"}
            <span style={{ display: "block", fontSize: "0.74rem", color: "#64748B" }}>
              Desde {new Date(vigente.vigenteDesde).toLocaleDateString("es-CO")} · puesta por{" "}
              {vigente.creadaPor}
              {tarifa.historial.length > 1 && ` · ${tarifa.historial.length} versiones`}
            </span>
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: "0.83rem", color: "#B45309", lineHeight: 1.5 }}>
            <strong>Sin tarifa.</strong> Mientras este proveedor atienda los cobros, ningún comercio
            puede cobrar hasta configurarla: sin ella EvePay no conoce su costo.
          </p>
        ))}

      {editando && (
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
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.9rem"
            }}
          >
            <Campo etiqueta="Porcentaje" requerido ayuda="Sobre el monto del cobro">
              <input
                name="porcentaje"
                value={porcentajeTexto}
                onChange={(e) => setPorcentajeTexto(e.target.value)}
                inputMode="decimal"
                required
                autoFocus
                style={entrada}
              />
            </Campo>
            <Campo etiqueta="Fijo por transacción" requerido ayuda="En pesos, sin decimales">
              <input
                name="fijo"
                value={fijoTexto}
                onChange={(e) => setFijoTexto(e.target.value)}
                inputMode="numeric"
                required
                style={entrada}
              />
            </Campo>
          </div>

          <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
            <legend
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "0.4rem"
              }}
            >
              ¿Cómo cobra su tarifa? *
            </legend>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <label
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "flex-start",
                  fontSize: "0.82rem",
                  color: "#0A2540"
                }}
              >
                <input
                  type="radio"
                  name="descuentaEnConsignacion"
                  value="true"
                  checked={descuenta}
                  onChange={() => setDescuenta(true)}
                  style={{ marginTop: 3, accentColor: "#4b3075" }}
                />
                <span>
                  La descuenta de lo que consigna
                  <span style={{ display: "block", fontSize: "0.72rem", color: "#94A3B8" }}>
                    Cada consignación debe traer el monto de los cobros menos su tarifa.
                  </span>
                </span>
              </label>
              <label
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "flex-start",
                  fontSize: "0.82rem",
                  color: "#0A2540"
                }}
              >
                <input
                  type="radio"
                  name="descuentaEnConsignacion"
                  value="false"
                  checked={!descuenta}
                  onChange={() => setDescuenta(false)}
                  style={{ marginTop: 3, accentColor: "#4b3075" }}
                />
                <span>
                  La factura aparte
                  <span style={{ display: "block", fontSize: "0.72rem", color: "#94A3B8" }}>
                    Consigna el monto completo y la tarifa se le paga con su factura.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          {propuestaValida && tarifasComercios.length > 0 && (
            <p
              role={enNegativo > 0 ? "alert" : undefined}
              style={{
                margin: 0,
                fontSize: "0.8rem",
                fontWeight: 600,
                color: enNegativo > 0 ? "#B45309" : "#15803D"
              }}
            >
              {enNegativo > 0
                ? `Con esta tarifa, ${enNegativo} de ${tarifasComercios.length} comercios con tarifa quedarían con margen negativo en un cobro de ${formatoMonto(COBRO_DE_REFERENCIA, "COP")}.`
                : `Los ${tarifasComercios.length} comercios con tarifa conservan margen positivo en un cobro de ${formatoMonto(COBRO_DE_REFERENCIA, "COP")}.`}
            </p>
          )}

          <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748B" }}>
            Rige para todos los comercios desde el siguiente cobro; los ya creados conservan su
            versión. Queda en la auditoría con la tarifa anterior.
          </p>

          {error && (
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
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              type="submit"
              disabled={pendiente || !propuestaValida}
              style={{
                ...boton,
                background:
                  pendiente || !propuestaValida
                    ? "rgba(10,37,64,0.4)"
                    : "linear-gradient(135deg, #0a2540 0%, #4b3075 100%)",
                color: "#fff",
                border: "none",
                cursor: pendiente || !propuestaValida ? "not-allowed" : "pointer"
              }}
            >
              <Save size={13} />
              {pendiente ? "Guardando…" : "Guardar tarifa"}
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
