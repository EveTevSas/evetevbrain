import { Kpi } from "@/components/kpi";
import { Tarjeta, TituloSeccion } from "@/components/seccion";
import { ErrorApi, listarContracargos, type Contracargo } from "@/lib/api/evepay";
import { formatoMonto } from "@/lib/formato";
import Link from "next/link";

export const dynamic = "force-dynamic";

const celda: React.CSSProperties = {
  padding: "0.65rem 0.7rem",
  fontSize: "0.8rem",
  borderBottom: "1px solid #F1F5F9",
  verticalAlign: "top"
};
const encabezado: React.CSSProperties = {
  padding: "0.5rem 0.7rem",
  fontSize: "0.68rem",
  fontWeight: 700,
  color: "#64748B",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  textAlign: "left",
  borderBottom: "1px solid #E2E8F0"
};

const TONO: Record<Contracargo["estado"], { bg: string; fg: string; texto: string }> = {
  recibido: { bg: "#FEF3C7", fg: "#92400E", texto: "recibido" },
  en_evidencia: { bg: "#EFF6FF", fg: "#1D4ED8", texto: "en evidencia" },
  ganado: { bg: "#DCFCE7", fg: "#15803D", texto: "ganado" },
  perdido: { bg: "#FEE2E2", fg: "#B91C1C", texto: "perdido" }
};

const CHIPS = [
  ["abiertos", "Abiertos"],
  ["recibido", "Recibidos"],
  ["en_evidencia", "En evidencia"],
  ["ganado", "Ganados"],
  ["perdido", "Perdidos"],
  ["todos", "Todos"]
] as const;

function esAbierto(c: Contracargo): boolean {
  return c.estado === "recibido" || c.estado === "en_evidencia";
}

/**
 * Contracargos de todos los comercios (spec reembolsos-contracargos). La
 * gestión (evidencia, resolver) vive en la ficha del cobro: aquí se ve qué
 * hay abierto y qué vence primero.
 */
