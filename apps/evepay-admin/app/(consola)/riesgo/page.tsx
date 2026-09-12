import { Kpi } from "@/components/kpi";
import { Tarjeta, TituloSeccion } from "@/components/seccion";
import {
  colaRiesgo,
  ErrorApi,
  listaRestrictiva,
  listarContracargos,
  listarComercios,
  listarEvaluacionesRiesgo,
  listarReglasRiesgo,
  resumenRiesgo,
  type CasoRiesgo,
  type Comercio,
  type Contracargo,
  type EntradaListaRestrictiva,
  type EvaluacionRiesgo,
  type ReglaRiesgo,
  type ResumenRiesgo
} from "@/lib/api/evepay";
import { puede } from "@/lib/auth/permissions";
import { sesionActual } from "@/lib/auth/rol";
import { formatoMonto } from "@/lib/formato";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { LiberarRetencion } from "../dispersion/liberar-retencion";
import { ListaRestrictiva } from "./lista-restrictiva";
import { Reglas } from "./reglas";

export const dynamic = "force-dynamic";

const celda: React.CSSProperties = {
  padding: "0.6rem 0.7rem",
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
const tonoDecision = { permitir: "#15803D", retener: "#B45309", rechazar: "#B91C1C" } as const;

export default async function RiesgoPage() {
  let reglas: ReglaRiesgo[] = [];
  let evaluaciones: EvaluacionRiesgo[] = [];
  let cola: CasoRiesgo[] = [];
  let lista: EntradaListaRestrictiva[] = [];
  let comercios: Comercio[] = [];
  let contracargos: Contracargo[] = [];
  let resumen: ResumenRiesgo | null = null;
  let error: string | null = null;
  const { rol } = await sesionActual();

  try {
    [reglas, evaluaciones, cola, lista, comercios, contracargos, resumen] = await Promise.all([
      listarReglasRiesgo(),
      listarEvaluacionesRiesgo(50),
      colaRiesgo(),
      listaRestrictiva(),
      listarComercios(),
      listarContracargos(),
      resumenRiesgo()
    ]);
  } catch (e) {
    error = e instanceof ErrorApi ? e.message : "No se pudo cargar el riesgo.";
  }

  const abiertos = contracargos.filter(
    (c) => c.estado === "recibido" || c.estado === "en_evidencia"
  );
  const pctBloqueadas =
    resumen && resumen.evaluadasHoy > 0
      ? `${((resumen.rechazadasHoy / resumen.evaluadasHoy) * 100).toFixed(1)} % del total`
      : "nada rechazado hoy";

  return (
    <>
      <TituloSeccion
        titulo="Riesgo & Antifraude"
        descripcion="Motor de reglas propio: las de comercio corren antes de crear el cobro; las de tarjeta, al aprobarlo, con las señales que mande el proveedor."
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
              display: "flex",
              gap: "0.7rem",
              alignItems: "flex-start",
              background: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: 12,
              padding: "0.85rem 1.05rem",
              fontSize: "0.83rem",
              color: "#1E3A8A",
              lineHeight: 1.5
            }}
          >
            <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0 }}>
              Aquí van las <strong>reglas de negocio</strong> que solo EvePay conoce. El score del
              proveedor, cuando llegue, entra como <strong>una señal más</strong> (regla «score»).
              Enciende cada regla en <strong>modo shadow</strong>, mira cuántas veces habría actuado
              y cuántas retenciones se liberan al revisarlas, y luego actívala.
            </p>
          </div>

          {resumen && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "0.8rem"
              }}
            >
              <Kpi
                etiqueta="Transacciones evaluadas (hoy)"
                valor={resumen.evaluadasHoy.toLocaleString("es-CO")}
                detalle={
                  resumen.shadowHoy > 0
                    ? `${resumen.shadowHoy} con reglas en shadow que habrían actuado`
                    : "ninguna regla en shadow habría actuado"
                }
                tono={resumen.shadowHoy > 0 ? "ambar" : "neutro"}
              />
              <Kpi
                etiqueta="Bloqueadas por riesgo (hoy)"
                valor={resumen.rechazadasHoy.toLocaleString("es-CO")}
                detalle={pctBloqueadas}
                tono={resumen.rechazadasHoy > 0 ? "rojo" : "neutro"}
              />
              <Kpi
                etiqueta="En cola de revisión manual"
                valor={resumen.enCola.toLocaleString("es-CO")}
                detalle={`${resumen.retenidasHoy} retenida(s) hoy`}
                tono={resumen.enCola > 0 ? "ambar" : "verde"}
              />
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
              gap: "1rem",
              alignItems: "start"
            }}
          >
            <div>
              <Reglas
                reglas={reglas}
                comercios={comercios.filter((c) => c.estado === "activo")}
                puedeEditar={puede(rol, "riesgo.reglas")}
              />
            </div>

            <Tarjeta>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.6rem",
                  marginBottom: "0.9rem"
                }}
              >
                <h2 style={{ margin: 0, fontSize: "0.98rem", color: "#0A2540" }}>
                  Cola de revisión manual
                </h2>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    background: cola.length > 0 ? "#FEE2E2" : "#DCFCE7",
                    color: cola.length > 0 ? "#B91C1C" : "#15803D",
                    borderRadius: 999,
                    padding: "0.15rem 0.6rem",
                    fontSize: "0.74rem",
                    fontWeight: 700
                  }}
                >
                  ● {cola.length}
                </span>
              </div>
              {cola.length === 0 ? (
                <p style={{ margin: 0, fontSize: "0.84rem", color: "#64748B" }}>
                  Nada por revisar: ningún cobro tiene dinero retenido por riesgo.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {cola.map((c, idx) => {
                    const reglas = c.reglasDisparadas.filter((d) => d.actuo);
                    return (
                      <div
                        key={c.retencionId}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "auto minmax(0, 1fr)",
                          gap: "0.75rem",
                          padding: "0.8rem 0",
                          borderTop: idx === 0 ? "none" : "1px solid #F1F5F9"
                        }}
                      >
                        <div
                          title={`${reglas.length} regla(s) actuaron`}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 10,
                            background: reglas.length > 1 ? "#B91C1C" : "#B45309",
                            color: "#fff",
                            display: "grid",
                            placeItems: "center",
                            fontWeight: 700,
                            fontSize: "0.95rem"
                          }}
                        >
                          {reglas.length}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "0.5rem",
                              alignItems: "baseline",
                              flexWrap: "wrap"
                            }}
                          >
                            <Link
                              href={`/pagos/${c.paymentId}`}
                              style={{
                                color: "#0A2540",
                                fontWeight: 700,
                                fontSize: "0.9rem",
                                textDecoration: "none"
                              }}
                            >
                              {formatoMonto(c.montoCobroMinor, "COP")} · {c.tenantNombre}
                            </Link>
                            <span
                              style={{
                                background: "#F3E8FF",
                                color: "#4b3075",
                                borderRadius: 999,
                                padding: "0.15rem 0.6rem",
                                fontSize: "0.72rem",
                                fontWeight: 700
                              }}
                            >
                              retenido
                            </span>
                          </div>
                          <div
                            style={{ fontSize: "0.78rem", color: "#64748B", marginTop: "0.15rem" }}
                          >
                            {reglas.length > 0 ? reglas.map((d) => d.nombre).join(" + ") : c.motivo}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: "0.5rem",
                              flexWrap: "wrap",
                              marginTop: "0.45rem",
                              fontSize: "0.72rem",
                              color: "#94A3B8"
                            }}
                          >
                            <span>
                              {c.referencia} · {c.estadoCobro} ·{" "}
                              {new Date(c.creadaEn).toLocaleString("es-CO", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                            {puede(rol, "retenciones.liberar_riesgo") && (
                              <LiberarRetencion id={c.retencionId} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {abiertos.length > 0 && (
                <div
                  style={{
                    marginTop: "1.2rem",
                    paddingTop: "1rem",
                    borderTop: "1px solid #E2E8F0"
                  }}
                >
                  <h3 style={{ margin: "0 0 0.6rem", fontSize: "0.86rem", color: "#0A2540" }}>
                    Contracargos abiertos ({abiertos.length})
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                    {abiertos.map((c) => (
                      <div key={c.id} style={{ fontSize: "0.8rem", color: "#0A2540" }}>
                        <Link
                          href={`/pagos/${c.paymentId}`}
                          style={{ color: "#4b3075", fontWeight: 700, textDecoration: "none" }}
                        >
                          {c.tenantNombre} · {c.referencia}
                        </Link>{" "}
                        <span>{formatoMonto(c.montoMinor, "COP")}</span>
                        <div style={{ fontSize: "0.72rem", color: "#64748B" }}>
                          {c.estado.replace("_", " ")} · {c.motivoRed} ·{" "}
                          <strong
                            style={{ color: c.diasParaEvidencia <= 2 ? "#B91C1C" : "#B45309" }}
                          >
                            {c.diasParaEvidencia < 0
                              ? `venció hace ${-c.diasParaEvidencia} día(s)`
                              : `vence en ${c.diasParaEvidencia} día(s)`}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Tarjeta>
          </div>

          <Tarjeta>
            <h2 style={{ margin: "0 0 0.9rem", fontSize: "0.98rem", color: "#0A2540" }}>
              Últimas evaluaciones
            </h2>
            {evaluaciones.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.84rem", color: "#64748B" }}>
                Todavía no se ha evaluado ningún cobro.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                  <thead>
                    <tr>
                      <th style={encabezado}>Cuándo</th>
                      <th style={encabezado}>Comercio · cobro</th>
                      <th style={{ ...encabezado, textAlign: "right" }}>Monto</th>
                      <th style={encabezado}>Decisión</th>
                      <th style={encabezado}>Reglas disparadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluaciones.map((e) => (
                      <tr key={e.id}>
                        <td
                          style={{
                            ...celda,
                            fontSize: "0.74rem",
                            color: "#94A3B8",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {new Date(e.creadaEn).toLocaleString("es-CO")}
                        </td>
                        <td style={celda}>
                          {e.tenantNombre}
                          <div style={{ fontSize: "0.72rem", color: "#64748B" }}>
                            {e.referencia ?? "(no se creó)"}
                          </div>
                        </td>
                        <td style={{ ...celda, textAlign: "right", whiteSpace: "nowrap" }}>
                          {formatoMonto(e.montoMinor, "COP")}
                        </td>
                        <td style={{ ...celda, fontWeight: 700, color: tonoDecision[e.decision] }}>
                          {e.decision}
                        </td>
                        <td style={{ ...celda, fontSize: "0.76rem", color: "#64748B" }}>
                          {e.reglasDisparadas.length === 0
                            ? "—"
                            : e.reglasDisparadas.map((d) => (
                                <div key={d.id}>
                                  {d.nombre}{" "}
                                  <span
                                    style={{
                                      color: d.actuo
                                        ? tonoDecision[
                                            d.accion === "rechazar" ? "rechazar" : "retener"
                                          ]
                                        : "#1D4ED8"
                                    }}
                                  >
                                    {d.actuo
                                      ? d.accion
                                      : `shadow (habría ${d.accion === "rechazar" ? "rechazado" : "retenido"})`}
                                  </span>
                                </div>
                              ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Tarjeta>

          <Tarjeta>
            <ListaRestrictiva entradas={lista} puedeEditar={puede(rol, "riesgo.listas")} />
          </Tarjeta>
        </div>
      )}
    </>
  );
}
