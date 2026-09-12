import { Aviso, Tarjeta, TituloSeccion } from "@/components/seccion";
import { ultimosRastros } from "@/lib/hub/auditoria";

export const dynamic = "force-dynamic";

const REPO = "https://github.com/EveTev/EveTevBrain/blob/main/MonoRepo";
const DOCS = [
  [
    "Constitución de ingeniería",
    "docs/ESTANDARES_INGENIERIA.md",
    "La fuente de verdad: cómo se construye en Evetev."
  ],
  [
    "Plan de desarrollo de EvePay",
    "docs/PLAN_DESARROLLO_EVEPAY.md",
    "Modelo de fondos, fases y lista maestra de specs."
  ],
  ["Bitácora de EvePay", "docs/BITACORA_EVEPAY.md", "Qué se hizo y decidió en cada sesión."],
  [
    "Arquitectura del Hub",
    "docs/ARQUITECTURA_HUB_EVETEV.md",
    "Qué posee el Hub, qué consume y la Cuenta canónica."
  ],
  ["Despliegue", "docs/DESPLIEGUE.md", "Paso a paso por app."],
  [
    "Infraestructura y cuentas",
    "docs/INFRAESTRUCTURA_Y_CUENTAS.md",
    "Servicios, quién es dueño de qué."
  ],
  ["Specs (SDD)", "specs/README.md", "Cada feature con criterios EARS."]
] as const;

export default async function DocsPage() {
  const rastros = await ultimosRastros(20);
  return (
    <>
      <TituloSeccion
        titulo="Documentos"
        descripcion="Constitución, arquitectura, specs y contratos. Enlaza al repo; no los duplica."
      />
      <Aviso>
        Los documentos viven junto al código y se versionan con él. Aquí solo el índice y, abajo,
        qué ha cambiado en el Hub (auditoría).
      </Aviso>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "0.9rem",
          marginBottom: "1.2rem"
        }}
      >
        {DOCS.map(([t, ruta, d]) => (
          <a
            key={ruta}
            href={`${REPO}/${ruta}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              padding: "0.9rem 1rem",
              textDecoration: "none",
              color: "#0A2540"
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{t}</div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "#94A3B8",
                fontFamily: "ui-monospace, Menlo, monospace",
                margin: "0.2rem 0 0.4rem"
              }}
            >
              {ruta}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#475569" }}>{d}</div>
          </a>
        ))}
      </div>
      <Tarjeta titulo="Últimos cambios en el Hub" sinRelleno>
        {rastros.length === 0 ? (
          <p style={{ margin: 0, padding: "1.2rem", fontSize: "0.85rem", color: "#64748B" }}>
            Nada todavía.
          </p>
        ) : (
          <div>
            {rastros.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  gap: "0.8rem",
                  padding: "0.6rem 1.2rem",
                  borderBottom: "1px solid #F1F5F9",
                  fontSize: "0.8rem",
                  alignItems: "baseline",
                  flexWrap: "wrap"
                }}
              >
                <span style={{ color: "#94A3B8", fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                  {new Date(r.creadaEn).toLocaleString("es-CO")}
                </span>
                <code style={{ fontSize: "0.74rem", color: "#4b3075" }}>{r.accion}</code>
                <span style={{ color: "#475569" }}>{r.actor}</span>
                <span
                  style={{
                    color: "#94A3B8",
                    fontSize: "0.72rem",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  {JSON.stringify(r.detalle)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Tarjeta>
    </>
  );
}
