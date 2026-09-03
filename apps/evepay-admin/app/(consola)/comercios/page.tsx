import { Tarjeta, TituloSeccion } from "@/components/seccion";
import { ErrorApi, listarComercios, type Comercio } from "@/lib/api/evepay";
import { AccionesComercio } from "./acciones-comercio";
import { NuevoComercio } from "./nuevo-comercio";

export const dynamic = "force-dynamic";

const celda: React.CSSProperties = {
  padding: "0.75rem 0.9rem",
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

function Etiqueta({ texto, tono }: { texto: string; tono: "verde" | "ambar" | "gris" | "rojo" }) {
  const colores = {
    verde: { bg: "#F0FDF4", fg: "#15803D", bd: "#BBF7D0" },
    ambar: { bg: "#FFFBEB", fg: "#B45309", bd: "#FDE68A" },
    gris: { bg: "#F8FAFC", fg: "#64748B", bd: "#E2E8F0" },
    rojo: { bg: "#FEF2F2", fg: "#B91C1C", bd: "#FECACA" }
  }[tono];

  return (
    <span
      style={{
        display: "inline-block",
        background: colores.bg,
        color: colores.fg,
        border: `1px solid ${colores.bd}`,
        borderRadius: 999,
        padding: "0.12rem 0.5rem",
        fontSize: "0.7rem",
        fontWeight: 700,
        whiteSpace: "nowrap"
      }}
    >
      {texto}
    </span>
  );
}

function tonoTenant(estado: string) {
  return estado === "activo" ? "verde" : "rojo";
}

function tonoMerchant(estado: string | undefined) {
  if (estado === "aprobado") return "verde";
  if (estado === "rechazado") return "rojo";
  return "ambar";
}

export default async function ComerciosPage() {
  let comercios: Comercio[] = [];
  let error: string | null = null;

  try {
    comercios = await listarComercios();
  } catch (e) {
    error = e instanceof ErrorApi ? e.message : "No se pudo cargar la lista de comercios.";
  }

  return (
    <>
      <TituloSeccion
        titulo="Comercios"
        descripcion="Onboarding y ciclo de vida de los comercios de EvePay."
      />

      {error ? (
        <Tarjeta>
          <p style={{ margin: 0, fontSize: "0.87rem", color: "#B91C1C", fontWeight: 600 }}>
            {error}
          </p>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", color: "#64748B" }}>
            La consola no guarda datos propios: todo lo lee de la API de EvePay. Comprueba que esté
            levantada antes de reintentar.
          </p>
        </Tarjeta>
      ) : (
        <>
          <NuevoComercio />

          <div
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 14,
              overflow: "hidden"
            }}
          >
            {comercios.length === 0 ? (
              <p style={{ margin: 0, padding: "2rem", fontSize: "0.87rem", color: "#64748B" }}>
                Todavía no hay comercios. Crea el primero con el botón de arriba.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                  <thead>
                    <tr>
                      <th style={encabezado}>Comercio</th>
                      <th style={encabezado}>Estado</th>
                      <th style={encabezado}>KYC</th>
                      <th style={encabezado}>API keys</th>
                      <th style={{ ...encabezado, textAlign: "right" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comercios.map((c) => {
                      const activo = c.estado === "activo";
                      return (
                        <tr key={c.tenantId} style={{ opacity: activo ? 1 : 0.65 }}>
                          <td style={celda}>
                            <div style={{ fontWeight: 700, color: "#0A2540" }}>{c.displayName}</div>
                            <div style={{ fontSize: "0.76rem", color: "#64748B" }}>
                              {c.legalName}
                            </div>
                            <div
                              style={{
                                fontSize: "0.7rem",
                                color: "#94A3B8",
                                fontFamily: "ui-monospace, Menlo, monospace",
                                marginTop: "0.2rem"
                              }}
                            >
                              {c.tenantId}
                            </div>
                          </td>
                          <td style={celda}>
                            <Etiqueta texto={c.estado} tono={tonoTenant(c.estado)} />
                          </td>
                          <td style={celda}>
                            <Etiqueta
                              texto={c.merchantEstado ?? "sin comercio"}
                              tono={c.merchantEstado ? tonoMerchant(c.merchantEstado) : "gris"}
                            />
                          </td>
                          <td style={celda}>
                            {c.apiKeys.length === 0 ? (
                              <span style={{ fontSize: "0.78rem", color: "#94A3B8" }}>—</span>
                            ) : (
                              <div
                                style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}
                              >
                                {c.apiKeys.map((k) => (
                                  <div
                                    key={`${k.prefix}-${k.environment}`}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.4rem"
                                    }}
                                  >
                                    <code
                                      style={{
                                        fontSize: "0.72rem",
                                        fontFamily: "ui-monospace, Menlo, monospace",
                                        color: k.activa ? "#0A2540" : "#94A3B8",
                                        textDecoration: k.activa ? "none" : "line-through"
                                      }}
                                    >
                                      {k.prefix}…
                                    </code>
                                    <Etiqueta
                                      texto={k.environment}
                                      tono={k.environment === "live" ? "verde" : "gris"}
                                    />
                                    {!k.activa && <Etiqueta texto="revocada" tono="gris" />}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td style={{ ...celda, textAlign: "right" }}>
                            <AccionesComercio
                              tenantId={c.tenantId}
                              nombre={c.displayName}
                              activo={activo}
                              kyc={c.merchantEstado}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#94A3B8" }}>
            La clave completa solo se ve al crearla o al rotarla: la base guarda su hash, nunca la
            clave. Cada alta, rotación y cambio de estado queda auditado.
          </p>
        </>
      )}
    </>
  );
}
