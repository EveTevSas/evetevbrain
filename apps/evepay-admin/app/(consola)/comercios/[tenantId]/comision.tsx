"use client";

import { Campo, entrada } from "@/components/campos";
import type { TarifaComercioAdmin, VersionTarifaProveedor } from "@/lib/api/evepay";
import { formatoMonto } from "@/lib/formato";
import { COBRO_DE_REFERENCIA, montoDigitado, porcentaje, porcentajeABps } from "@/lib/tarifas";
import { desglosarCobro, type IvaBps } from "@evetev/shared";
import { CircleAlert, Pencil, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { asignarTarifaComercio } from "../acciones";

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
      <div style={{ fontSize: "0.85rem", color: "#0A2540", marginTop: "0.15rem" }}>{children}</div>
    </div>
  );
}

const rejilla: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "1rem"
};

/**
 * Bloque «Comisión» de la ficha (spec `comisiones`, CA-9 y CA-10).
 *
 * La vista previa se calcula con `desglosarCobro`, la misma función que usa
 * la API al asentar: lo que operación ve aquí es, centavo a centavo, lo que
 * el libro va a registrar. Un margen negativo se advierte pero se puede
 * guardar: un piloto sin comisión es una decisión válida.
 */
export function Comision({
  tenantId,
  tarifa,
  proveedor,
  puedeEditar
}: {
  tenantId: string;
  tarifa: TarifaComercioAdmin;
  /** El que atiende los cobros y lo que nos cobra; null si aún no tiene tarifa. */
  proveedor: { nombre: string; tarifa: VersionTarifaProveedor | null };
  /** Solo super_admin cambia tarifas (rbac-operativo). */
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const vigente = tarifa.vigente;

  const [editando, setEditando] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  const [referenciaTexto, setReferenciaTexto] = useState(String(COBRO_DE_REFERENCIA));
  const [porcentajeTexto, setPorcentajeTexto] = useState(
    vigente ? String(vigente.bps / 100).replace(".", ",") : "0"
  );
  const [fijoTexto, setFijoTexto] = useState(vigente ? String(vigente.fijoMinor) : "0");
  const [ivaBps, setIvaBps] = useState<IvaBps>(vigente?.ivaBps ?? 1900);

  // Lo que se muestra: la propuesta mientras se edita, la vigente si no.
  const bps = editando ? porcentajeABps(porcentajeTexto) : (vigente?.bps ?? NaN);
  const fijoMinor = editando ? montoDigitado(fijoTexto) : (vigente?.fijoMinor ?? NaN);
  const iva = editando ? ivaBps : (vigente?.ivaBps ?? 0);
  const referencia = montoDigitado(referenciaTexto);

  const propuestaValida =
    Number.isInteger(bps) &&
    bps >= 0 &&
    bps <= 10_000 &&
    Number.isInteger(fijoMinor) &&
    fijoMinor >= 0;
  const desglose =
    propuestaValida && referencia > 0
      ? desglosarCobro(
          referencia,
          { bps, fijoMinor, ivaBps: iva },
          proveedor.tarifa ?? { bps: 0, fijoMinor: 0 }
        )
      : null;

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setError(null);
    iniciar(async () => {
      const r = await asignarTarifaComercio(tenantId, datos);
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
          gap: "1rem",
          marginBottom: "1.1rem",
          flexWrap: "wrap"
        }}
      >
        <h2 style={{ margin: 0, fontSize: "0.98rem", color: "#0A2540" }}>Comisión</h2>
        {!editando && puedeEditar && (
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            {guardado && (
              <span role="status" style={{ fontSize: "0.8rem", color: "#15803D", fontWeight: 600 }}>
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
              {vigente ? "Cambiar tarifa" : "Asignar tarifa"}
            </button>
          </div>
        )}
      </div>

      {!vigente && !editando && (
        <div
          role="status"
          style={{
            background: "#FFFBEB",
            border: "1px solid #FDE68A",
            borderRadius: 12,
            padding: "0.85rem 1.05rem",
            marginBottom: "1rem",
            display: "flex",
            gap: "0.55rem",
            alignItems: "flex-start"
          }}
        >
          <CircleAlert size={16} color="#B45309" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: "0.83rem", color: "#78350F", lineHeight: 1.5 }}>
            <strong>Sin tarifa.</strong> Este comercio no puede cobrar hasta que se le asigne lo que
            EvePay le cobra por transacción.
          </p>
        </div>
      )}

      {vigente && !editando && (
        <div style={{ ...rejilla, marginBottom: "1.2rem" }}>
          <Dato etiqueta="Porcentaje">{porcentaje(vigente.bps)}</Dato>
          <Dato etiqueta="Fijo por transacción">{formatoMonto(vigente.fijoMinor, "COP")}</Dato>
          <Dato etiqueta="IVA de la comisión">{porcentaje(vigente.ivaBps)}</Dato>
          <Dato etiqueta="Vigente desde">
            {new Date(vigente.vigenteDesde).toLocaleDateString("es-CO")}
          </Dato>
          <Dato etiqueta="Puesta por">{vigente.creadaPor}</Dato>
        </div>
      )}

      {editando && (
        <form
          onSubmit={enviar}
          style={{
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: "1rem 1.1rem",
            marginBottom: "1.2rem",
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
            <Campo etiqueta="Porcentaje" requerido ayuda="Sobre el monto del cobro. Ej.: 2,9">
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
            <Campo etiqueta="IVA de la comisión" requerido ayuda="Lo confirma el contador">
              <select
                name="ivaBps"
                value={ivaBps}
                onChange={(e) => setIvaBps(Number(e.target.value) as IvaBps)}
                style={entrada}
              >
                <option value={0}>0 %</option>
                <option value={1900}>19 %</option>
              </select>
            </Campo>
          </div>

          <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748B" }}>
            Se guarda como una versión nueva: los cobros ya creados conservan la suya, y el cambio
            queda en la auditoría con la tarifa anterior.
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

      {(vigente || editando) && (
        <div
          style={{
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: "1rem 1.1rem",
            marginBottom: "1.2rem"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.7rem",
              flexWrap: "wrap",
              marginBottom: "0.9rem"
            }}
          >
            <h3 style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, color: "#4b3075" }}>
              {editando ? "ASÍ QUEDARÍA UN COBRO DE" : "ASÍ SE REPARTE UN COBRO DE"}
            </h3>
            <input
              aria-label="Cobro de referencia"
              value={referenciaTexto}
              onChange={(e) => setReferenciaTexto(e.target.value)}
              inputMode="numeric"
              style={{ ...entrada, width: 130, padding: "0.3rem 0.55rem", fontSize: "0.8rem" }}
            />
            <span style={{ fontSize: "0.75rem", color: "#64748B" }}>COP</span>
          </div>

          {desglose ? (
            <>
              <div style={rejilla}>
                <Dato etiqueta="Recibe el comercio">
                  <strong>{formatoMonto(desglose.alComercio, "COP")}</strong>
                </Dato>
                <Dato etiqueta="Comisión EvePay">{formatoMonto(desglose.comision, "COP")}</Dato>
                <Dato etiqueta="IVA (para la DIAN)">{formatoMonto(desglose.iva, "COP")}</Dato>
                <Dato etiqueta={`Costo ${proveedor.nombre}`}>
                  {proveedor.tarifa ? (
                    formatoMonto(desglose.costoProveedor, "COP")
                  ) : (
                    <span style={{ color: "#B45309" }}>sin tarifa</span>
                  )}
                </Dato>
                <Dato etiqueta="Margen EvePay">
                  <strong style={{ color: desglose.margen < 0 ? "#B91C1C" : "#15803D" }}>
                    {formatoMonto(desglose.margen, "COP")}
                  </strong>
                </Dato>
              </div>

              {desglose.alComercio <= 0 && (
                <p
                  role="alert"
                  style={{
                    margin: "0.9rem 0 0",
                    fontSize: "0.8rem",
                    color: "#B91C1C",
                    fontWeight: 600
                  }}
                >
                  La comisión más su IVA se come el cobro entero: la API rechazará cobros de este
                  monto.
                </p>
              )}
              {desglose.alComercio > 0 && desglose.margen < 0 && proveedor.tarifa && (
                <p
                  role="alert"
                  style={{
                    margin: "0.9rem 0 0",
                    fontSize: "0.8rem",
                    color: "#B45309",
                    fontWeight: 600
                  }}
                >
                  Con esta tarifa pierdes {formatoMonto(-desglose.margen, "COP")} en cada cobro de{" "}
                  {formatoMonto(referencia, "COP")}: el costo de {proveedor.nombre} supera la
                  comisión. Se puede guardar igual.
                </p>
              )}
              {!proveedor.tarifa && (
                <p style={{ margin: "0.9rem 0 0", fontSize: "0.78rem", color: "#B45309" }}>
                  {proveedor.nombre} no tiene tarifa configurada: el costo y el margen no se pueden
                  calcular, y ningún comercio puede cobrar hasta ponerla en Proveedores.
                </p>
              )}
            </>
          ) : (
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#94A3B8" }}>
              Escribe un porcentaje, un fijo y un cobro de referencia válidos para ver el reparto.
            </p>
          )}
        </div>
      )}

      {tarifa.historial.length > 1 && (
        <div>
          <h3
            style={{
              margin: "0 0 0.6rem",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#4b3075",
              letterSpacing: "0.04em"
            }}
          >
            HISTORIAL
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <tbody>
                {tarifa.historial.map((v, i) => (
                  <tr key={v.id} style={{ color: i === 0 ? "#0A2540" : "#64748B" }}>
                    <td style={{ padding: "0.35rem 0.5rem 0.35rem 0", whiteSpace: "nowrap" }}>
                      {new Date(v.vigenteDesde).toLocaleString("es-CO")}
                    </td>
                    <td style={{ padding: "0.35rem 0.5rem", whiteSpace: "nowrap" }}>
                      {porcentaje(v.bps)} + {formatoMonto(v.fijoMinor, "COP")}
                    </td>
                    <td style={{ padding: "0.35rem 0.5rem", whiteSpace: "nowrap" }}>
                      IVA {porcentaje(v.ivaBps)}
                    </td>
                    <td style={{ padding: "0.35rem 0 0.35rem 0.5rem" }}>{v.creadaPor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
