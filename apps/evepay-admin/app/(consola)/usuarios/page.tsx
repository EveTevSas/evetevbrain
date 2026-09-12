import { Tarjeta, TituloSeccion } from "@/components/seccion";
import { PERMISOS, ROLES_INTERNOS, type Accion, type RolInterno } from "@/lib/auth/permissions";
import { sesionActual } from "@/lib/auth/rol";
import { Check, Minus } from "lucide-react";
import React from "react";

export const dynamic = "force-dynamic";

const ROLES: Record<RolInterno, { titulo: string; para: string }> = {
  super_admin: {
    titulo: "super_admin",
    para: "Configura la plataforma: tarifas, políticas de dispersión y reglas de riesgo. Puede todo lo demás."
  },
  ops: {
    titulo: "ops",
    para: "Opera el día a día: comercios, proveedores, conciliación, preparar lotes, listas restrictivas."
  },
  finanzas: {
    titulo: "finanzas",
    para: "Mueve el dinero: aprueba y paga lotes, registra el saldo del banco, reembolsos y resuelve contracargos."
  }
};

/** Cada acción en palabras, agrupada por pantalla. La tabla que manda es la de la API. */
const GRUPOS: { titulo: string; acciones: [Accion, string][] }[] = [
  {
    titulo: "General",
    acciones: [["leer", "Entrar a la consola y ver todo"]]
  },
  {
    titulo: "Comercios y proveedores",
    acciones: [
      ["comercios.escribir", "Crear comercios, rotar claves, cambiar estado"],
      ["proveedores.salud", "Probar la salud del proveedor"],
      ["tarifas.escribir", "Asignar tarifas a comercios y proveedores"],
      ["dispersion.politica", "Cambiar la política de dispersión de un comercio"]
    ]
  },
  {
    titulo: "Transacciones y conciliación",
    acciones: [
      ["pagos.reverificar", "Reverificar un cobro con el proveedor"],
      ["conciliacion.correr", "Correr la conciliación"],
      ["consignaciones.registrar", "Registrar una consignación del proveedor"],
      ["recaudo.saldo", "Registrar el saldo del banco (cuadre de custodia)"]
    ]
  },
  {
    titulo: "Dispersión",
    acciones: [
      ["lotes.preparar", "Preparar un lote"],
      ["lotes.aprobar", "Aprobar un lote (cuatro ojos: no quien lo preparó)"],
      ["lotes.pagar", "Marcar un lote como pagado o fallido"],
      ["retenciones.liberar_primer_cobro", "Liberar la retención del primer cobro"],
      ["retenciones.liberar_reserva", "Liberar la reserva"],
      ["retenciones.liberar_riesgo", "Liberar una retención por riesgo"]
    ]
  },
  {
    titulo: "Riesgo, reembolsos y contracargos",
    acciones: [
      ["riesgo.reglas", "Crear y cambiar reglas del motor"],
      ["riesgo.listas", "Mantener la lista restrictiva"],
      ["reembolsos.registrar", "Registrar reembolsos"],
      ["contracargos.gestionar", "Registrar contracargos y adjuntar evidencia"],
      ["contracargos.resolver", "Resolver un contracargo (ganado / perdido)"]
    ]
  }
];

const celda: React.CSSProperties = {
  padding: "0.55rem 0.7rem",
  fontSize: "0.8rem",
  borderBottom: "1px solid #F1F5F9"
};

/**
 * Usuarios & RBAC (spec rbac-operativo). El rol viaja en el JWT de Supabase y
 * lo escribe el script de aprovisionamiento con la clave secreta; la consola
 * no lo edita: si pudiera, cualquier sesión podría escalarse a sí misma.
 */