export default async function ContracargosPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filtro = typeof params.filtro === "string" ? params.filtro : "abiertos";
  let todos: Contracargo[] = [];
  let error: string | null = null;
  try {
    todos = await listarContracargos();
  } catch (e) {
    error = e instanceof ErrorApi ? e.message : "No se pudieron cargar los contracargos.";
  }

  const abiertos = todos.filter(esAbierto);
  const vencen = abiertos.filter((c) => c.diasParaEvidencia <= 2);
  const cerrados = todos.filter((c) => !esAbierto(c));
  const tasaGanados =
    cerrados.length > 0
      ? `${Math.round((cerrados.filter((c) => c.estado === "ganado").length / cerrados.length) * 100)} % ganados`
      : "ninguno resuelto aún";
  const perdidoMinor = todos
    .filter((c) => c.estado === "perdido")
    .reduce((s, c) => s + c.montoMinor, 0);

  const filas = todos
    .filter((c) =>
      filtro === "todos" ? true : filtro === "abiertos" ? esAbierto(c) : c.estado === filtro
    )
    .sort((a, b) => {
      const ab = esAbierto(a) ? 0 : 1;
      const bb = esAbierto(b) ? 0 : 1;
      if (ab !== bb) return ab - bb;
      return a.diasParaEvidencia - b.diasParaEvidencia;
    });

  return (
    <>
      <TituloSeccion
        titulo="Contracargos"
        descripcion="recibido → en evidencia → ganado | perdido. El plazo para presentar evidencia lo fija la red; si vence, se pierde."
      />
      {error ? (
        <Tarjeta>
          <p style={{ margin: 0, fontSize: "0.87rem", color: "#B91C1C", fontWeight: 600 }}>
            {error}
          </p>
        </Tarjeta>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0.8rem"
            }}
          >
            <Kpi
              etiqueta="Abiertos"
              valor={String(abiertos.length)}
              detalle={
                vencen.length > 0
                  ? `${vencen.length} vence(n) en 2 días o menos`
                  : "ninguno urgente"
              }
              tono={vencen.length > 0 ? "rojo" : abiertos.length > 0 ? "ambar" : "verde"}
            />
            <Kpi etiqueta="Resueltos" valor={String(cerrados.length)} detalle={tasaGanados} />
            <Kpi
              etiqueta="Perdido (histórico)"
              valor={formatoMonto(perdidoMinor, "COP")}
              detalle="lo devuelto al pagador por contracargos perdidos"
              tono={perdidoMinor > 0 ? "rojo" : "neutro"}
            />
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {CHIPS.map(([clave, texto]) => {
              const on = filtro === clave;
              const n =
                clave === "todos"
                  ? todos.length
                  : clave === "abiertos"
                    ? abiertos.length
                    : todos.filter((c) => c.estado === clave).length;
              return (
                <Link
                  key={clave}
                  href={`/contracargos?filtro=${clave}`}
                  style={{
                    border: `1px solid ${on ? "#0A2540" : "#E2E8F0"}`,
                    background: on ? "#0A2540" : "#fff",
                    color: on ? "#fff" : "#475569",
                    borderRadius: 999,
                    padding: "0.4rem 0.9rem",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    textDecoration: "none"
                  }}
                >
                  {texto} <span style={{ opacity: 0.7 }}>{n}</span>
                </Link>
              );
            })}
          </div>

          <Tarjeta>
            {filas.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.84rem", color: "#64748B" }}>
                Nada en este filtro.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
                  <thead>
                    <tr>
                      <th style={encabezado}>Comercio · cobro</th>
                      <th style={{ ...encabezado, textAlign: "right" }}>Disputado</th>
                      <th style={encabezado}>Motivo de la red</th>
                      <th style={encabezado}>Estado</th>
                      <th style={encabezado}>Evidencia</th>
                      <th style={encabezado}>Recibido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((c) => {
                      const t = TONO[c.estado];
                      const urgente = esAbierto(c) && c.diasParaEvidencia <= 2;
                      return (
                        <tr key={c.id}>
                          <td style={celda}>
                            <Link
                              href={`/pagos/${c.paymentId}`}
                              style={{ color: "#0A2540", fontWeight: 700, textDecoration: "none" }}
                            >
                              {c.tenantNombre}
                            </Link>
                            <div style={{ fontSize: "0.72rem", color: "#64748B" }}>
                              {c.referencia} · cobro {formatoMonto(c.montoCobroMinor, "COP")}
                              {c.referenciaRed ? ` · red ${c.referenciaRed}` : ""}
                            </div>
                          </td>
                          <td
                            style={{
                              ...celda,
                              textAlign: "right",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              fontVariantNumeric: "tabular-nums"
                            }}
                          >
                            {formatoMonto(c.montoMinor, "COP")}
                          </td>
                          <td style={{ ...celda, color: "#475569" }}>{c.motivoRed}</td>
                          <td style={celda}>
                            <span
                              style={{
                                background: t.bg,
                                color: t.fg,
                                borderRadius: 999,
                                padding: "0.2rem 0.65rem",
                                fontSize: "0.74rem",
                                fontWeight: 600,
                                whiteSpace: "nowrap"
                              }}
                            >
                              {t.texto}
                            </span>
                          </td>
                          <td style={{ ...celda, whiteSpace: "nowrap" }}>
                            {esAbierto(c) ? (
                              <strong style={{ color: urgente ? "#B91C1C" : "#B45309" }}>
                                {c.diasParaEvidencia < 0
                                  ? `venció hace ${-c.diasParaEvidencia} día(s)`
                                  : `vence en ${c.diasParaEvidencia} día(s)`}
                              </strong>
                            ) : (
                              <span style={{ color: "#64748B" }}>
                                {c.resueltoEn
                                  ? `resuelto ${new Date(c.resueltoEn).toLocaleDateString("es-CO")}`
                                  : "—"}
                              </span>
                            )}
                            <div style={{ fontSize: "0.7rem", color: "#94A3B8" }}>
                              límite {new Date(c.fechaLimiteEvidencia).toLocaleDateString("es-CO")}
                            </div>
                          </td>
                          <td
                            style={{
                              ...celda,
                              color: "#94A3B8",
                              fontSize: "0.74rem",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {new Date(c.recibidoEn).toLocaleDateString("es-CO")}
                            <div>{c.recibidoPor}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Tarjeta>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#94A3B8", lineHeight: 1.6 }}>
            Registrar un contracargo, adjuntar evidencia o resolverlo se hace desde la ficha del
            cobro; un contracargo perdido deja el cobro en <code>reembolsado</code> y el monto se
            descuenta al comercio en su siguiente lote.
          </p>
        </div>
      )}
    </>
  );
}
