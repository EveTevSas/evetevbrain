import { Aviso, PRODUCTOS, TituloSeccion } from "@/components/seccion";
import { formatoMonto, pct } from "@/lib/formato";
import { rollupDelMes } from "@/lib/hub/rollups";
import { listarPortales } from "@/lib/hub/portales";

export const dynamic = "force-dynamic";

export default async function ProductosPage() {
  const [r, portales] = await Promise.all([rollupDelMes(), listarPortales()]);
  const e = r.evepay;
  const consola = portales.find((p) => p.nombre.toLowerCase().includes("evepay"));

  const tarjetas = [
    {
      k: "evepay" as const,
      datos: e
        ? [
            ["Tipo de ingreso", "Procesamiento"],
            ["Comercios activos", String(e.comerciosActivos)],
            ["Procesado (mes)", formatoMonto(e.volumenMesMinor)],
            ["Comisión (mes)", formatoMonto(e.comisionMesMinor)],
            ["Aprobación", e.aprobacionMesPct != null ? `${e.aprobacionMesPct} %` : "—"],
            [
              "Margen tras proveedor",
              `${formatoMonto(e.margenMesMinor)} · ${pct(e.margenMesMinor, e.comisionMesMinor)}`
            ]
          ]
        : [
            ["Tipo de ingreso", "Procesamiento"],
            ["Estado", "sin respuesta de la API"]
          ],
      nota: e
        ? `Por pagar a comercios ${formatoMonto(e.porPagarMinor)} · retenido ${formatoMonto(e.retenidoMinor)} · en recaudo ${formatoMonto(e.enRecaudoMinor)}`
        : null,
      enlace: consola?.url ?? process.env.NEXT_PUBLIC_EVEPAY_ADMIN_URL ?? "http://localhost:3004"
    },
    {
      k: "eveconecta" as const,
      datos: [
        ["Tipo de ingreso", "MRR + procesamiento vía EvePay"],
        ["Suscriptores", String(r.mrr.eveconecta.suscriptores)],
        ["MRR (mes)", formatoMonto(r.mrr.eveconecta.mrrMinor)]
      ],
      nota: "El MRR sale de los enlaces registrados en Clientes; el procesamiento de sus conjuntos ya está dentro de EvePay.",
      enlace: "https://conecta.evetev.com"
    },
    {
      k: "eveledger" as const,
      datos: [
        ["Tipo de ingreso", "MRR + procesamiento"],
        ["Estaciones", String(r.mrr.eveledger.suscriptores)],
        ["MRR (mes)", formatoMonto(r.mrr.eveledger.mrrMinor)]
      ],
      nota: "MVP con cliente; la mensualidad se registra en Clientes hasta que el producto la exponga por API.",
      enlace: portales.find((p) => p.nombre.toLowerCase().includes("ledger"))?.url ?? "#"
    }
  ];

  return (
    <>
      <TituloSeccion
        titulo="Productos"
        descripcion="Las líneas de negocio de Evetev · cada una consume EvePay para pagos."
      />
      <Aviso>
        Las cifras de EvePay llegan por su API con tu propio usuario; las mensualidades son las que
        registra el Hub en <strong>Clientes</strong>. Nada se inventa: lo que no existe, no aparece.
      </Aviso>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
          gap: "1rem"
        }}
      >
        {tarjetas.map((t) => (
          <article
            key={t.k}
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderLeft: `4px solid ${PRODUCTOS[t.k].color}`,
              borderRadius: 14,
              padding: "1.1rem 1.2rem"
            }}
          >
            <div
              style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", flexWrap: "wrap" }}
            >
              <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#0A2540" }}>
                {PRODUCTOS[t.k].nombre}
              </h2>
              <a
                href={t.enlace}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "0.74rem",
                  color: "#4b3075",
                  fontWeight: 700,
                  marginLeft: "auto"
                }}
              >
                Abrir ↗
              </a>
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: 2 }}>
              {PRODUCTOS[t.k].rol}
            </div>
            <dl
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "0.7rem 1rem",
                margin: "1rem 0 0"
              }}
            >
              {t.datos.map(([k, v]) => (
                <div key={k}>
                  <dt style={{ fontSize: "0.68rem", color: "#94A3B8" }}>{k}</dt>
                  <dd
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      color: "#0A2540",
                      fontVariantNumeric: "tabular-nums"
                    }}
                  >
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
            {t.nota && (
              <p
                style={{
                  margin: "0.9rem 0 0",
                  fontSize: "0.74rem",
                  color: "#94A3B8",
                  lineHeight: 1.5
                }}
              >
                {t.nota}
              </p>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