export default async function UsuariosPage() {
  const { actor, rol } = await sesionActual();

  return (
    <>
      <TituloSeccion
        titulo="Usuarios & RBAC"
        descripcion="Tres roles internos y una tabla de permisos por acción. La consola oculta lo que el rol no puede; la API lo rechaza igual."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.8rem"
          }}
        >
          {ROLES_INTERNOS.map((r) => {
            const esMio = r === rol;
            return (
              <div
                key={r}
                style={{
                  background: "#fff",
                  border: esMio ? "1.5px solid #4b3075" : "1px solid #E2E8F0",
                  borderRadius: 14,
                  padding: "1rem 1.1rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <code style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0A2540" }}>
                    {ROLES[r].titulo}
                  </code>
                  {esMio && (
                    <span
                      style={{
                        background: "#f3eeff",
                        color: "#4b3075",
                        borderRadius: 999,
                        padding: "0.15rem 0.6rem",
                        fontSize: "0.7rem",
                        fontWeight: 700
                      }}
                    >
                      tu rol
                    </span>
                  )}
                </div>
                <p
                  style={{
                    margin: "0.5rem 0 0",
                    fontSize: "0.8rem",
                    color: "#475569",
                    lineHeight: 1.5
                  }}
                >
                  {ROLES[r].para}
                </p>
                <div style={{ marginTop: "0.6rem", fontSize: "0.72rem", color: "#94A3B8" }}>
                  {Object.values(PERMISOS).filter((roles) => roles.includes(r)).length} de{" "}
                  {Object.keys(PERMISOS).length} acciones
                </div>
              </div>
            );
          })}
        </div>

        <Tarjeta>
          <h2 style={{ margin: "0 0 0.9rem", fontSize: "0.98rem", color: "#0A2540" }}>
            Matriz de permisos
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr>
                  <th
                    style={{
                      ...celda,
                      textAlign: "left",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      color: "#64748B",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      borderBottom: "1px solid #E2E8F0"
                    }}
                  >
                    Acción
                  </th>
                  {ROLES_INTERNOS.map((r) => (
                    <th
                      key={r}
                      style={{
                        ...celda,
                        textAlign: "center",
                        fontSize: "0.72rem",
                        color: r === rol ? "#4b3075" : "#64748B",
                        borderBottom: "1px solid #E2E8F0",
                        width: 110
                      }}
                    >
                      <code>{r}</code>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GRUPOS.map((g) => (
                  <React.Fragment key={g.titulo}>
                    <tr>
                      <td
                        colSpan={ROLES_INTERNOS.length + 1}
                        style={{
                          ...celda,
                          background: "#F8FAFC",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: "#64748B",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em"
                        }}
                      >
                        {g.titulo}
                      </td>
                    </tr>
                    {g.acciones.map(([accion, texto]) => (
                      <tr key={accion}>
                        <td style={celda}>
                          <div style={{ color: "#0A2540" }}>{texto}</div>
                          <code style={{ fontSize: "0.7rem", color: "#94A3B8" }}>{accion}</code>
                        </td>
                        {ROLES_INTERNOS.map((r) => {
                          const si = PERMISOS[accion].includes(r);
                          return (
                            <td key={r} style={{ ...celda, textAlign: "center" }}>
                              {si ? (
                                <Check size={15} color="#15803D" aria-label="sí" />
                              ) : (
                                <Minus size={15} color="#CBD5E1" aria-label="no" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Tarjeta>

        <Tarjeta>
          <h2 style={{ margin: "0 0 0.6rem", fontSize: "0.98rem", color: "#0A2540" }}>
            Dar acceso a alguien
          </h2>
          <p style={{ margin: 0, fontSize: "0.83rem", color: "#475569", lineHeight: 1.6 }}>
            Los usuarios viven en Supabase Auth y el rol va en <code>app_metadata</code> del JWT,
            que solo se escribe con la clave de servicio. Por eso no hay un botón «crear usuario»
            aquí: se hace desde la terminal, con la clave del entorno, y queda fuera del alcance de
            cualquier sesión de la consola.
          </p>
          <pre
            style={{
              margin: "0.8rem 0 0",
              background: "#0A2540",
              color: "#E2E8F0",
              borderRadius: 10,
              padding: "0.8rem 1rem",
              fontSize: "0.78rem",
              overflowX: "auto"
            }}
          >
            {`pnpm --filter @evetev/evepay-admin auth:provision-admin \\
  --email persona@evetev.com --name "Nombre" --role ops`}
          </pre>
          <p style={{ margin: "0.6rem 0 0", fontSize: "0.75rem", color: "#94A3B8" }}>
            <code>--role</code> es <code>super_admin</code>, <code>ops</code> o{" "}
            <code>finanzas</code>. Sesión actual: <strong>{actor}</strong> · rol{" "}
            <code>{rol ?? "sin rol"}</code>.
          </p>
        </Tarjeta>
      </div>
    </>
  );
}
