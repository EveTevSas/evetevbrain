"use client";

import { Campo, entrada } from "@/components/campos";
import type { CobroPorConsignar } from "@/lib/api/evepay";
import { formatoMonto } from "@/lib/formato";
import { montoDigitado } from "@/lib/tarifas";
import { Banknote, CircleAlert, CircleCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { registrarConsignacion } from "./acciones";

const boton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  borderRadius: 9,
  padding: "0.5rem 0.95rem",
  fontSize: "0.8rem",
  fontWeight: 700,
  cursor: "pointer",
  border: "none",
  color: "#fff"
};

const celda: React.CSSProperties = {
  padding: "0.5rem 0.6rem",
  fontSize: "0.8rem",
  borderBottom: "1px solid #F1F5F9",
  verticalAlign: "top"
};

/**
 * Consignación asistida (spec `ledger-custodia`, CA-4 a CA-7).
 *
 * ComboPay no expone liquidaciones por API: operación copia del extracto la
 * referencia, la fecha y el monto, y marca qué cobros cubre. El total
 * esperado se suma en vivo con lo que el libro dice que el proveedor debía
 * por cada cobro, y solo se puede confirmar cuando el monto es exactamente
 * ese: la base lo vuelve a comprobar y rechaza todo si no cuadra. Registrar
 * una consignación no se deshace, por eso se confirma diciendo qué incluye.
 */
