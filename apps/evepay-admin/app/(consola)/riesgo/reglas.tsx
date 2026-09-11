"use client";

import { Campo, entrada } from "@/components/campos";
import type { Comercio, ReglaRiesgo } from "@/lib/api/evepay";
import { formatoMonto } from "@/lib/formato";
import { Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { cambiarModoRegla, guardarRegla } from "./acciones";

const NOMBRES: Record<ReglaRiesgo["tipo"], string> = {
  limite_transaccion: "Límite por transacción",
  limite_diario: "Límite diario",
  limite_mensual: "Límite mensual",
  monto_atipico: "Monto atípico",
  geo_mismatch: "Tarjeta: país de la tarjeta ≠ país de la IP",
  intentos_tarjeta: "Tarjeta: intentos con la misma tarjeta",
  score_proveedor: "Tarjeta: score del proveedor"
};

function describir(r: ReglaRiesgo): string {
  const p = r.parametros;
  if ("factor" in p)
    return `más de ${p.factor}× el ticket promedio (mínimo ${p.minimoCobros} cobros)`;
  if ("limiteMinor" in p) return `más de ${formatoMonto(p.limiteMinor, "COP")}`;
  if ("montoMinimoMinor" in p)
    return `países distintos en cobros desde ${formatoMonto(p.montoMinimoMinor, "COP")} (al aprobar, si el proveedor manda la señal)`;
  if ("maxIntentos" in p)
    return `más de ${p.maxIntentos} intentos (al aprobar, si el proveedor lo cuenta)`;
  return `score del proveedor mayor que ${p.scoreMaximo} (al aprobar, si lo manda)`;
}

/** Selector activa / shadow / inactiva. Shadow: evalúa y anota, no actúa. */
function Modo({ regla, puedeEditar }: { regla: ReglaRiesgo; puedeEditar: boolean }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const colores = { activa: "#15803D", shadow: "#1D4ED8", inactiva: "#94A3B8" } as const;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}
    >
      <div
        style={{
          display: "inline-flex",
          border: "1px solid #E2E8F0",
          borderRadius: 8,
          overflow: "hidden"
        }}
      >
        {(["activa", "shadow", "inactiva"] as const).map((m) => {
          const on = regla.modo === m;
          return (
            <button
              key={m}
              type="button"
              disabled={!puedeEditar || pendiente || on}
              onClick={() =>
                iniciar(async () => {
                  const r = await cambiarModoRegla(regla.id, m);
                  if (r.ok) router.refresh();
                  else setError(r.error);
                })
              }
              style={{
                border: "none",
                padding: "0.3rem 0.6rem",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: puedeEditar && !on ? "pointer" : "default",
                background: on ? colores[m] : "#fff",
                color: on ? "#fff" : "#64748B"
              }}
            >
              {m}
            </button>
          );
        })}
      </div>
      {error && (
        <span role="alert" style={{ fontSize: "0.7rem", color: "#B91C1C" }}>
          {error}
        </span>
      )}
    </div>
  );
}

