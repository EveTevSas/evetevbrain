import { Kpi } from "@/components/kpi";
import { Tarjeta, TituloSeccion } from "@/components/seccion";
import {
  ErrorApi,
  estadoProveedores,
  listarComercios,
  tarifaDeProveedor,
  tarifasVigentes,
  type Comercio,
  type TarifaProveedorAdmin,
  type TarifaVigenteDeComercio
} from "@/lib/api/evepay";
import { puede } from "@/lib/auth/permissions";
import { sesionActual } from "@/lib/auth/rol";
import { formatoMonto } from "@/lib/formato";
import Link from "next/link";
import { TarifaProveedor } from "../proveedores/tarifa-proveedor";

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

const pct = (bps: number) =>
  `${(bps / 100).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

/**
 * Comisiones & Pricing (spec comisiones): qué cobra EvePay a cada comercio y
 * qué le cuesta el proveedor. Sin tarifa vigente, un comercio no puede cobrar
 * (CA-4); por eso los que faltan van primero.
 */
export default async function TarifasPage() {
  const { rol } = await sesionActual();
  let comercios: Comercio[] = [];
  let vigentes: TarifaVigenteDeComercio[] = [];
  const proveedores: TarifaProveedorAdmin[] = [];
  let error: string | null = null;
  try {
    const [c, v, estado] = await Promise.all([
      listarComercios(),
      tarifasVigentes(),
      estadoProveedores()
    ]);
    comercios = c;
    vigentes = v;
    proveedores.push(
      ...(await Promise.all(estado.proveedores.map((p) => tarifaDeProveedor(p.nombre))))
    );
  } catch (e) {
    error = e instanceof ErrorApi ? e.message : "No se pudieron cargar las tarifas.";
  }

  const porTenant = new Map(vigentes.map((t) => [t.tenantId, t]));
  const activos = comercios.filter((c) => c.estado === "activo");
  const sinTarifa = activos.filter((c) => !porTenant.has(c.tenantId));
  const conTarifa = comercios
    .filter((c) => porTenant.has(c.tenantId))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "es"));
  const bpsPromedio =
    vigentes.length > 0 ? Math.round(vigentes.reduce((s, t) => s + t.bps, 0) / vigentes.length) : 0;
  const costo = proveedores.find((p) => p.vigente)?.vigente ?? null;

  return (
    <>
      <TituloSeccion
        titulo="Comisiones & Pricing"
        descripcion="Lo que EvePay cobra a cada comercio (comisión + fijo + IVA) y lo que le cuesta el proveedor. La diferencia es el margen."
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
              etiqueta="Comercios con tarifa"
              valor={`${conTarifa.length} / ${comercios.length}`}
              detalle={
                sinTarifa.length > 0
                  ? `${sinTarifa.length} activo(s) sin tarifa: no pueden cobrar`
                  : "todos los activos pueden cobrar"
              }
              tono={sinTarifa.length > 0 ? "rojo" : "verde"}
            />
            <Kpi
              etiqueta="Comisión promedio"
              valor={vigentes.length > 0 ? pct(bpsPromedio) : "—"}
              detalle="promedio simple de las tarifas vigentes"
            />
            <Kpi
              etiqueta="Costo del proveedor"
              valor={costo ? pct(costo.bps) : "—"}
              detalle={
                costo
                  ? `${costo.provider} · fijo ${formatoMonto(costo.fijoMinor, "COP")} · ${costo.descuentaEnConsignacion ? "lo descuenta al consignar" : "factura aparte"}`
                  : "sin tarifa de proveedor registrada"
              }
              tono={costo ? "neutro" : "ambar"}
            />
          </div>

          {sinTarifa.length > 0 && (
            <div
              role="alert"
              style={{
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: 12,
                padding: "0.85rem 1.05rem",
                fontSize: "0.83rem",
                color: "#7F1D1D"
              }}
            >
              <strong>Sin tarifa:</strong>{" "}
              {sinTarifa.map((c, i) => (
                <span key={c.tenantId}>
                  {i > 0 && ", "}
                  <Link
                    href={`/comercios/${c.tenantId}`}
                    style={{ color: "#B91C1C", fontWeight: 700 }}
                  >
                    {c.displayName}
                  </Link>
                </span>
              ))}
              . La API responde 409 a sus cobros hasta que alguien con rol super_admin les asigne
              una desde la ficha.
            </div>
          )}

          <Tarjeta>
            <h2 style={{ margin: "0 0 0.9rem", fontSize: "0.98rem", color: "#0A2540" }}>
              Tarifas por comercio
            </h2>
            {conTarifa.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.84rem", color: "#64748B" }}>
                Ningún comercio tiene tarifa todavía.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                  <thead>
                    <tr>
                      <th style={encabezado}>Comercio</th>
                      <th style={{ ...encabezado, textAlign: "right" }}>Comisión</th>
                      <th style={{ ...encabezado, textAlign: "right" }}>Fijo</th>
                      <th style={{ ...encabezado, textAlign: "right" }}>IVA</th>
                      <th style={{ ...encabezado, textAlign: "right" }}>Sobre $100.000</th>
                      <th style={encabezado}>Vigente desde</th>
                      <th style={encabezado}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {conTarifa.map((c) => {
                      const t = porTenant.get(c.tenantId)!;
                      const comision = Math.round((100_000 * t.bps) / 10_000) + t.fijoMinor;
                      const iva = Math.round((comision * t.ivaBps) / 10_000);
                      return (
                        <tr key={c.tenantId}>
                          <td style={celda}>
                            <Link
                              href={`/comercios/${c.tenantId}`}
                              style={{ color: "#0A2540", fontWeight: 700, textDecoration: "none" }}
                            >
                              {c.displayName}
                            </Link>
                            <div style={{ fontSize: "0.72rem", color: "#64748B" }}>{c.estado}</div>
                          </td>
                          <td style={{ ...celda, textAlign: "right", fontWeight: 700 }}>
                            {pct(t.bps)}
                          </td>
                          <td style={{ ...celda, textAlign: "right" }}>
                            {formatoMonto(t.fijoMinor, "COP")}
                          </td>
                          <td style={{ ...celda, textAlign: "right" }}>
                            {t.ivaBps === 1900 ? "19 %" : "0 %"}
                          </td>
                          <td
                            style={{
                              ...celda,
                              textAlign: "right",
                              color: "#475569",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {formatoMonto(comision + iva, "COP")}
                            <div style={{ fontSize: "0.7rem", color: "#94A3B8" }}>
                              {formatoMonto(comision, "COP")} + IVA {formatoMonto(iva, "COP")}
                            </div>
                          </td>
                          <td style={{ ...celda, color: "#64748B", whiteSpace: "nowrap" }}>
                            {new Date(t.vigenteDesde).toLocaleDateString("es-CO")}
                            <div style={{ fontSize: "0.7rem", color: "#94A3B8" }}>
                              {t.creadaPor}
                            </div>
                          </td>
                          <td style={{ ...celda, textAlign: "right", whiteSpace: "nowrap" }}>
                            <Link
                              href={`/comercios/${c.tenantId}`}
                              style={{ color: "#4b3075", fontWeight: 700, fontSize: "0.78rem" }}
                            >
                              {puede(rol, "tarifas.escribir") ? "Cambiar →" : "Ver historial →"}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Tarjeta>

          {proveedores.map((t) => (
            <Tarjeta key={t.provider}>
              <TarifaProveedor
                tarifa={t}
                tarifasComercios={vigentes}
                puedeEditar={puede(rol, "tarifas.escribir")}
              />
            </Tarjeta>
          ))}
        </div>
      )}
    </>
  );
}
