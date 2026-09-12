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

const TIPO_CORTO: Record<ReglaRiesgo["tipo"], string> = {
  limite_transaccion: "umbral",
  limite_diario: "umbral diario",
  limite_mensual: "umbral mensual",
  monto_atipico: "atípico",
  geo_mismatch: "geo",
  intentos_tarjeta: "velocity",
  score_proveedor: "score"
};

/** La condición como la lee el motor, en una línea: es lo que se compara con el cobro. */
function condicion(r: ReglaRiesgo): string {
  const p = r.parametros;
  if ("factor" in p)
    return `monto > ${p.factor}× ticket_promedio · mínimo ${p.minimoCobros} cobros`;
  if ("limiteMinor" in p) {
    const limite = formatoMonto(p.limiteMinor, "COP");
    if (r.tipo === "limite_diario") return `acumulado_hoy + monto > ${limite}`;
    if (r.tipo === "limite_mensual") return `acumulado_mes + monto > ${limite}`;
    return `monto > ${limite}`;
  }
  if ("montoMinimoMinor" in p)
    return `país_tarjeta ≠ país_ip · monto ≥ ${formatoMonto(p.montoMinimoMinor, "COP")}`;
  if ("maxIntentos" in p) return `intentos_misma_tarjeta > ${p.maxIntentos}`;
  return `score_proveedor > ${p.scoreMaximo}`;
}

/** Las tres de tarjeta corren al aprobar (con la señal del proveedor); las demás, antes de crear el cobro. */
const ES_DE_TARJETA = new Set<ReglaRiesgo["tipo"]>([
  "geo_mismatch",
  "intentos_tarjeta",
  "score_proveedor"
]);

/** Selector Activa / Shadow / Off. Shadow: evalúa y anota, no actúa. */
function Modo({ regla, puedeEditar }: { regla: ReglaRiesgo; puedeEditar: boolean }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const opciones = [
    ["activa", "Activa", "#15803D"],
    ["shadow", "Shadow", "#1D4ED8"],
    ["inactiva", "Off", "#64748B"]
  ] as const;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}
    >
      <div
        role="radiogroup"
        aria-label={`Modo de ${regla.nombre}`}
        style={{
          display: "inline-flex",
          border: "1px solid #E2E8F0",
          borderRadius: 9,
          overflow: "hidden",
          background: "#fff"
        }}
      >
        {opciones.map(([m, texto, color]) => {
          const on = regla.modo === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!puedeEditar || pendiente || on}
              title={
                m === "shadow"
                  ? "Evalúa y anota qué habría hecho, sin actuar"
                  : m === "activa"
                    ? "Actúa sobre el cobro"
                    : "No se evalúa"
              }
              onClick={() =>
                iniciar(async () => {
                  const r = await cambiarModoRegla(regla.id, m);
                  if (r.ok) router.refresh();
                  else setError(r.error);
                })
              }
              style={{
                border: "none",
                padding: "0.4rem 0.8rem",
                fontSize: "0.76rem",
                fontWeight: 600,
                cursor: puedeEditar && !on ? "pointer" : "default",
                background: on ? color : "transparent",
                color: on ? "#fff" : puedeEditar ? "#475569" : "#94A3B8",
                opacity: pendiente ? 0.6 : 1
              }}
            >
              {texto}
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

function etiqueta(bg: string, fg: string): React.CSSProperties {
  return {
    background: bg,
    color: fg,
    borderRadius: 999,
    padding: "0.15rem 0.55rem",
    fontSize: "0.7rem",
    fontWeight: 700,
    whiteSpace: "nowrap"
  };
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
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.7rem", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: "0.98rem", color: "#0A2540" }}>Reglas del motor</h2>
          <span style={{ fontSize: "0.76rem", color: "#94A3B8" }}>
            {reglas.length} reglas · {reglas.filter((r) => r.modo === "activa").length} activas ·{" "}
            {reglas.filter((r) => r.modo === "shadow").length} shadow ·{" "}
            {reglas.filter((r) => r.modo === "inactiva").length} off
          </span>
        </div>
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

      {reglas.length === 0 ? (
        <p style={{ margin: 0, fontSize: "0.84rem", color: "#64748B" }}>
          No hay reglas. La primera nace en shadow.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
          {reglas.map((r) => (
            <article
              key={r.id}
              style={{
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 14,
                padding: "1rem 1.1rem",
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: "0.6rem 1rem",
                alignItems: "start",
                opacity: r.modo === "inactiva" ? 0.7 : 1
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                    marginBottom: "0.5rem"
                  }}
                >
                  <strong style={{ fontSize: "0.95rem", color: "#0A2540" }}>{r.nombre}</strong>
                  <span style={etiqueta("#FEF3C7", "#92400E")}>{TIPO_CORTO[r.tipo]}</span>
                  {ES_DE_TARJETA.has(r.tipo) && (
                    <span style={etiqueta("#EFF6FF", "#1D4ED8")}>
                      al aprobar · señal del proveedor
                    </span>
                  )}
                  {r.tenantNombre && (
                    <span style={etiqueta("#F3E8FF", "#4b3075")}>solo {r.tenantNombre}</span>
                  )}
                </div>
                <code
                  style={{
                    display: "inline-block",
                    maxWidth: "100%",
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: 8,
                    padding: "0.4rem 0.7rem",
                    fontSize: "0.8rem",
                    color: "#0A2540",
                    overflowWrap: "anywhere"
                  }}
                >
                  {condicion(r)} → {r.accion}
                </code>
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    flexWrap: "wrap",
                    marginTop: "0.6rem",
                    fontSize: "0.76rem",
                    color: "#64748B"
                  }}
                >
                  <span>
                    acción:{" "}
                    <span
                      style={etiqueta(
                        r.accion === "rechazar" ? "#FEE2E2" : "#FEF3C7",
                        r.accion === "rechazar" ? "#B91C1C" : "#92400E"
                      )}
                    >
                      {r.accion}
                    </span>
                  </span>
                  <span>
                    disparos: <strong style={{ color: "#0A2540" }}>{r.disparosHoy}</strong> hoy ·{" "}
                    {r.disparos30d} en 30 días
                  </span>
                  {r.retenciones30d > 0 && (
                    <span title="Retenciones que causó esta regla y que alguien liberó al revisarlas: la medida real de falsos positivos">
                      liberadas al revisar:{" "}
                      <strong style={{ color: r.liberadas30d > 0 ? "#B45309" : "#0A2540" }}>
                        {r.liberadas30d}/{r.retenciones30d}
                      </strong>
                    </span>
                  )}
                  <span>prioridad {r.prioridad}</span>
                </div>
              </div>
              <Modo regla={r} puedeEditar={puedeEditar} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
