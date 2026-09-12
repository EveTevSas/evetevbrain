import { Tarjeta, TituloSeccion } from "@/components/seccion";
import { EstadoCobro } from "@/components/estado-cobro";
import {
  ErrorApi,
  listarComercios,
  listarEvaluacionesRiesgo,
  listarPagos,
  listarRetenciones,
  type Comercio,
  type EvaluacionRiesgo,
  type PaginaPagos,
  type Retencion
} from "@/lib/api/evepay";
import { formatoMonto } from "@/lib/formato";
import Link from "next/link";
import { FiltrosPagos } from "./filtros";

export const dynamic = "force-dynamic";

const celda: React.CSSProperties = {
  padding: "0.95rem 1rem",
  fontSize: "0.86rem",
  borderBottom: "1px solid #F1F5F9",
  verticalAlign: "middle"
};
const encabezado: React.CSSProperties = {
  padding: "0.7rem 1rem",
  fontSize: "0.72rem",
  fontWeight: 700,
  color: "#64748B",
  letterSpacing: "0.03em",
  textAlign: "left",
  borderBottom: "1px solid #E2E8F0",
  background: "#FAFAF7",
  whiteSpace: "nowrap"
};
const mono: React.CSSProperties = {
  fontFamily: "ui-monospace, Menlo, monospace",
  fontVariantNumeric: "tabular-nums"
};

/**
 * Riesgo de la transacción: lo que decidió el motor (antes del proveedor o
 * al aprobar) y si hay una retención activa. No es un score: es lo que pasó.
 */
function Riesgo({
  evaluacion,
  retenida
}: {
  evaluacion: EvaluacionRiesgo | undefined;
  retenida: boolean;
}) {
  if (!evaluacion && !retenida) return <span style={{ color: "#CBD5E1" }}>—</span>;
  const disparos = evaluacion?.reglasDisparadas.length ?? 0;
  const nivel = retenida ? 3 : evaluacion?.decision === "rechazar" ? 3 : disparos > 0 ? 2 : 1;
  const color = ["#1C7A52", "#1C7A52", "#A9700F", "#B23545"][nivel];
  const ancho = [10, 12, 55, 100][nivel];
  const texto = retenida
    ? "retenida"
    : evaluacion?.decision === "permitir"
      ? disparos
        ? `${disparos} shadow`
        : "ok"
      : evaluacion?.decision;
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
      title={
        evaluacion?.reglasDisparadas.map((d) => `${d.nombre}: ${d.detalle}`).join("\n") ||
        "Sin reglas disparadas"
      }
    >
      <span
        style={{
          width: 46,
          height: 6,
          borderRadius: 3,
          background: "#ECEAE2",
          overflow: "hidden",
          display: "inline-block"
        }}
      >
        <span
          style={{
            display: "block",
            height: "100%",
            width: `${ancho}%`,
            background: color,
            borderRadius: 3
          }}
        />
      </span>
      <span style={{ fontSize: "0.76rem", color: nivel >= 2 ? color : "#64748B" }}>{texto}</span>
    </span>
  );
}

