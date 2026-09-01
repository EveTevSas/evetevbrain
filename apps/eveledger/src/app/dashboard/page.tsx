import { dashboardMensual } from "@/lib/dashboard";
import { formatoGalones } from "@/lib/format";
import { IconoAlerta, IconoError, IconoExito } from "@/components/iconos";
import { periodoPorDefecto } from "@/lib/periodo";

export const dynamic = "force-dynamic";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];

const COLORES_TORTA = ["#144a96", "#1e6feb", "#0a2540", "#3baec2", "#64748b"];

function pesosCorto(n: number) {
  if (n >= 1_000_000_000)
    return "$" + (n / 1_000_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 }) + "B";
  if (n >= 1_000_000)
    return "$" + (n / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 }) + "M";
  return n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  });
}

function pesosFull(n: number) {
  return n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  });
}

/* ── Iconos KPI ─────────────────────────────────────────── */
function IcoVentas() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
function IcoUtilidad() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
function IcoCartera() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  );
}
function IcoAlertaCartera() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function IcoTransporte() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}
function IcoFaltantes() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  const sp = await searchParams;
  const porDefecto = await periodoPorDefecto();
  const anio = Number(sp.anio) || porDefecto.anio;
  const mes = Number(sp.mes) || porDefecto.mes;

  const data = await dashboardMensual(anio, mes);
  const anios = [anio - 2, anio - 1, anio, anio + 1];

  const totalTorta = data.mediosPago.reduce((a, s) => a + s.valor, 0);
  const porcentajes = data.mediosPago.map((s) =>
    totalTorta > 0 ? (s.valor / totalTorta) * 100 : 0
  );
  const segmentos = data.mediosPago.map((s, i) => ({
    ...s,
    pct: porcentajes[i],
    offset: 25 - porcentajes.slice(0, i).reduce((a, p) => a + p, 0),
    color: COLORES_TORTA[i % COLORES_TORTA.length]
  }));

  const maxGalones = Math.max(...data.galonesPorProducto.map((p) => p.galones), 1);

  const kpis = [
    {
      etiqueta: "Ventas del mes",
      valor: pesosCorto(data.kpis.ventasMes),
      full: pesosFull(data.kpis.ventasMes),
      Ico: IcoVentas,
      iconBg: "#FEF2F2",
      iconColor: "#EE3D22",
      alerta: false
    },
    {
      etiqueta: "Utilidad bruta",
      valor: data.kpis.utilidadBruta !== null ? pesosCorto(data.kpis.utilidadBruta) : "—",
      full: data.kpis.utilidadBruta !== null ? pesosFull(data.kpis.utilidadBruta) : "Sin costos",
      Ico: IcoUtilidad,
      iconBg: "#F0FDF4",
      iconColor: "#16A34A",
      alerta: false
    },
    {
      etiqueta: "Total cartera",
      valor: pesosCorto(data.kpis.totalCartera),
      full: pesosFull(data.kpis.totalCartera),
      Ico: IcoCartera,
      iconBg: "#f3eeff",
      iconColor: "#4b3075",
      alerta: false
    },
    {
      etiqueta: "Cartera vencida",
      valor: pesosCorto(data.kpis.carteraVencida),
      full: pesosFull(data.kpis.carteraVencida),
      Ico: IcoAlertaCartera,
      iconBg: data.kpis.carteraVencida > 0 ? "#FEF2F2" : "#F0FDF4",
      iconColor: data.kpis.carteraVencida > 0 ? "#B91C1C" : "#16A34A",
      alerta: data.kpis.carteraVencida > 0
    },
    {
      etiqueta: "Transportadora",
      valor: pesosCorto(data.kpis.transportadora),
      full: pesosFull(data.kpis.transportadora),
      Ico: IcoTransporte,
      iconBg: "#F5F3FF",
      iconColor: "#7C3AED",
      alerta: false
    },
    {
      etiqueta: "Faltante isleros",
      valor: pesosCorto(data.kpis.faltantesNetos),
      full: pesosFull(data.kpis.faltantesNetos),
      Ico: IcoFaltantes,
      iconBg: data.kpis.faltantesNetos > 0 ? "#FEF3C7" : "#F0FDF4",
      iconColor: data.kpis.faltantesNetos > 0 ? "#D97706" : "#16A34A",
      alerta: data.kpis.faltantesNetos > 0
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* ── Encabezado con selector de mes ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 0.2rem",
              fontSize: "0.68rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#4b3075"
            }}
          >
            Resumen mensual
          </p>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#64748B" }}>
            {MESES[mes - 1]} {anio} · solo lectura derivado de cierres, cartera y financiero
          </p>
        </div>

        {/* Selector mes/año */}
        <form
          method="get"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "#fff",
            border: "1px solid #EDF3FA",
            borderRadius: 12,
            padding: "0.5rem 0.75rem"
          }}
        >
          <select
            name="mes"
            defaultValue={mes}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "0.85rem",
              fontWeight: 500,
              color: "#0A2540",
              cursor: "pointer",
              outline: "none"
            }}
          >
            {MESES.map((m, i) => (
              <option key={i + 1} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            name="anio"
            defaultValue={anio}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "0.85rem",
              fontWeight: 500,
              color: "#0A2540",
              cursor: "pointer",
              outline: "none"
            }}
          >
            {anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button
            type="submit"
            style={{
              background: "#0A2540",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "0.35rem 0.875rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Ver
          </button>
        </form>
      </div>

      {/* ── KPIs ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1rem"
        }}
      >
        {kpis.map(({ etiqueta, valor, full, iconColor, alerta }) => (
          <div
            key={etiqueta}
            style={{
              background: "#fff",
              border: "1px solid #EDF3FA",
              borderTop: `3px solid ${iconColor}`,
              borderRadius: 14,
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              boxShadow: "0 1px 4px rgba(10,37,64,.04)"
            }}
          >
            <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 600, color: "#334155" }}>
              {etiqueta}
            </p>
            <div>
              <p
                className="cifra"
                style={{
                  margin: 0,
                  fontSize: "clamp(1.4rem, 2vw, 1.8rem)",
                  color: alerta ? "#B91C1C" : "#0A2540",
                  lineHeight: 1.1
                }}
              >
                {valor}
              </p>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "#94A3B8" }}>{full}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Gráficas ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1rem"
        }}
      >
        {/* Torta medios de pago */}
        <section
          style={{
            background: "#fff",
            border: "1px solid #EDF3FA",
            borderRadius: 14,
            padding: "1.5rem",
            boxShadow: "0 1px 4px rgba(10,37,64,.04)"
          }}
        >
          <p
            style={{
              margin: "0 0 0.2rem",
              fontSize: "0.68rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#94A3B8"
            }}
          >
            Distribución
          </p>
          <h2 style={{ margin: "0 0 1.25rem", fontSize: "1rem" }}>Medios de pago</h2>

          {segmentos.length === 0 ? (
            <p style={{ fontSize: "0.875rem", color: "#64748B" }}>Sin ventas cerradas este mes.</p>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
              <svg
                viewBox="0 0 42 42"
                style={{ width: 160, height: 160, flexShrink: 0 }}
                role="img"
                aria-label="Distribución de medios de pago"
              >
                <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#EDF3FA" strokeWidth="7" />
                {segmentos.map((s) => (
                  <circle
                    key={s.clave}
                    cx="21"
                    cy="21"
                    r="15.9155"
                    fill="none"
                    stroke={s.color}
                    strokeWidth="7"
                    strokeDasharray={`${s.pct} ${100 - s.pct}`}
                    strokeDashoffset={s.offset}
                  />
                ))}
                {/* Centro */}
                <text
                  x="21"
                  y="19"
                  textAnchor="middle"
                  fontSize="3.5"
                  fontWeight="700"
                  fill="#0A2540"
                >
                  {Math.round(segmentos[0]?.pct ?? 0)}%
                </text>
                <text x="21" y="23.5" textAnchor="middle" fontSize="2.2" fill="#94A3B8">
                  {segmentos[0]?.etiqueta ?? ""}
                </text>
              </svg>

              <ul
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.625rem",
                  listStyle: "none",
                  margin: 0,
                  padding: 0
                }}
              >
                {segmentos.map((s) => (
                  <li
                    key={s.clave}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.75rem"
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.82rem",
                        color: "#0A2540"
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: s.color,
                          flexShrink: 0
                        }}
                      />
                      {s.etiqueta}
                    </span>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "#64748B",
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {pesosCorto(s.valor)} ·{" "}
                      <strong style={{ color: "#0A2540" }}>{Math.round(s.pct)}%</strong>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Barras galones por producto */}
        <section
          style={{
            background: "#fff",
            border: "1px solid #EDF3FA",
            borderRadius: 14,
            padding: "1.5rem",
            boxShadow: "0 1px 4px rgba(10,37,64,.04)"
          }}
        >
          <p
            style={{
              margin: "0 0 0.2rem",
              fontSize: "0.68rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#94A3B8"
            }}
          >
            Volumen
          </p>
          <h2 style={{ margin: "0 0 1.25rem", fontSize: "1rem" }}>Galones por producto</h2>

          {data.galonesPorProducto.length === 0 ? (
            <p style={{ fontSize: "0.875rem", color: "#64748B" }}>Sin ventas cerradas este mes.</p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem"
              }}
            >
              {data.galonesPorProducto.map((p) => {
                const pct = maxGalones > 0 ? (p.galones / maxGalones) * 100 : 0;
                return (
                  <li key={p.nombre}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: "0.375rem"
                      }}
                    >
                      <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#0A2540" }}>
                        {p.nombre}
                      </span>
                      <span className="cifra" style={{ fontSize: "0.9rem", color: "#64748B" }}>
                        {formatoGalones(p.galones)}{" "}
                        <span style={{ fontSize: "0.72rem", fontWeight: 400 }}>gal</span>
                      </span>
                    </div>
                    <div style={{ height: 10, background: "#EDF3FA", borderRadius: 999 }}>
                      <div
                        style={{
                          height: 10,
                          borderRadius: 999,
                          background: "linear-gradient(90deg, #0a2540, #4b3075)",
                          width: `${pct}%`,
                          transition: "width 0.4s ease"
                        }}
                      />
                    </div>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: "#94A3B8" }}>
                      {Math.round(pct)}% del producto líder
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* ── Alertas + Agente 50/50 ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1rem",
          alignItems: "stretch"
        }}
      >
        {/* Alertas */}
        <section
          style={{
            background: "#fff",
            border: "1px solid #EDF3FA",
            borderRadius: 14,
            padding: "1.5rem",
            boxShadow: "0 1px 4px rgba(10,37,64,.04)"
          }}
        >
          <p
            style={{
              margin: "0 0 0.2rem",
              fontSize: "0.68rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#94A3B8"
            }}
          >
            Monitoreo
          </p>
          <h2 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Alertas del mes</h2>

          {data.alertas.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                background: "#F0FDF4",
                border: "1px solid #bbf7d0",
                borderRadius: 10,
                padding: "0.75rem 1rem"
              }}
            >
              <IconoExito className="h-4 w-4 shrink-0 text-eve-exito" />
              <span style={{ fontSize: "0.875rem", color: "#16A34A", fontWeight: 500 }}>
                Sin alertas este mes. Todo en orden.
              </span>
            </div>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem"
              }}
            >
              {data.alertas.map((a, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.625rem",
                    background: a.tipo === "cartera" ? "#FEF2F2" : "#FEF3C7",
                    border: `1px solid ${a.tipo === "cartera" ? "#fecaca" : "#fde68a"}`,
                    borderRadius: 10,
                    padding: "0.75rem 1rem",
                    fontSize: "0.875rem",
                    color: a.tipo === "cartera" ? "#B91C1C" : "#92400E"
                  }}
                >
                  {a.tipo === "cartera" ? (
                    <IconoError className="h-4 w-4 shrink-0" />
                  ) : (
                    <IconoAlerta className="h-4 w-4 shrink-0" />
                  )}
                  {a.texto}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Agente sugerencias */}
        <section>
          <div
            style={{
              background: "linear-gradient(238deg, #00121d 0%, #1E65AE 100%)",
              borderRadius: 16,
              padding: "1.5rem",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {/* Grid texture sutil */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.07,
                backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
                pointerEvents: "none"
              }}
            />

            <div style={{ position: "relative", zIndex: 1 }}>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  marginBottom: "1rem"
                }}
              >
                {/* Mascota agente */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://raw.githubusercontent.com/EveTevSas/evetevbrain/refs/heads/main/packages/brand/assets/mascota/mascota-saludando.png"
                  alt="Agente EveLedger"
                  width={100}
                  height={100}
                  style={{ flexShrink: 0, objectFit: "contain" }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#fff" }}>
                    Agente EveLedger
                  </p>
                  <p style={{ margin: 0, fontSize: "0.65rem", color: "rgba(255,255,255,0.4)" }}>
                    Análisis automático · {MESES[mes - 1]} {anio}
                  </p>
                </div>
              </div>

              {/* Burbuja de sugerencia */}
              <div
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  padding: "1rem 1.25rem"
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.88rem",
                    color: "rgba(255,255,255,0.75)",
                    lineHeight: 1.7
                  }}
                >
                  <strong style={{ color: "#fff" }}>Tendencia de ventas:</strong> El volumen de
                  galones vendidos muestra una variación del mes. Revisa si hay días con cierres en
                  borrador que puedan afectar el consolidado final.
                  <br />
                  <br />
                  <strong style={{ color: "#fff" }}>Inventario:</strong> Si hay alertas de variación
                  activas, considera hacer un conteo físico de verificación antes del cierre de mes
                  para ajustar diferencias con la teórica acumulada.
                  <br />
                  <br />
                  <strong style={{ color: "#22d3ee" }}>Sugerencia:</strong> Los clientes con cartera
                  mayor a 90 días tienen mayor riesgo de incobrabilidad. Prioriza contacto directo
                  esta semana.
                </p>
              </div>

              {/* Pie */}
              <p
                style={{
                  margin: "0.75rem 0 0",
                  fontSize: "0.68rem",
                  color: "rgba(255,255,255,0.25)",
                  textAlign: "right"
                }}
              >
                El agente analizará tus datos reales y generará sugerencias personalizadas · Eve
                Intelligence
              </p>
            </div>
          </div>
        </section>
      </div>
      {/* fin grid alertas + agente */}
    </div>
  );
}