export function RegistrarConsignacion({
  provider,
  cobros
}: {
  /** El proveedor que atiende los cobros. */
  provider: string;
  cobros: CobroPorConsignar[];
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [montoTexto, setMontoTexto] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  const esperado = useMemo(
    () => cobros.filter((c) => seleccion.has(c.paymentId)).reduce((a, c) => a + c.esperadoMinor, 0),
    [cobros, seleccion]
  );
  const comercios = useMemo(
    () => new Set(cobros.filter((c) => seleccion.has(c.paymentId)).map((c) => c.tenantId)).size,
    [cobros, seleccion]
  );
  const monto = montoDigitado(montoTexto);
  const cuadra = seleccion.size > 0 && monto > 0 && monto === esperado;

  function alternar(id: string) {
    setSeleccion((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
    setConfirmando(false);
  }

  function todos(marcar: boolean) {
    setSeleccion(marcar ? new Set(cobros.map((c) => c.paymentId)) : new Set());
    setConfirmando(false);
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    const datos = new FormData(e.currentTarget);
    datos.set("provider", provider);
    for (const id of seleccion) datos.append("paymentIds", id);
    setError(null);
    iniciar(async () => {
      const r = await registrarConsignacion(datos);
      if (r.ok) {
        setHecho(
          `Consignación ${r.datos.referenciaBancaria} registrada: ${formatoMonto(r.datos.montoMinor, "COP")}, ${seleccion.size} cobro(s) conciliado(s).`
        );
        setAbierto(false);
        setSeleccion(new Set());
        setMontoTexto("");
        setConfirmando(false);
        router.refresh();
      } else {
        setConfirmando(false);
        setError(r.error);
      }
    });
  }

  if (!abierto) {
    return (
      <div style={{ display: "flex", gap: "0.7rem", alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => {
            setAbierto(true);
            setHecho(null);
            setError(null);
          }}
          style={{ ...boton, background: "linear-gradient(135deg, #0a2540 0%, #4b3075 100%)" }}
        >
          <Banknote size={15} />
          Registrar consignación de {provider}
        </button>
        <span style={{ fontSize: "0.78rem", color: "#64748B" }}>
          {cobros.length === 0
            ? "No hay cobros aprobados pendientes de consignar."
            : `${cobros.length} cobro(s) aprobado(s) por ${formatoMonto(
                cobros.reduce((a, c) => a + c.esperadoMinor, 0),
                "COP"
              )} esperan consignación.`}
        </span>
        {hecho && (
          <span
            role="status"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              fontSize: "0.8rem",
              color: "#15803D",
              fontWeight: 600
            }}
          >
            <CircleCheck size={14} /> {hecho}
          </span>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={enviar}
      style={{
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        padding: "1rem 1.1rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        background: "#fff"
      }}
    >
      <h3 style={{ margin: 0, fontSize: "0.9rem", color: "#0A2540" }}>
        Consignación de {provider} en la cuenta de recaudo
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "0.9rem"
        }}
      >
        <Campo etiqueta="Referencia bancaria" requerido ayuda="Tal como sale en el extracto">
          <input name="referenciaBancaria" required maxLength={120} autoFocus style={entrada} />
        </Campo>
        <Campo etiqueta="Fecha del extracto" requerido>
          <input
            name="fecha"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            style={entrada}
          />
        </Campo>
        <Campo etiqueta="Monto consignado" requerido ayuda="En pesos, sin decimales">
          <input
            name="montoMinor"
            value={montoTexto}
            onChange={(e) => {
              setMontoTexto(e.target.value);
              setConfirmando(false);
            }}
            inputMode="numeric"
            required
            style={entrada}
          />
        </Campo>
        <Campo etiqueta="Nota" ayuda="Opcional">
          <input name="nota" maxLength={500} style={entrada} />
        </Campo>
      </div>

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "0.6rem",
            flexWrap: "wrap",
            marginBottom: "0.4rem"
          }}
        >
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#4b3075" }}>
            COBROS QUE CUBRE ({seleccion.size} de {cobros.length})
          </span>
          <span style={{ display: "flex", gap: "0.6rem", fontSize: "0.75rem" }}>
            <button
              type="button"
              onClick={() => todos(true)}
              style={{
                background: "none",
                border: "none",
                color: "#4b3075",
                cursor: "pointer",
                padding: 0
              }}
            >
              marcar todos
            </button>
            <button
              type="button"
              onClick={() => todos(false)}
              style={{
                background: "none",
                border: "none",
                color: "#64748B",
                cursor: "pointer",
                padding: 0
              }}
            >
              ninguno
            </button>
          </span>
        </div>

        {cobros.length === 0 ? (
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#94A3B8" }}>
            No hay cobros aprobados de {provider} pendientes de consignar.
          </p>
        ) : (
          <div style={{ overflowX: "auto", maxHeight: 320, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
              <tbody>
                {cobros.map((c) => (
                  <tr
                    key={c.paymentId}
                    style={{ background: seleccion.has(c.paymentId) ? "#F5F3FF" : "transparent" }}
                  >
                    <td style={{ ...celda, width: 28 }}>
                      <input
                        type="checkbox"
                        checked={seleccion.has(c.paymentId)}
                        onChange={() => alternar(c.paymentId)}
                        aria-label={`Incluir ${c.referencia}`}
                        style={{ accentColor: "#4b3075" }}
                      />
                    </td>
                    <td style={celda}>
                      <div style={{ fontWeight: 600, color: "#0A2540" }}>{c.tenantNombre}</div>
                      <div style={{ fontSize: "0.72rem", color: "#64748B" }}>
                        {c.referencia}
                        {c.providerPaymentId ? ` · ${c.providerPaymentId}` : ""}
                      </div>
                    </td>
                    <td
                      style={{
                        ...celda,
                        fontSize: "0.74rem",
                        color: "#94A3B8",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {new Date(c.creadoEn).toLocaleDateString("es-CO")}
                    </td>
                    <td style={{ ...celda, textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ color: "#64748B", fontSize: "0.74rem" }}>
                        cobro {formatoMonto(c.montoMinor, "COP")}
                      </div>
                      <div style={{ fontWeight: 600, color: "#0A2540" }}>
                        debe {formatoMonto(c.esperadoMinor, "COP")}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div
        role="status"
        style={{
          background: cuadra ? "#F0FDF4" : "#F8FAFC",
          border: `1px solid ${cuadra ? "#BBF7D0" : "#E2E8F0"}`,
          borderRadius: 10,
          padding: "0.75rem 0.95rem",
          display: "flex",
          gap: "0.55rem",
          alignItems: "flex-start"
        }}
      >
        {cuadra ? (
          <CircleCheck size={16} color="#15803D" style={{ flexShrink: 0, marginTop: 1 }} />
        ) : (
          <CircleAlert size={16} color="#64748B" style={{ flexShrink: 0, marginTop: 1 }} />
        )}
        <div style={{ fontSize: "0.82rem", color: "#0A2540", lineHeight: 1.5 }}>
          <div>
            Por estos {seleccion.size} cobro(s) de {comercios} comercio(s), {provider} debía{" "}
            <strong>{formatoMonto(esperado, "COP")}</strong>.
          </div>
          {seleccion.size > 0 && monto > 0 && !cuadra && (
            <div style={{ color: "#B45309", fontWeight: 600 }}>
              El monto consignado difiere en {formatoMonto(monto - esperado, "COP")}. Revisa qué
              cobros cubre o el monto del extracto: la consignación tiene que cuadrar exacta.
            </div>
          )}
          {cuadra && (
            <div style={{ color: "#15803D", fontWeight: 600 }}>Cuadra con el extracto.</div>
          )}
        </div>
      </div>

      {confirmando && (
        <p
          role="alert"
          style={{
            margin: 0,
            background: "#FFFBEB",
            border: "1px solid #FDE68A",
            borderRadius: 9,
            padding: "0.6rem 0.85rem",
            fontSize: "0.82rem",
            color: "#78350F"
          }}
        >
          <strong>Esto no se deshace.</strong> Se registra la consignación por{" "}
          {formatoMonto(monto, "COP")} y {seleccion.size} cobro(s) de {comercios} comercio(s) pasan
          a conciliados. Confirma para continuar.
        </p>
      )}

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
          disabled={pendiente || !cuadra}
          style={{
            ...boton,
            background:
              pendiente || !cuadra
                ? "rgba(10,37,64,0.4)"
                : confirmando
                  ? "#B45309"
                  : "linear-gradient(135deg, #0a2540 0%, #4b3075 100%)",
            cursor: pendiente || !cuadra ? "not-allowed" : "pointer"
          }}
        >
          <Banknote size={15} />
          {pendiente ? "Registrando…" : confirmando ? "Sí, registrar" : "Registrar consignación"}
        </button>
        <button
          type="button"
          onClick={() => {
            setAbierto(false);
            setConfirmando(false);
          }}
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
  );
}