export default async function PagosPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filtro = (clave: string) => {
    const v = params[clave];
    return typeof v === "string" ? v : undefined;
  };
  const estadoFiltro = filtro("estado");
  const soloRetenidas = estadoFiltro === "retenidas";

  let pagina: PaginaPagos | null = null;
  let comercios: Comercio[] = [];
  let evaluaciones: EvaluacionRiesgo[] = [];
  let retenciones: Retencion[] = [];
  let error: string | null = null;

  try {
    [pagina, comercios, evaluaciones, retenciones] = await Promise.all([
      listarPagos({
        tenantId: filtro("tenantId"),
        estado: soloRetenidas ? undefined : estadoFiltro,
        referencia: filtro("referencia"),
        cursorAt: filtro("cursorAt"),
        cursorId: filtro("cursorId"),
        limite: soloRetenidas ? "200" : undefined
      }),
      listarComercios(),
      listarEvaluacionesRiesgo(500),
      listarRetenciones()
    ]);
  } catch (e) {
    error = e instanceof ErrorApi ? e.message : "No se pudo cargar el listado de transacciones.";
  }

  const ultimaEvaluacion = new Map<string, EvaluacionRiesgo>();
  for (const e of evaluaciones)
    if (e.paymentId && !ultimaEvaluacion.has(e.paymentId)) ultimaEvaluacion.set(e.paymentId, e);
  const retenidas = new Set(
    retenciones.filter((r) => r.estado === "activa" && r.paymentId).map((r) => r.paymentId!)
  );
  const filas = (pagina?.pagos ?? []).filter((p) => !soloRetenidas || retenidas.has(p.id));

  const siguienteHref = (() => {
    if (!pagina?.siguiente || soloRetenidas) return null;
    const q = new URLSearchParams();
    for (const k of ["tenantId", "estado", "referencia"]) {
      const v = filtro(k);
      if (v) q.set(k, v);
    }
    q.set("cursorAt", pagina.siguiente.at);
    q.set("cursorId", pagina.siguiente.id);
    return `/pagos?${q}`;
  })();

  return (
    <>
      <TituloSeccion
        titulo="Transacciones"
        descripcion="Máquina de estados: creado → pendiente → aprobado / fallido → conciliado → reembolsado. Cada cobro con su comercio, su riesgo y su historia."
      />

      {error || !pagina ? (
        <Tarjeta>
          <p style={{ margin: 0, fontSize: "0.87rem", color: "#B91C1C", fontWeight: 600 }}>
            {error}
          </p>
        </Tarjeta>
      ) : (
        <>
          <FiltrosPagos comercios={comercios} />

          <div
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 1px 2px rgba(10,37,64,.05)"
            }}
          >
            {filas.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  padding: "2.5rem",
                  fontSize: "0.87rem",
                  color: "#64748B",
                  textAlign: "center"
                }}
              >
                Ninguna transacción coincide con esos filtros.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th style={encabezado}>ID cobro</th>
                      <th style={encabezado}>Comercio</th>
                      <th style={{ ...encabezado, textAlign: "right" }}>Monto</th>
                      <th style={encabezado}>Proveedor</th>
                      <th style={encabezado}>Estado</th>
                      <th style={encabezado}>Riesgo</th>
                      <th style={encabezado}>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((p) => (
                      <tr key={p.id}>
                        <td style={celda}>
                          <Link
                            href={`/pagos/${p.id}`}
                            style={{
                              ...mono,
                              color: "#0A2540",
                              fontWeight: 600,
                              textDecoration: "none",
                              fontSize: "0.82rem"
                            }}
                          >
                            {p.id.slice(0, 8)}
                          </Link>
                          <div style={{ fontSize: "0.74rem", color: "#94A3B8" }}>
                            {p.referencia}
                          </div>
                        </td>
                        <td style={celda}>
                          <Link
                            href={`/comercios/${p.tenantId}`}
                            style={{ color: "#0A2540", textDecoration: "none" }}
                          >
                            {p.tenantNombre}
                          </Link>
                        </td>
                        <td style={{ ...celda, ...mono, textAlign: "right", fontWeight: 600 }}>
                          {formatoMonto(p.montoMinor, p.moneda)}
                        </td>
                        <td style={{ ...celda, color: "#475569" }}>{p.provider}</td>
                        <td style={celda}>
                          <EstadoCobro
                            estado={
                              retenidas.has(p.id) && p.estado !== "reembolsado"
                                ? "retenido"
                                : p.estado
                            }
                          />
                        </td>
                        <td style={celda}>
                          <Riesgo
                            evaluacion={ultimaEvaluacion.get(p.id)}
                            retenida={retenidas.has(p.id)}
                          />
                        </td>
                        <td
                          style={{
                            ...celda,
                            ...mono,
                            fontSize: "0.78rem",
                            color: "#94A3B8",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {new Date(p.creadoEn).toLocaleDateString("es-CO", {
                            day: "2-digit",
                            month: "short"
                          })}
                          <div>
                            {new Date(p.creadoEn).toLocaleTimeString("es-CO", {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {siguienteHref && (
            <Link
              href={siguienteHref}
              style={{
                display: "inline-block",
                marginTop: "1rem",
                border: "1px solid #E2E8F0",
                background: "#fff",
                borderRadius: 9,
                padding: "0.5rem 1rem",
                fontSize: "0.83rem",
                fontWeight: 600,
                color: "#4b3075",
                textDecoration: "none"
              }}
            >
              Página siguiente →
            </Link>
          )}

          <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#94A3B8", lineHeight: 1.6 }}>
            «Retenido» no es un estado del cobro sino del dinero: el cobro sigue su curso, pero lo
            que se le debe al comercio no se dispersa hasta revisarlo. El método de pago lo elige el
            pagador en el checkout del proveedor y hoy ComboPay no lo reporta; el proveedor mostrado
            es el que procesó ese cobro, aunque hoy esté activo otro.
          </p>
        </>
      )}
    </>
  );
}
