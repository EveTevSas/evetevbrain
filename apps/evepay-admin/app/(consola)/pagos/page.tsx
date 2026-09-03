import { Tarjeta, TituloSeccion } from "@/components/seccion";
import { EstadoCobro } from "@/components/estado-cobro";
import {
  ErrorApi,
  formatoMonto,
  listarComercios,
  listarPagos,
  type Comercio,
  type PaginaPagos
} from "@/lib/api/evepay";
import Link from "next/link";
import { FiltrosPagos } from "./filtros";

export const dynamic = "force-dynamic";

const celda: React.CSSProperties = {
  padding: "0.7rem 0.9rem",
  fontSize: "0.83rem",
  borderBottom: "1px solid #F1F5F9",
  verticalAlign: "top"
};

const encabezado: React.CSSProperties = {
  padding: "0.6rem 0.9rem",
  fontSize: "0.7rem",
  fontWeight: 700,
  color: "#64748B",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  textAlign: "left",
  borderBottom: "1px solid #E2E8F0"
};

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

  let pagina: PaginaPagos | null = null;
  let comercios: Comercio[] = [];
  let error: string | null = null;

  try {
    [pagina, comercios] = await Promise.all([
      listarPagos({
        tenantId: filtro("tenantId"),
        estado: filtro("estado"),
        referencia: filtro("referencia"),
        cursorAt: filtro("cursorAt"),
        cursorId: filtro("cursorId")
      }),
      listarComercios()
    ]);
  } catch (e) {
    error = e instanceof ErrorApi ? e.message : "No se pudo cargar el listado de cobros.";
  }

  const siguienteHref = (() => {
    if (!pagina?.siguiente) return null;
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
        titulo="Pagos"
        descripcion="Todos los cobros de la pasarela, comercio por comercio."
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
              overflow: "hidden"
            }}
          >
            {pagina.pagos.length === 0 ? (
              <p style={{ margin: 0, padding: "2rem", fontSize: "0.87rem", color: "#64748B" }}>
                Ningún cobro coincide con esos filtros.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
                  <thead>
                    <tr>
                      <th style={encabezado}>Referencia</th>
                      <th style={encabezado}>Comercio</th>
                      <th style={{ ...encabezado, textAlign: "right" }}>Monto</th>
                      <th style={encabezado}>Estado</th>
                      <th style={encabezado}>Proveedor</th>
                      <th style={encabezado}>Creado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagina.pagos.map((p) => (
                      <tr key={p.id}>
                        <td style={celda}>
                          <Link
                            href={`/pagos/${p.id}`}
                            style={{ color: "#4b3075", fontWeight: 700, textDecoration: "none" }}
                          >
                            {p.referencia}
                          </Link>
                          <div
                            style={{
                              fontSize: "0.7rem",
                              color: "#94A3B8",
                              fontFamily: "ui-monospace, Menlo, monospace"
                            }}
                          >
                            {p.id.slice(0, 8)}…
                          </div>
                        </td>
                        <td style={celda}>{p.tenantNombre}</td>
                        <td
                          style={{
                            ...celda,
                            textAlign: "right",
                            fontVariantNumeric: "tabular-nums",
                            fontWeight: 600
                          }}
                        >
                          {formatoMonto(p.montoMinor, p.moneda)}
                        </td>
                        <td style={celda}>
                          <EstadoCobro estado={p.estado} />
                        </td>
                        <td style={{ ...celda, fontSize: "0.78rem", color: "#64748B" }}>
                          {p.provider}
                        </td>
                        <td style={{ ...celda, fontSize: "0.78rem", color: "#64748B" }}>
                          {new Date(p.creadoEn).toLocaleString("es-CO")}
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
            Los montos van en la unidad mínima de cada moneda: en pesos colombianos el valor face,
            sin decimales inventados. El proveedor mostrado es el que procesó ese cobro, aunque hoy
            esté activo otro.
          </p>
        </>
      )}
    </>
  );
}
