import { Boton, Campo, Plegable, entrada, rejilla } from "@/components/formulario";
import { Aviso, TituloSeccion, Vacio } from "@/components/seccion";
import { trimestreActual } from "@/lib/db";
import { listarEquipo } from "@/lib/hub/equipo";
import { Check } from "lucide-react";
import {
  agregarLogroAccion,
  borrarLogroAccion,
  borrarMetaAccion,
  guardarMetaAccion,
  guardarMiembroAccion
} from "../acciones";

export const dynamic = "force-dynamic";

export default async function EquipoPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const trimestre =
    typeof params.t === "string" && /^\d{4}-Q[1-4]$/.test(params.t) ? params.t : trimestreActual();
  const equipo = await listarEquipo(trimestre);
  const colores = ["#4b3075", "#1D4ED8", "#15803D", "#B45309"];

  return (
    <>
      <TituloSeccion
        titulo="Equipo & metas"
        descripcion={`Quiénes somos, qué perseguimos y qué ya logramos · ${trimestre}`}
      />
      {typeof params.error === "string" && <Aviso tono="alerta">{params.error}</Aviso>}
      {equipo.length === 0 ? (
        <Vacio>Todavía no hay personas registradas. Agrega la primera abajo.</Vacio>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))",
            gap: "1rem",
            marginBottom: "1.2rem"
          }}
        >
          {equipo.map((m) => (
            <article
              key={m.id}
              style={{
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 14,
                padding: "1.1rem 1.2rem",
                opacity: m.activo ? 1 : 0.6
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.8rem",
                  marginBottom: "0.9rem"
                }}
              >
                <div
                  aria-hidden
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: "#0A2540",
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800
                  }}
                >
                  {m.iniciales}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{m.nombre}</div>
                  <div style={{ fontSize: "0.76rem", color: "#64748B" }}>
                    {m.rol} · {m.email}
                  </div>
                </div>
              </div>
              {m.metas.length === 0 && (
                <p style={{ margin: "0 0 0.6rem", fontSize: "0.78rem", color: "#94A3B8" }}>
                  Sin metas este trimestre.
                </p>
              )}
              {m.metas.map((g, i) => (
                <div key={g.id} style={{ margin: "0.6rem 0" }}>
                  <form
                    action={guardarMetaAccion}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.8rem",
                      marginBottom: 4
                    }}
                  >
                    <input type="hidden" name="id" value={g.id} />
                    <input type="hidden" name="miembroId" value={m.id} />
                    <input type="hidden" name="titulo" value={g.titulo} />
                    <input type="hidden" name="trimestre" value={g.trimestre} />
                    <span style={{ flex: 1 }}>{g.titulo}</span>
                    <input
                      name="avance"
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={g.avance}
                      style={{
                        width: 52,
                        border: "1px solid #E2E8F0",
                        borderRadius: 6,
                        padding: "0.15rem 0.3rem",
                        fontSize: "0.76rem",
                        textAlign: "right"
                      }}
                    />
                    <span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>%</span>
                    <button
                      type="submit"
                      style={{
                        border: "1px solid #E2E8F0",
                        background: "#fff",
                        borderRadius: 6,
                        fontSize: "0.7rem",
                        padding: "0.15rem 0.45rem",
                        cursor: "pointer"
                      }}
                    >
                      ok
                    </button>
                  </form>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div
                      style={{
                        flex: 1,
                        height: 7,
                        borderRadius: 4,
                        background: "#ECEAE2",
                        overflow: "hidden"
                      }}
                    >
                      <div
                        style={{
                          width: `${g.avance}%`,
                          height: "100%",
                          background: colores[i % colores.length],
                          borderRadius: 4
                        }}
                      />
                    </div>
                    <form action={borrarMetaAccion}>
                      <input type="hidden" name="id" value={g.id} />
                      <button
                        type="submit"
                        title="Quitar meta"
                        style={{
                          border: "none",
                          background: "none",
                          color: "#CBD5E1",
                          cursor: "pointer"
                        }}
                      >
                        ×
                      </button>
                    </form>
                  </div>
                </div>
              ))}
              <form
                action={guardarMetaAccion}
                style={{ display: "flex", gap: "0.4rem", marginTop: "0.6rem" }}
              >
                <input type="hidden" name="miembroId" value={m.id} />
                <input type="hidden" name="trimestre" value={trimestre} />
                <input type="hidden" name="avance" value="0" />
                <input
                  name="titulo"
                  placeholder="Nueva meta del trimestre"
                  required
                  style={{ ...entrada, flex: 1 }}
                />
                <Boton secundario>+</Boton>
              </form>
              <div
                style={{
                  marginTop: "0.9rem",
                  paddingTop: "0.8rem",
                  borderTop: "1px solid #F1F5F9"
                }}
              >
                <div
                  style={{
                    fontSize: "0.66rem",
                    fontWeight: 700,
                    color: "#94A3B8",
                    letterSpacing: "0.06em",
                    marginBottom: "0.4rem"
                  }}
                >
                  LOGROS DEL TRIMESTRE
                </div>
                {m.logros.length === 0 && (
                  <div style={{ fontSize: "0.78rem", color: "#94A3B8" }}>Aún sin registrar</div>
                )}
                {m.logros.map((l) => (
                  <div
                    key={l.id}
                    style={{
                      display: "flex",
                      gap: "0.45rem",
                      alignItems: "center",
                      fontSize: "0.8rem",
                      color: "#475569",
                      margin: "0.25rem 0"
                    }}
                  >
                    <Check size={13} color="#15803D" />
                    <span style={{ flex: 1 }}>{l.texto}</span>
                    <form action={borrarLogroAccion}>
                      <input type="hidden" name="id" value={l.id} />
                      <button
                        type="submit"
                        title="Quitar"
                        style={{
                          border: "none",
                          background: "none",
                          color: "#CBD5E1",
                          cursor: "pointer"
                        }}
                      >
                        ×
                      </button>
                    </form>
                  </div>
                ))}
                <form
                  action={agregarLogroAccion}
                  style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem" }}
                >
                  <input type="hidden" name="miembroId" value={m.id} />
                  <input type="hidden" name="trimestre" value={trimestre} />
                  <input
                    name="texto"
                    placeholder="Un logro concreto"
                    required
                    style={{ ...entrada, flex: 1 }}
                  />
                  <Boton secundario>+</Boton>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
      <Plegable titulo="+ Agregar a alguien del equipo">
        <form action={guardarMiembroAccion} style={rejilla}>
          <Campo etiqueta="Correo (Google)">
            <input name="email" type="email" required style={entrada} />
          </Campo>
          <Campo etiqueta="Nombre">
            <input name="nombre" required style={entrada} />
          </Campo>
          <Campo etiqueta="Qué hace">
            <input name="rol" required placeholder="Founder · Producto & Pagos" style={entrada} />
          </Campo>
          <Campo etiqueta="Iniciales">
            <input name="iniciales" maxLength={3} style={entrada} />
          </Campo>
          <Boton>Guardar</Boton>
        </form>
      </Plegable>
    </>
  );
}
