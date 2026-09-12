import { Tarjeta, TituloSeccion } from "@/components/seccion";
import {
  ErrorApi,
  estadoDeCuenta,
  listarComercios,
  reporteFiscal,
  type Comercio,
  type EstadoCuenta,
  type FilaFiscal
} from "@/lib/api/evepay";
import { formatoMonto } from "@/lib/formato";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

const celda: React.CSSProperties = {
  padding: "0.55rem 0.7rem",
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
const num: React.CSSProperties = {
  ...celda,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap"
};
const control: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E2E8F0",
  borderRadius: 9,
  padding: "0.45rem 0.7rem",
  fontSize: "0.82rem",
  color: "#0A2540"
};

function Descargar({ href, texto }: { href: string; texto: string }) {
  return (
    <a
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        border: "1px solid #E2E8F0",
        background: "#fff",
        borderRadius: 9,
        padding: "0.4rem 0.75rem",
        fontSize: "0.76rem",
        fontWeight: 700,
        color: "#4b3075",
        textDecoration: "none",
        whiteSpace: "nowrap"
      }}
    >
      <Download size={13} /> {texto}
    </a>
  );
}

export default async function ReportesPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const p = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");
  const hoy = new Date().toISOString().slice(0, 10);
  const hace30 = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const desde = p("desde") || hace30;
  const hasta = p("hasta") || hoy;
  const mes = p("mes") || hoy.slice(0, 7);

  let comercios: Comercio[] = [];
  let estado: EstadoCuenta | null = null;
  let fiscal: FilaFiscal[] = [];
  let error: string | null = null;
  try {
    comercios = await listarComercios();
    const tenantId = p("tenantId") || comercios[0]?.tenantId || "";
    [estado, fiscal] = await Promise.all([
      tenantId ? estadoDeCuenta(tenantId, desde, hasta) : null,
      reporteFiscal(mes)
    ]);
  } catch (e) {
    error = e instanceof ErrorApi ? e.message : "No se pudieron cargar los reportes.";
  }
  const tenantId = estado?.tenantId ?? "";
  const totales = fiscal.reduce(
    (a, f) => ({
      base: a.base + f.baseMinor,
      comision: a.comision + f.comisionMinor,
      iva: a.iva + f.ivaMinor,
      costo: a.costo + f.costoMinor,
      margen: a.margen + f.margenMinor
    }),
    { base: 0, comision: 0, iva: 0, costo: 0, margen: 0 }
  );

  return (
    <>
      <TituloSeccion
        titulo="Reportes"
        descripcion="Estados de cuenta por comercio desde el ledger, lo contable del mes y exportes en CSV para Excel."
      />
      {error ? (
        <Tarjeta>
          <p style={{ margin: 0, fontSize: "0.87rem", color: "#B91C1C", fontWeight: 600 }}>
            {error}
          </p>
        </Tarjeta>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Tarjeta>
            <div
              style={{
                display: "flex",
                gap: "0.6rem",
                flexWrap: "wrap",
                alignItems: "center",
                marginBottom: "0.9rem"
              }}
            >
              <h2 style={{ margin: 0, fontSize: "0.98rem", color: "#0A2540", flex: 1 }}>
                Exportes
              </h2>
              <Descargar href="/api/exportar/pagos" texto="Pagos" />
              <Descargar href="/api/exportar/consignaciones" texto="Consignaciones" />
              <Descargar href="/api/exportar/lotes" texto="Lotes de dispersión" />
            </div>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#94A3B8" }}>
              CSV con punto y coma y acentos correctos; los montos son enteros en la unidad mínima
              (pesos en COP).
            </p>
          </Tarjeta>

          <Tarjeta>
            <form
              method="get"
              style={{
                display: "flex",
                gap: "0.6rem",
                flexWrap: "wrap",
                alignItems: "flex-end",
                marginBottom: "1rem"
              }}
            >
              <h2 style={{ margin: 0, fontSize: "0.98rem", color: "#0A2540", width: "100%" }}>
                Estado de cuenta
              </h2>
              <label
                style={{
                  fontSize: "0.72rem",
                  color: "#334155",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem"
                }}
              >
                Comercio
                <select name="tenantId" defaultValue={tenantId} style={control}>
                  {comercios.map((c) => (
                    <option key={c.tenantId} value={c.tenantId}>
                      {c.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label
                style={{
                  fontSize: "0.72rem",
                  color: "#334155",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem"
                }}
              >
                Desde
                <input type="date" name="desde" defaultValue={desde} style={control} />
              </label>
              <label
                style={{
                  fontSize: "0.72rem",
                  color: "#334155",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem"
                }}
              >
                Hasta
                <input type="date" name="hasta" defaultValue={hasta} style={control} />
              </label>
              <input type="hidden" name="mes" value={mes} />
              <button
                type="submit"
                style={{ ...control, fontWeight: 700, color: "#4b3075", cursor: "pointer" }}
              >
                Ver
              </button>
              {tenantId && (
                <Descargar
                  href={`/api/exportar/estado-cuenta?tenantId=${tenantId}&desde=${desde}&hasta=${hasta}`}
                  texto="CSV"
                />
              )}
            </form>
            {!estado || estado.lineas.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.84rem", color: "#64748B" }}>
                Sin movimientos en el periodo.
              </p>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                    gap: "0.8rem",
                    marginBottom: "1rem"
                  }}
                >
                  {estado.porCuenta.map((c) => (
                    <div
                      key={c.cuenta}
                      style={{
                        background: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                        borderRadius: 10,
                        padding: "0.6rem 0.8rem"
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "#94A3B8",
                          fontFamily: "ui-monospace, Menlo, monospace"
                        }}
                      >
                        {c.cuenta}
                      </div>
                      <div
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          color: c.netoMinor < 0 ? "#B45309" : "#0A2540"
                        }}
                      >
                        {formatoMonto(c.netoMinor, "COP")}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "#64748B" }}>
                        {c.naturaleza} · D {c.debitos.toLocaleString("es-CO")} · C{" "}
                        {c.creditos.toLocaleString("es-CO")}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                    <thead>
                      <tr>
                        <th style={encabezado}>Fecha</th>
                        <th style={encabezado}>Movimiento</th>
                        <th style={encabezado}>Cuenta</th>
                        <th style={{ ...encabezado, textAlign: "right" }}>Débito</th>
                        <th style={{ ...encabezado, textAlign: "right" }}>Crédito</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estado.lineas.map((l, i) => (
                        <tr key={`${l.asientoId}-${i}`}>
                          <td
                            style={{
                              ...celda,
                              fontSize: "0.74rem",
                              color: "#94A3B8",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {new Date(l.posteadoEn).toLocaleString("es-CO")}
                          </td>
                          <td style={celda}>
                            <code style={{ fontSize: "0.72rem" }}>{l.kind}</code>
                            <div style={{ fontSize: "0.74rem", color: "#64748B" }}>{l.memo}</div>
                          </td>
                          <td
                            style={{
                              ...celda,
                              fontFamily: "ui-monospace, Menlo, monospace",
                              fontSize: "0.74rem"
                            }}
                          >
                            {l.cuenta}
                          </td>
                          <td style={num}>
                            {l.direccion === "debit" ? formatoMonto(l.montoMinor, "COP") : ""}
                          </td>
                          <td style={num}>
                            {l.direccion === "credit" ? formatoMonto(l.montoMinor, "COP") : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Tarjeta>

          <Tarjeta>
            <form
              method="get"
              style={{
                display: "flex",
                gap: "0.6rem",
                flexWrap: "wrap",
                alignItems: "flex-end",
                marginBottom: "1rem"
              }}
            >
              <h2 style={{ margin: 0, fontSize: "0.98rem", color: "#0A2540", width: "100%" }}>
                Lo contable del mes
              </h2>
              <label
                style={{
                  fontSize: "0.72rem",
                  color: "#334155",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem"
                }}
              >
                Mes
                <input type="month" name="mes" defaultValue={mes} style={control} />
              </label>
              <input type="hidden" name="tenantId" value={tenantId} />
              <input type="hidden" name="desde" value={desde} />
              <input type="hidden" name="hasta" value={hasta} />
              <button
                type="submit"
                style={{ ...control, fontWeight: 700, color: "#4b3075", cursor: "pointer" }}
              >
                Ver
              </button>
              <Descargar href={`/api/exportar/fiscal?mes=${mes}`} texto="CSV" />
            </form>
            {fiscal.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.84rem", color: "#64748B" }}>
                Sin cobros ni asientos en {mes}.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                  <thead>
                    <tr>
                      <th style={encabezado}>Comercio</th>
                      <th style={{ ...encabezado, textAlign: "right" }}>Cobros</th>
                      <th style={{ ...encabezado, textAlign: "right" }}>Base</th>
                      <th style={{ ...encabezado, textAlign: "right" }}>Comisión</th>
                      <th style={{ ...encabezado, textAlign: "right" }}>IVA</th>
                      <th style={{ ...encabezado, textAlign: "right" }}>Costo</th>
                      <th style={{ ...encabezado, textAlign: "right" }}>Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fiscal.map((f) => (
                      <tr key={f.tenantId}>
                        <td style={celda}>
                          {f.tenantNombre}
                          <div style={{ fontSize: "0.72rem", color: "#64748B" }}>
                            {f.documento ?? "sin perfil"}
                          </div>
                        </td>
                        <td style={num}>{f.cobros}</td>
                        <td style={num}>{formatoMonto(f.baseMinor, "COP")}</td>
                        <td style={num}>{formatoMonto(f.comisionMinor, "COP")}</td>
                        <td style={num}>{formatoMonto(f.ivaMinor, "COP")}</td>
                        <td style={num}>{formatoMonto(f.costoMinor, "COP")}</td>
                        <td
                          style={{
                            ...num,
                            fontWeight: 700,
                            color: f.margenMinor < 0 ? "#B91C1C" : "#15803D"
                          }}
                        >
                          {formatoMonto(f.margenMinor, "COP")}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 700 }}>
                      <td style={celda}>Total</td>
                      <td style={num}>{fiscal.reduce((a, f) => a + f.cobros, 0)}</td>
                      <td style={num}>{formatoMonto(totales.base, "COP")}</td>
                      <td style={num}>{formatoMonto(totales.comision, "COP")}</td>
                      <td style={num}>{formatoMonto(totales.iva, "COP")}</td>
                      <td style={num}>{formatoMonto(totales.costo, "COP")}</td>
                      <td style={{ ...num, color: totales.margen < 0 ? "#B91C1C" : "#15803D" }}>
                        {formatoMonto(totales.margen, "COP")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ margin: "0.8rem 0 0", fontSize: "0.75rem", color: "#94A3B8" }}>
              El IVA es el de la comisión de EvePay (lo que se le debe a la DIAN). Las retenciones
              que practique el comercio (ReteFuente, ReteIVA, ReteICA) no están modeladas: las
              define el contador.
            </p>
          </Tarjeta>
        </div>
      )}
    </>
  );
}
