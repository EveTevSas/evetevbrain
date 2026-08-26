import { dashboardMensual } from "@/lib/dashboard";
import { formatoGalones } from "@/lib/format";
import { IconoAlerta, IconoError, IconoExito } from "@/components/iconos";

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

/* Azules funcionales de marca (§2): la torta no usa semánticos ni coral (C2). */
const COLORES_TORTA = ["#144a96", "#1e6feb", "#0a2540", "#3baec2", "#64748b"];

function pesosCorto(n: number): string {
  return n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  });
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  const sp = await searchParams;
  const ahora = new Date();
  const anio = Number(sp.anio) || ahora.getUTCFullYear();
  const mes = Number(sp.mes) || ahora.getUTCMonth() + 1;

  const data = await dashboardMensual(anio, mes);
  const anios = [anio - 2, anio - 1, anio, anio + 1];

  const totalTorta = data.mediosPago.reduce((acc, s) => acc + s.valor, 0);
  const porcentajes = data.mediosPago.map((s) =>
    totalTorta > 0 ? (s.valor / totalTorta) * 100 : 0
  );
  // El desfase de cada segmento es el arranque (25 = las 12 en punto) menos lo
  // que ya ocupan los anteriores. Se deriva en vez de acumularse en una
  // variable porque el cuerpo de un render no puede reasignar
  // (react-hooks/immutability).
  const segmentos = data.mediosPago.map((s, i) => ({
    ...s,
    pct: porcentajes[i],
    offset: 25 - porcentajes.slice(0, i).reduce((acc, p) => acc + p, 0),
    color: COLORES_TORTA[i % COLORES_TORTA.length]
  }));

  const maxGalones = Math.max(...data.galonesPorProducto.map((p) => p.galones), 0);

  const kpis = [
    { etiqueta: "Ventas del mes", valor: pesosCorto(data.kpis.ventasMes), alerta: false },
    {
      etiqueta: "Utilidad bruta",
      valor: data.kpis.utilidadBruta !== null ? pesosCorto(data.kpis.utilidadBruta) : "—",
      alerta: false
    },
    { etiqueta: "Total cartera", valor: pesosCorto(data.kpis.totalCartera), alerta: false },
    {
      etiqueta: "Cartera vencida (>90d)",
      valor: pesosCorto(data.kpis.carteraVencida),
      alerta: data.kpis.carteraVencida > 0
    },
    { etiqueta: "Transportadora", valor: pesosCorto(data.kpis.transportadora), alerta: false },
    { etiqueta: "Faltantes netos", valor: pesosCorto(data.kpis.faltantesNetos), alerta: false }
  ];

  return (
    <div className="space-y-6">
      <h1>Dashboard</h1>

      <form method="get" className="card flex flex-wrap items-end gap-4 p-4 sm:p-6">
        <div>
          <label htmlFor="mes" className="lbl">
            Mes
          </label>
          <select id="mes" name="mes" defaultValue={mes} className="inp">
            {MESES.map((m, i) => (
              <option key={i + 1} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="anio" className="lbl">
            Año
          </label>
          <select id="anio" name="anio" defaultValue={anio} className="inp">
            {anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        {/* Acción secundaria (mezclado): vista de reporte, sin CTA coral */}
        <button type="submit" className="btn btn-sec">
          Ver
        </button>
      </form>

      <p className="text-sm text-eve-pizarra">
        {MESES[mes - 1]} de {anio} — reporte de solo lectura derivado de los cierres, inventarios,
        cartera y financiero.
      </p>

      {/* KPIs: cifra protagonista en Baloo 2 700 (§3) */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.etiqueta} className="card p-4">
            <p className="text-xs text-eve-pizarra">{k.etiqueta}</p>
            <p className={`cifra mt-1 text-lg ${k.alerta ? "text-eve-error" : ""}`}>
              {k.alerta && <IconoError className="mr-1 inline h-4 w-4" aria-hidden="true" />}
              {k.valor}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Torta: medios de pago del mes */}
        <section className="card p-4 sm:p-6">
          <h2 className="mb-4">Medios de pago del mes</h2>
          {segmentos.length === 0 ? (
            <p className="text-sm text-eve-pizarra">Sin ventas cerradas este mes.</p>
          ) : (
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <svg
                viewBox="0 0 42 42"
                className="h-44 w-44 shrink-0"
                role="img"
                aria-label="Distribución de las ventas del mes por medio de pago"
              >
                <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#edf3fa" strokeWidth="7" />
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
              </svg>
              {/* Leyenda: swatch + nombre + valor (nunca solo color, §8) */}
              <ul className="w-full space-y-2 text-sm">
                {segmentos.map((s) => (
                  <li key={s.clave} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ background: s.color }}
                        aria-hidden="true"
                      />
                      {s.etiqueta}
                    </span>
                    <span className="tabular-nums text-eve-pizarra">
                      {pesosCorto(s.valor)} ({Math.round(s.pct)}%)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Barras: galones por producto (mezclado para gráficos, §6) */}
        <section className="card p-4 sm:p-6">
          <h2 className="mb-4">Galones por producto</h2>
          {data.galonesPorProducto.length === 0 ? (
            <p className="text-sm text-eve-pizarra">Sin ventas cerradas este mes.</p>
          ) : (
            <ul className="space-y-4">
              {data.galonesPorProducto.map((p) => (
                <li key={p.nombre}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium">{p.nombre}</span>
                    <span className="tabular-nums text-eve-pizarra">
                      {formatoGalones(p.galones)} gal
                    </span>
                  </div>
                  <div
                    className="h-3 w-full rounded-full bg-eve-tinte"
                    role="img"
                    aria-label={`${p.nombre}: ${formatoGalones(p.galones)} galones`}
                  >
                    <div
                      className="h-3 rounded-full bg-eve-mezclado"
                      style={{ width: `${maxGalones > 0 ? (p.galones / maxGalones) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Alertas: ícono + texto (C5) */}
      <section className="card p-4 sm:p-6">
        <h2 className="mb-4">Alertas del mes</h2>
        {data.alertas.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-eve-exito">
            <IconoExito className="h-4 w-4 shrink-0" />
            Sin alertas este mes.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.alertas.map((a, i) => (
              <li
                key={i}
                className={`flex items-center gap-2 rounded-[9px] px-3 py-2 ${
                  a.tipo === "cartera"
                    ? "bg-eve-error/10 text-eve-error"
                    : "bg-eve-alerta/10 text-eve-alerta"
                }`}
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
    </div>
  );
}
