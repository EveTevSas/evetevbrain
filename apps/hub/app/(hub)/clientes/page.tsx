import { Boton, Campo, Plegable, entrada, rejilla } from "@/components/formulario";
import {
  Aviso,
  Chip,
  PRODUCTOS,
  Tarjeta,
  TituloSeccion,
  Vacio,
  celda,
  encabezado
} from "@/components/seccion";
import { comerciosEvepay } from "@/lib/evepay";
import { formatoMonto } from "@/lib/formato";
import { listarCuentas } from "@/lib/hub/cuentas";
import {
  borrarEnlaceAccion,
  cambiarEstadoCuentaAccion,
  crearCuentaAccion,
  enlazarProductoAccion
} from "../acciones";

export const dynamic = "force-dynamic";

const TONO_ESTADO = {
  onboarding: "ambar",
  activa: "ok",
  suspendida: "rojo",
  cerrada: "gris"
} as const;

export default async function ClientesPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { error } = await searchParams;
  const [cuentas, comercios] = await Promise.all([listarCuentas(), comerciosEvepay()]);
  const nombreTenant = new Map((comercios ?? []).map((c) => [c.tenantId, c.displayName]));
  const mrrDe = (c: (typeof cuentas)[number]) =>
    c.enlaces.reduce(
      (s, e) => s + (e.suscripcion?.estado === "activa" ? e.suscripcion.mrrMinor : 0),
      0
    );

  return (
    <>
      <TituloSeccion
        titulo="Clientes (unificado)"
        descripcion="Una cuenta = un cliente, aunque use varios productos."
      />
      <Aviso>
        La gasolinera aparece <strong>una sola vez</strong> aunque pague mensualidad (EveLedger){" "}
        <strong>y</strong> procese pagos (EvePay). La entidad <strong>Cuenta</strong> une sus
        facetas por NIT; EvePay sigue siendo dueño del comercio y aquí solo se referencia por id.
      </Aviso>
      {typeof error === "string" && <Aviso tono="alerta">{error}</Aviso>}
      <div style={{ display: "grid", gap: "1rem" }}>
        <Tarjeta sinRelleno>
          {cuentas.length === 0 ? (
            <div style={{ padding: "1.2rem" }}>
              <Vacio>Todavía no hay cuentas. Crea la primera abajo.</Vacio>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
                <thead>
                  <tr>
                    <th style={encabezado}>Cuenta</th>
                    <th style={encabezado}>Productos que usa</th>
                    <th style={{ ...encabezado, textAlign: "right" }}>MRR</th>
                    <th style={encabezado}>Comercio en EvePay</th>
                    <th style={encabezado}>Estado</th>
                    <th style={encabezado}></th>
                  </tr>
                </thead>
                <tbody>
                  {cuentas.map((c) => (
                    <tr key={c.id}>
                      <td style={celda}>
                        <div style={{ fontWeight: 700 }}>{c.nombreLegal}</div>
                        <div style={{ fontSize: "0.72rem", color: "#94A3B8" }}>
                          NIT {c.nit}
                          {c.ciudad ? ` · ${c.ciudad}` : ""}
                        </div>
                      </td>
                      <td style={celda}>
                        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                          {c.enlaces.length === 0 && (
                            <span style={{ color: "#94A3B8", fontSize: "0.76rem" }}>
                              sin productos
                            </span>
                          )}
                          {c.enlaces.map((e) => (
                            <form
                              key={e.id}
                              action={borrarEnlaceAccion}
                              style={{ display: "inline-flex", alignItems: "center", gap: 2 }}
                            >
                              <input type="hidden" name="id" value={e.id} />
                              <Chip tono={PRODUCTOS[e.producto].tono} punto>
                                {PRODUCTOS[e.producto].nombre}
                                {e.suscripcion ? ` · ${e.suscripcion.estado}` : ""}
                              </Chip>
                              <button
                                type="submit"
                                title="Quitar enlace"
                                style={{
                                  border: "none",
                                  background: "none",
                                  color: "#CBD5E1",
                                  cursor: "pointer",
                                  fontSize: "0.7rem"
                                }}
                              >
                                ×
                              </button>
                            </form>
                          ))}
                        </div>
                      </td>
                      <td
                        style={{
                          ...celda,
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          color: mrrDe(c) ? "#0A2540" : "#94A3B8"
                        }}
                      >
                        {mrrDe(c) ? formatoMonto(mrrDe(c)) : "—"}
                      </td>
                      <td style={{ ...celda, fontSize: "0.78rem", color: "#475569" }}>
                        {[...new Set(c.enlaces.map((e) => e.evepayTenantId).filter(Boolean))].map(
                          (t) => (
                            <div key={t}>{nombreTenant.get(t!) ?? `${t!.slice(0, 8)}…`}</div>
                          )
                        )}
                        {!c.enlaces.some((e) => e.evepayTenantId) && (
                          <span style={{ color: "#94A3B8" }}>no procesa</span>
                        )}
                      </td>
                      <td style={celda}>
                        <form
                          action={cambiarEstadoCuentaAccion}
                          style={{ display: "inline-flex", gap: "0.3rem", alignItems: "center" }}
                        >
                          <input type="hidden" name="id" value={c.id} />
                          <Chip tono={TONO_ESTADO[c.estado]} punto>
                            {c.estado}
                          </Chip>
                          <select
                            name="estado"
                            defaultValue={c.estado}
                            style={{
                              ...entrada,
                              width: "auto",
                              padding: "0.2rem 0.4rem",
                              fontSize: "0.72rem"
                            }}
                          >
                            {(["onboarding", "activa", "suspendida", "cerrada"] as const).map(
                              (s) => (
                                <option key={s}>{s}</option>
                              )
                            )}
                          </select>
                          <button
                            type="submit"
                            style={{
                              border: "1px solid #E2E8F0",
                              background: "#fff",
                              borderRadius: 6,
                              fontSize: "0.7rem",
                              padding: "0.2rem 0.5rem",
                              cursor: "pointer"
                            }}
                          >
                            ok
                          </button>
                        </form>
                      </td>
                      <td style={celda}></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))",
            gap: "1rem"
          }}
        >
          <Plegable titulo="+ Nueva cuenta (o reusar por NIT)">
            <form action={crearCuentaAccion} style={rejilla}>
              <Campo etiqueta="NIT (sin puntos ni DV)">
                <input name="nit" required inputMode="numeric" style={entrada} />
              </Campo>
              <Campo etiqueta="Razón social">
                <input name="nombreLegal" required style={entrada} />
              </Campo>
              <Campo etiqueta="Ciudad">
                <input name="ciudad" style={entrada} />
              </Campo>
              <Boton>Guardar</Boton>
            </form>
          </Plegable>
          <Plegable titulo="+ Enlazar un producto a una cuenta">
            <form action={enlazarProductoAccion} style={rejilla}>
              <Campo etiqueta="Cuenta">
                <select name="cuentaId" required style={entrada}>
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombreLegal}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo etiqueta="Producto">
                <select name="producto" required style={entrada}>
                  <option value="eveledger">EveLedger</option>
                  <option value="eveconecta">EveConecta</option>
                  <option value="evepay">EvePay (solo pagos)</option>
                </select>
              </Campo>
              <Campo etiqueta="Mensualidad" ayuda="Vacío si el producto no cobra mensualidad">
                <select name="suscripcionEstado" defaultValue="" style={entrada}>
                  <option value="">— sin mensualidad —</option>
                  <option value="activa">activa</option>
                  <option value="morosa">morosa</option>
                  <option value="cancelada">cancelada</option>
                </select>
              </Campo>
              <Campo etiqueta="MRR (COP)">
                <input name="mrr" inputMode="numeric" placeholder="0" style={entrada} />
              </Campo>
              <Campo
                etiqueta="Comercio en EvePay"
                ayuda={
                  comercios
                    ? "Referencia por id; EvePay no se entera"
                    : "EvePay no respondió: se puede enlazar después"
                }
              >
                <select name="evepayTenantId" defaultValue="" style={entrada}>
                  <option value="">— no procesa pagos —</option>
                  {(comercios ?? []).map((c) => (
                    <option key={c.tenantId} value={c.tenantId}>
                      {c.displayName}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo etiqueta="Por qué puerta entró">
                <select name="origen" defaultValue="directo" style={entrada}>
                  <option value="directo">directo</option>
                  <option value="eveconecta">eveconecta</option>
                  <option value="eveledger">eveledger</option>
                </select>
              </Campo>
              <Boton>Enlazar</Boton>
            </form>
          </Plegable>
        </div>
      </div>
    </>
  );
}