export function Reglas({
  reglas,
  comercios,
  puedeEditar
}: {
  reglas: ReglaRiesgo[];
  comercios: Comercio[];
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [nueva, setNueva] = useState(false);
  const [tipo, setTipo] = useState<ReglaRiesgo["tipo"]>("limite_transaccion");
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setError(null);
    iniciar(async () => {
      const r = await guardarRegla(datos);
      if (r.ok) {
        setNueva(false);
        router.refresh();
      } else setError(r.error);
    });
  }

  const celda: React.CSSProperties = {
    padding: "0.6rem 0.7rem",
    fontSize: "0.82rem",
    borderBottom: "1px solid #F1F5F9",
    verticalAlign: "top"
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "0.9rem",
          flexWrap: "wrap"
        }}
      >
        <h2 style={{ margin: 0, fontSize: "0.98rem", color: "#0A2540" }}>Reglas del motor</h2>
        {puedeEditar && !nueva && (
          <button
            type="button"
            onClick={() => setNueva(true)}
            style={{
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
            }}
          >
            <Plus size={13} /> Nueva regla
          </button>
        )}
      </div>

      {nueva && (
        <form
          onSubmit={enviar}
          style={{
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: "1rem 1.1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.9rem",
            marginBottom: "1rem"
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.9rem"
            }}
          >
            <Campo etiqueta="Nombre" requerido>
              <input
                name="nombre"
                required
                minLength={3}
                maxLength={120}
                autoFocus
                style={entrada}
              />
            </Campo>
            <Campo etiqueta="Tipo" requerido>
              <select
                name="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as ReglaRiesgo["tipo"])}
                style={entrada}
              >
                {Object.entries(NOMBRES).map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo
              etiqueta="Alcance"
              ayuda="Global o de un comercio (reemplaza la global de su tipo)"
            >
              <select name="tenantId" defaultValue="" style={entrada}>
                <option value="">Global (todos los comercios)</option>
                {comercios.map((c) => (
                  <option key={c.tenantId} value={c.tenantId}>
                    {c.displayName}
                  </option>
                ))}
              </select>
            </Campo>
            {tipo === "monto_atipico" ? (
              <>
                <Campo etiqueta="Factor sobre el ticket promedio" requerido ayuda="2 a 100">
                  <input
                    name="factor"
                    type="number"
                    min={2}
                    max={100}
                    defaultValue={5}
                    required
                    style={entrada}
                  />
                </Campo>
                <Campo etiqueta="Mínimo de cobros históricos" requerido>
                  <input
                    name="minimoCobros"
                    type="number"
                    min={1}
                    max={10000}
                    defaultValue={10}
                    required
                    style={entrada}
                  />
                </Campo>
              </>
            ) : tipo === "geo_mismatch" ? (
              <Campo etiqueta="Desde qué monto (COP)" requerido ayuda="0 = cualquier monto">
                <input
                  name="montoMinimo"
                  inputMode="numeric"
                  required
                  defaultValue="200000"
                  style={entrada}
                />
              </Campo>
            ) : tipo === "intentos_tarjeta" ? (
              <Campo etiqueta="Máximo de intentos" requerido>
                <input
                  name="maxIntentos"
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={3}
                  required
                  style={entrada}
                />
              </Campo>
            ) : tipo === "score_proveedor" ? (
              <Campo etiqueta="Score máximo (0–100)" requerido>
                <input
                  name="scoreMaximo"
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={80}
                  required
                  style={entrada}
                />
              </Campo>
            ) : (
              <Campo etiqueta="Límite (COP)" requerido ayuda="En pesos, sin decimales">
                <input name="limite" inputMode="numeric" required style={entrada} />
              </Campo>
            )}
            <Campo
              etiqueta="Acción"
              requerido
              ayuda="Rechazar: el cobro no se crea. Retener: se crea y no se dispersa hasta revisarlo"
            >
              <select
                name="accion"
                defaultValue={tipo.startsWith("limite") ? "rechazar" : "retener"}
                style={entrada}
              >
                <option value="rechazar">Rechazar</option>
                <option value="retener">Retener</option>
              </select>
            </Campo>
            <Campo etiqueta="Modo" requerido ayuda="Empieza en shadow y mide antes de activar">
              <select name="modo" defaultValue="shadow" style={entrada}>
                <option value="shadow">Shadow</option>
                <option value="activa">Activa</option>
                <option value="inactiva">Inactiva</option>
              </select>
            </Campo>
            <Campo etiqueta="Prioridad" ayuda="Menor = se evalúa antes">
              <input
                name="prioridad"
                type="number"
                min={0}
                max={1000}
                defaultValue={100}
                style={entrada}
              />
            </Campo>
          </div>
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
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                border: "none",
                borderRadius: 9,
                padding: "0.45rem 0.85rem",
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "#fff",
                background: pendiente
                  ? "rgba(10,37,64,0.4)"
                  : "linear-gradient(135deg, #0a2540 0%, #4b3075 100%)",
                cursor: "pointer"
              }}
            >
              <Save size={13} /> {pendiente ? "Guardando…" : "Guardar regla"}
            </button>
            <button
              type="button"
              onClick={() => setNueva(false)}
              style={{
                border: "1px solid #E2E8F0",
                background: "transparent",
                borderRadius: 9,
                padding: "0.45rem 0.85rem",
                fontSize: "0.78rem",
                color: "#64748B",
                cursor: "pointer"
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <tbody>
            {reglas.map((r) => (
              <tr key={r.id}>
                <td style={celda}>
                  <div style={{ fontWeight: 700, color: "#0A2540" }}>{r.nombre}</div>
                  <div style={{ fontSize: "0.74rem", color: "#64748B" }}>
                    {NOMBRES[r.tipo]} · {describir(r)} → <strong>{r.accion}</strong>
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#94A3B8" }}>
                    {r.tenantNombre ? `Solo ${r.tenantNombre}` : "Global"} · prioridad {r.prioridad}{" "}
                    · disparó {r.disparos30d} vez/veces en 30 días
                  </div>
                </td>
                <td style={{ ...celda, textAlign: "right" }}>
                  <Modo regla={r} puedeEditar={puedeEditar} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
