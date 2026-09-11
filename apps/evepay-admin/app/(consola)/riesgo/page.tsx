import { Tarjeta, TituloSeccion } from "@/components/seccion";
import {
  colaRiesgo,
  ErrorApi,
  listaRestrictiva,
  listarComercios,
  listarEvaluacionesRiesgo,
  listarReglasRiesgo,
  type CasoRiesgo,
  type Comercio,
  type EntradaListaRestrictiva,
  type EvaluacionRiesgo,
  type ReglaRiesgo
} from "@/lib/api/evepay";
import { puede } from "@/lib/auth/permissions";
import { sesionActual } from "@/lib/auth/rol";
import { formatoMonto } from "@/lib/formato";
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
  let error: string | null = null;
  const { rol } = await sesionActual();

  try {
    [reglas, evaluaciones, cola, lista, comercios] = await Promise.all([
      listarReglasRiesgo(),
      listarEvaluacionesRiesgo(50),
      colaRiesgo(),
      listaRestrictiva(),
      listarComercios()
    ]);
  } catch (e) {
    error = e instanceof ErrorApi ? e.message : "No se pudo cargar el riesgo.";
  }

  const activas = reglas.filter((r) => r.modo === "activa").length;
  const shadow = reglas.filter((r) => r.modo === "shadow").length;

  return (
    <>
      <TituloSeccion
        titulo="Riesgo del comercio"
        descripcion="Límites y patrones por comercio, evaluados antes de crear cada cobro. Las reglas nacen en shadow: se mide qué habrían hecho antes de activarlas."
      />
      {error ? (
        <Tarjeta>
          <p style={{ margin: 0, fontSize: "0.87rem", color: "#B91C1C", fontWeight: 600 }}>
            {error}
          </p>
        </Tarjeta>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {cola.length > 0 && (
            <div
              role="alert"
              style={{
                background: "#FFFBEB",
                border: "1px solid #FDE68A",
                borderRadius: 12,
                padding: "0.85rem 1.05rem",
                fontSize: "0.83rem",
                color: "#78350F"
              }}
            >
              <strong>{cola.length} cobro(s) retenido(s) por riesgo</strong> esperan revisión: su
              dinero no se dispersa hasta que alguien los libere.
            </div>
          )}

          <Tarjeta>
            <h2 style={{ margin: "0 0 0.9rem", fontSize: "0.98rem", color: "#0A2540" }}>
              Cola de revisión ({cola.length})
            </h2>
            {cola.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.84rem", color: "#64748B" }}>Nada por revisar.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                  <thead>
                    <tr>
                      <th style={encabezado}>Comercio · cobro</th>
                      <th style={{ ...encabezado, textAlign: "right" }}>Monto</th>
                      <th style={encabezado}>Por qué</th>
                      <th style={{ ...encabezado, textAlign: "right" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cola.map((c) => (
                      <tr key={c.retencionId}>
                        <td style={celda}>
                          <strong>{c.tenantNombre}</strong>
                          <div style={{ fontSize: "0.74rem", color: "#64748B" }}>
                            <Link href={`/pagos/${c.paymentId}`} style={{ color: "#4b3075" }}>
                              {c.referencia}
                            </Link>{" "}
                            · {c.estadoCobro}
                          </div>
                        </td>
                        <td
                          style={{
                            ...celda,
                            textAlign: "right",
                            fontWeight: 700,
                            whiteSpace: "nowrap"
                          }}
                        >
                          {formatoMonto(c.montoCobroMinor, "COP")}
                          <div style={{ fontSize: "0.72rem", color: "#64748B", fontWeight: 400 }}>
                            retenido {formatoMonto(c.montoRetenidoMinor, "COP")}
                          </div>
                        </td>
                        <td style={{ ...celda, color: "#64748B", fontSize: "0.78rem" }}>
                          {c.motivo}
                          <div style={{ fontSize: "0.7rem", color: "#94A3B8" }}>
                            {new Date(c.creadaEn).toLocaleString("es-CO")}
                          </div>
                        </td>
                        <td style={{ ...celda, textAlign: "right" }}>
                          {puede(rol, "retenciones.liberar_riesgo") && (
                            <LiberarRetencion id={c.retencionId} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Tarjeta>

          <Tarjeta>
            <p style={{ margin: "0 0 0.9rem", fontSize: "0.78rem", color: "#64748B" }}>
              {reglas.length} reglas · {activas} activas · {shadow} en shadow
            </p>
            <Reglas
              reglas={reglas}
              comercios={comercios.filter((c) => c.estado === "activo")}
              puedeEditar={puede(rol, "riesgo.reglas")}
            />
          </Tarjeta>

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
