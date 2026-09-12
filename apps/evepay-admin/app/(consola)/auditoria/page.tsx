import { Tarjeta, TituloSeccion } from "@/components/seccion";
import { ErrorApi, listarAuditoria, type AccionAdmin } from "@/lib/api/evepay";

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

/** Bitácora inmutable de lo que hizo el equipo (admin-console CA-4; riesgo-comercio). */
export default async function AuditoriaPage() {
  let acciones: AccionAdmin[] = [];
  let error: string | null = null;
  try {
    acciones = await listarAuditoria(200);
  } catch (e) {
    error = e instanceof ErrorApi ? e.message : "No se pudo cargar la auditoría.";
  }

  return (
    <>
      <TituloSeccion
        titulo="Auditoría"
        descripcion="Quién hizo qué en la consola. No se edita ni se borra: un rastro que se puede tocar no es un rastro."
      />
      {error ? (
        <Tarjeta>
          <p style={{ margin: 0, fontSize: "0.87rem", color: "#B91C1C", fontWeight: 600 }}>
            {error}
          </p>
        </Tarjeta>
      ) : (
        <Tarjeta>
          {acciones.length === 0 ? (
            <p style={{ margin: 0, fontSize: "0.84rem", color: "#64748B" }}>
              Sin acciones registradas.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                <thead>
                  <tr>
                    <th style={encabezado}>Cuándo</th>
                    <th style={encabezado}>Quién</th>
                    <th style={encabezado}>Acción</th>
                    <th style={encabezado}>Sobre</th>
                    <th style={encabezado}>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {acciones.map((a) => (
                    <tr key={a.id}>
                      <td
                        style={{
                          ...celda,
                          fontSize: "0.74rem",
                          color: "#94A3B8",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {new Date(a.creadoEn).toLocaleString("es-CO")}
                      </td>
                      <td style={celda}>{a.actor}</td>
                      <td style={{ ...celda, fontWeight: 600, color: "#0A2540" }}>
                        <code style={{ fontSize: "0.76rem" }}>{a.accion}</code>
                      </td>
                      <td style={{ ...celda, fontSize: "0.74rem", color: "#64748B" }}>
                        {a.objetoTipo}
                        {a.objetoId && (
                          <div
                            style={{
                              fontFamily: "ui-monospace, Menlo, monospace",
                              fontSize: "0.68rem"
                            }}
                          >
                            {a.objetoId}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          ...celda,
                          fontSize: "0.72rem",
                          color: "#64748B",
                          fontFamily: "ui-monospace, Menlo, monospace",
                          wordBreak: "break-all",
                          maxWidth: 420
                        }}
                      >
                        {JSON.stringify(a.detalle)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      )}
    </>
  );
}
