import { Tarjeta, TituloSeccion } from "@/components/seccion";
import {
  cuadreCustodia,
  ErrorApi,
  estadoProveedores,
  resumenOperativo,
  type CuadreCustodia,
  type EstadoProveedores,
  type Resumen
} from "@/lib/api/evepay";
import { sesionActual } from "@/lib/auth/rol";
import { formatoMonto } from "@/lib/formato";
import { CircleAlert, CircleCheck } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function Kpi({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle?: string }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        padding: "1rem 1.1rem"
      }}
    >
      <div
        style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748B", letterSpacing: "0.04em" }}
      >
        {etiqueta.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: "1.35rem",
          fontWeight: 700,
          color: "#0A2540",
          marginTop: "0.35rem",
          fontVariantNumeric: "tabular-nums"
        }}
      >
        {valor}
      </div>
      {detalle && (
        <div style={{ fontSize: "0.74rem", color: "#94A3B8", marginTop: "0.2rem" }}>{detalle}</div>
      )}
    </div>
  );
}

function Alerta({
  href,
  texto,
  detalle,
  tono
}: {
  href: string;
  texto: string;
  detalle: string;
  tono: "rojo" | "ambar" | "azul";
}) {
  const c = { rojo: "#B91C1C", ambar: "#B45309", azul: "#1D4ED8" }[tono];
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        gap: "0.6rem",
        alignItems: "flex-start",
        padding: "0.65rem 0",
        borderBottom: "1px solid #F1F5F9",
        textDecoration: "none"
      }}
    >
      <CircleAlert size={15} color={c} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <div style={{ fontSize: "0.83rem", fontWeight: 600, color: "#0A2540" }}>{texto}</div>
        <div style={{ fontSize: "0.74rem", color: "#64748B" }}>{detalle}</div>
      </div>
    </Link>
  );
}

/**
 * Command Center (Fase 10): la salud del dinero y de la operación con cifras
 * reales de la base. Va después de las Fases 6–9 porque antes no había de
 * dónde sacarlas; lo que no existe todavía no se muestra.
 */
