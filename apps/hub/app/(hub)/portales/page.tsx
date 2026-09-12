import { Boton, Campo, Plegable, entrada, rejilla } from "@/components/formulario";
import { Aviso, Chip, TituloSeccion, Vacio } from "@/components/seccion";
import { listarPortales } from "@/lib/hub/portales";
import { ExternalLink } from "lucide-react";
import { borrarPortalAccion, guardarPortalAccion } from "../acciones";

export const dynamic = "force-dynamic";

const TONO = { operando: "ok", beta: "ambar", inactivo: "gris" } as const;

export default async function PortalesPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { error } = await searchParams;
  const portales = await listarPortales();
  return (
    <>
      <TituloSeccion
        titulo="Portales & accesos"
        descripcion="Todos los sistemas de Evetev en un solo lugar."
      />
      <Aviso>
        Esta es la <strong>intranet</strong>: el índice de todo lo que existe. No duplica datos;
        cada tarjeta abre el portal real. El «un solo lado» de <strong>datos</strong> vive en
        Clientes y Finanzas; el de <strong>accesos</strong> vive aquí.
      </Aviso>
      {typeof error === "string" && <Aviso tono="alerta">{error}</Aviso>}
      {portales.length === 0 ? (
        <Vacio>Sin portales registrados.</Vacio>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "0.9rem",
            marginBottom: "1.2rem"
          }}
        >
          {portales.map((p) => (
            <article
              key={p.id}
              style={{
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 14,
                padding: "1rem 1.1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                <div
                  aria-hidden
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: p.color,
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    flexShrink: 0
                  }}
                >
                  {p.nombre[0]?.toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#0A2540" }}>
                    {p.nombre}
                  </div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "#94A3B8",
                      fontFamily: "ui-monospace, Menlo, monospace",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {p.url.replace(/^https?:\/\//, "")}
                  </div>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#475569", flex: 1 }}>
                {p.descripcion}
              </p>
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}
              >
                <Chip tono={TONO[p.estado]}>{p.estado}</Chip>
                {p.rolAcceso && (
                  <span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>rol: {p.rolAcceso}</span>
                )}
                <span style={{ flex: 1 }} />
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    border: "1px solid #E2E8F0",
                    borderRadius: 8,
                    padding: "0.3rem 0.7rem",
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    color: "#0A2540",
                    textDecoration: "none"
                  }}
                >
                  Abrir <ExternalLink size={12} />
                </a>
                <form action={borrarPortalAccion}>
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    title="Quitar"
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#94A3B8",
                      cursor: "pointer",
                      fontSize: "0.76rem"
                    }}
                  >
                    quitar
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
      <Plegable titulo="+ Agregar un portal">
        <form action={guardarPortalAccion} style={rejilla}>
          <Campo etiqueta="Nombre">
            <input name="nombre" required style={entrada} />
          </Campo>
          <Campo etiqueta="URL">
            <input name="url" type="url" required placeholder="https://" style={entrada} />
          </Campo>
          <Campo etiqueta="Descripción">
            <input name="descripcion" style={entrada} />
          </Campo>
          <Campo etiqueta="Estado">
            <select name="estado" defaultValue="operando" style={entrada}>
              <option value="operando">operando</option>
              <option value="beta">beta</option>
              <option value="inactivo">inactivo</option>
            </select>
          </Campo>
          <Campo etiqueta="Rol con que se entra">
            <input name="rolAcceso" placeholder="admin" style={entrada} />
          </Campo>
          <Campo etiqueta="Color">
            <input
              name="color"
              type="color"
              defaultValue="#0A2540"
              style={{ ...entrada, padding: 2, height: 36 }}
            />
          </Campo>
          <Campo etiqueta="Orden">
            <input name="orden" type="number" defaultValue={100} style={entrada} />
          </Campo>
          <Boton>Guardar</Boton>
        </form>
      </Plegable>
    </>
  );
}