export default async function InicioPage() {
  const { actor } = await sesionActual();
  let r: Resumen | null = null;
  let cuadre: CuadreCustodia | null = null;
  let prov: EstadoProveedores | null = null;
  let error: string | null = null;
  try {
    [r, cuadre, prov] = await Promise.all([
      resumenOperativo(),
      cuadreCustodia(),
      estadoProveedores()
    ]);
  } catch (e) {
    error = e instanceof ErrorApi ? e.message : "No se pudo cargar el resumen.";
  }

  const hoy = new Date().toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const descuadre = cuadre?.diferencia != null && cuadre.diferencia !== 0;

  return (
    <>
      <TituloSeccion
        titulo="Command Center"
        descripcion={`Salud del dinero y de la operación · ${hoy}${actor ? ` · ${actor}` : ""}`}
      />
      {error || !r ? (
        <Tarjeta>
          <p style={{ margin: 0, fontSize: "0.87rem", color: "#B91C1C", fontWeight: 600 }}>
            {error}
          </p>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", color: "#64748B" }}>
            La consola no guarda datos propios: todo lo lee de la API de EvePay.
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
              etiqueta="Cobrado hoy"
              valor={formatoMonto(r.volumenHoyMinor, "COP")}
              detalle={`${r.cobrosHoy} cobro(s) aprobados`}
            />
            <Kpi
              etiqueta="Cobrado este mes"
              valor={formatoMonto(r.volumenMesMinor, "COP")}
              detalle={`${r.cobrosMes} cobro(s)${r.aprobacionMesPct != null ? ` · ${r.aprobacionMesPct} % aprobación` : ""}`}
            />
            <Kpi
              etiqueta="Comisión del mes"
              valor={formatoMonto(r.comisionMesMinor, "COP")}
              detalle={`IVA ${formatoMonto(r.ivaMesMinor, "COP")} · costo proveedor ${formatoMonto(r.costoMesMinor, "COP")}`}
            />
            <Kpi
              etiqueta="Margen del mes"
              valor={formatoMonto(r.margenMesMinor, "COP")}
              detalle="comisión − costo del proveedor"
            />
          </div>

          <div
            style={{
              background: "linear-gradient(135deg, #0a2540 0%, #1e3a5f 100%)",
              color: "#fff",
              borderRadius: 16,
              padding: "1.3rem 1.4rem"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: "1rem",
                flexWrap: "wrap"
              }}
            >
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                  Flujo de fondos · custodia
                </div>
                <div style={{ fontSize: "0.74rem", color: "#CBD5E1" }}>
                  De quién es cada peso que EvePay tiene o espera
                </div>
              </div>
              <Link
                href="/conciliacion"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: descuadre ? "#FCA5A5" : cuadre?.saldoBanco == null ? "#FDE68A" : "#86EFAC",
                  textDecoration: "none"
                }}
              >
                {descuadre ? <CircleAlert size={14} /> : <CircleCheck size={14} />}
                {descuadre
                  ? `Descuadre de custodia: ${formatoMonto(Math.abs(cuadre?.diferencia ?? 0), "COP")}`
                  : cuadre?.saldoBanco == null
                    ? "Sin saldo del banco registrado hoy"
                    : "Custodia cuadrada"}
              </Link>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "0.7rem",
                marginTop: "1rem"
              }}
            >
              {[
                ["En tránsito", r.enTransitoMinor, "cobrado, aún no consignado"],
                ["En la cuenta de recaudo", r.enRecaudoMinor, "según el libro"],
                ["Por pagar a comercios", r.porPagarMinor, "lo que se debe"],
                ["Retenido", r.retenidoMinor, "reservas y riesgo"]
              ].map(([t, v, d]) => (
                <div
                  key={String(t)}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    padding: "0.7rem 0.85rem"
                  }}
                >
                  <div style={{ fontSize: "0.68rem", color: "#CBD5E1" }}>{t}</div>
                  <div
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums"
                    }}
                  >
                    {formatoMonto(Number(v), "COP")}
                  </div>
                  <div style={{ fontSize: "0.66rem", color: "#94A3B8" }}>{d}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "1rem"
            }}
          >
            <Tarjeta>
              <h2 style={{ margin: "0 0 0.4rem", fontSize: "0.98rem", color: "#0A2540" }}>
                Pendientes de operación
              </h2>
              {r.asientosDescuadrados > 0 && (
                <Alerta
                  href="/conciliacion"
                  texto={`${r.asientosDescuadrados} asiento(s) del ledger descuadrado(s)`}
                  detalle="Un asiento mal construido: revisar antes de que llegue a un estado de cuenta."
                  tono="rojo"
                />
              )}
              {descuadre && (
                <Alerta
                  href="/conciliacion"
                  texto="Descuadre de custodia"
                  detalle={`El banco y el libro difieren en ${formatoMonto(Math.abs(cuadre?.diferencia ?? 0), "COP")}.`}
                  tono="rojo"
                />
              )}
              {r.colaRiesgo > 0 && (
                <Alerta
                  href="/riesgo"
                  texto={`${r.colaRiesgo} cobro(s) retenido(s) por riesgo`}
                  detalle="Esperan revisión; su dinero no se dispersa."
                  tono="ambar"
                />
              )}
              {r.pendientesConsignar > 0 && (
                <Alerta
                  href="/conciliacion"
                  texto={`${r.pendientesConsignar} cobro(s) aprobados sin consignar`}
                  detalle={`${formatoMonto(r.pendientesConsignarMinor, "COP")} que el proveedor aún debe consignar.`}
                  tono="azul"
                />
              )}
              {r.lotesAbiertos > 0 && (
                <Alerta
                  href="/dispersion"
                  texto={`${r.lotesAbiertos} lote(s) de dispersión abierto(s)`}
                  detalle="Por aprobar o por registrar el pago."
                  tono="azul"
                />
              )}
              {r.comerciosSinTarifa > 0 && (
                <Alerta
                  href="/comercios"
                  texto={`${r.comerciosSinTarifa} comercio(s) activos sin tarifa`}
                  detalle="Sin tarifa no pueden cobrar."
                  tono="ambar"
                />
              )}
              {r.comerciosSinKyc > 0 && (
                <Alerta
                  href="/comercios"
                  texto={`${r.comerciosSinKyc} comercio(s) activos sin KYC aprobado`}
                  detalle="No pueden cobrar hasta aprobarlos."
                  tono="ambar"
                />
              )}
              {r.asientosDescuadrados === 0 &&
                !descuadre &&
                r.colaRiesgo === 0 &&
                r.pendientesConsignar === 0 &&
                r.lotesAbiertos === 0 &&
                r.comerciosSinTarifa === 0 &&
                r.comerciosSinKyc === 0 && (
                  <p
                    style={{
                      margin: "0.5rem 0 0",
                      fontSize: "0.84rem",
                      color: "#15803D",
                      fontWeight: 600
                    }}
                  >
                    Nada pendiente.
                  </p>
                )}
            </Tarjeta>
            <Tarjeta>
              <h2 style={{ margin: "0 0 0.6rem", fontSize: "0.98rem", color: "#0A2540" }}>
                Plataforma
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.45rem",
                  fontSize: "0.83rem",
                  color: "#0A2540"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Proveedor activo</span>
                  <Link
                    href="/proveedores"
                    style={{ color: "#4b3075", fontWeight: 700, textDecoration: "none" }}
                  >
                    {prov?.activo ?? "—"}
                  </Link>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Comercios activos</span>
                  <strong>{r.comerciosActivos}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Modelo de fondos</span>
                  <span style={{ color: "#64748B" }}>custodia en cuenta de recaudo</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
                {(
                  [
                    ["/comercios", "Comercios"],
                    ["/pagos", "Pagos"],
                    ["/conciliacion", "Conciliación"],
                    ["/dispersion", "Dispersión"],
                    ["/riesgo", "Riesgo"],
                    ["/reportes", "Reportes"],
                    ["/auditoria", "Auditoría"]
                  ] as const
                ).map(([h, t]) => (
                  <Link
                    key={h}
                    href={h}
                    style={{
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      color: "#4b3075",
                      border: "1px solid #E2E8F0",
                      borderRadius: 999,
                      padding: "0.25rem 0.7rem",
                      textDecoration: "none"
                    }}
                  >
                    {t}
                  </Link>
                ))}
              </div>
            </Tarjeta>
          </div>
        </div>
      )}
    </>
  );
}
