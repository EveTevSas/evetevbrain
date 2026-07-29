"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Stats } from "@/lib/api";
import { getApiKey } from "@/lib/auth";

function fmt(minor: number, moneda = "COP") {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: moneda, maximumFractionDigits: 0
  }).format(minor / 100);
}

function StatCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 180 }}>
      <p style={{
        margin: "0 0 0.75rem", fontSize: "0.72rem", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--eve-muted)"
      }}>
        {label}
      </p>
      <p className="metric" style={{
        margin: "0 0 0.25rem",
        fontSize: "clamp(1.6rem,3vw,2.1rem)",
        color: accent ?? "var(--eve-azul-noche)"
      }}>
        {value}
      </p>
      {sub && (
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--eve-pizarra)" }}>{sub}</p>
      )}
    </div>
  );
}

type Range = "today" | "week" | "month" | "all";

function rangeToParam(r: Range) {
  const now  = new Date();
  const iso  = (d: Date) => d.toISOString();
  if (r === "all") return {};
  const desde = new Date(now);
  if (r === "today")       { desde.setHours(0, 0, 0, 0); }
  else if (r === "week")   { desde.setDate(now.getDate() - 7); }
  else /* month */         { desde.setDate(1); desde.setHours(0, 0, 0, 0); }
  return { desde: iso(desde), hasta: iso(now) };
}

const RANGES: { key: Range; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "week",  label: "7 días" },
  { key: "month", label: "Este mes" },
  { key: "all",   label: "Todo" }
];

export default function DashboardPage() {
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange]     = useState<Range>("month");

  useEffect(() => {
    const key = getApiKey();
    if (!key) return;
    setLoading(true);
    const { desde, hasta } = rangeToParam(range);
    api.pagos.stats(key, desde, hasta)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [range]);

  const aprobRate = stats && stats.total > 0
    ? Math.round((stats.aprobados / stats.total) * 100)
    : 0;

  return (
    <div>
      {/* Encabezado */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: "2rem",
        flexWrap: "wrap", gap: "1rem"
      }}>
        <div>
          <h1 style={{ marginBottom: "0.25rem" }}>Dashboard</h1>
          <p style={{ color: "var(--eve-pizarra)", fontSize: "0.875rem" }}>
            Resumen de tu actividad en EvePay.
          </p>
        </div>

        {/* Selector de rango */}
        <div style={{
          display: "flex", gap: "0.25rem",
          background: "var(--eve-tinte)",
          borderRadius: "var(--eve-radio-pill)",
          padding: "0.25rem",
          border: "1px solid var(--eve-linea)"
        }}>
          {RANGES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              style={{
                border: "none", borderRadius: "var(--eve-radio-pill)",
                padding: "0.375rem 1rem", fontSize: "0.8rem",
                fontFamily: "'Inter',sans-serif",
                fontWeight: range === key ? 600 : 400,
                cursor: "pointer",
                background: range === key ? "#fff" : "transparent",
                color: range === key ? "var(--eve-azul-noche)" : "var(--eve-pizarra)",
                boxShadow: range === key ? "0 1px 4px rgba(10,37,64,.08)" : "none",
                transition: "all 0.15s"
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Métricas */}
      {loading ? (
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{
              flex: 1, minWidth: 180, height: 110,
              background: "var(--eve-hielo)",
              borderRadius: 14, border: "1px solid var(--eve-linea)"
            }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <StatCard
            label="Ingresos aprobados"
            value={fmt(stats?.montoAprobadoMinor ?? 0)}
            sub="en el período seleccionado"
            accent="var(--eve-coral)"
          />
          <StatCard
            label="Total transacciones"
            value={String(stats?.total ?? 0)}
            sub="cobros iniciados"
          />
          <StatCard
            label="Aprobados"
            value={String(stats?.aprobados ?? 0)}
            sub={`${aprobRate}% tasa de aprobación`}
            accent="var(--eve-exito)"
          />
          <StatCard
            label="Fallidos"
            value={String(stats?.fallidos ?? 0)}
            sub="rechazados o expirados"
            accent="var(--eve-error)"
          />
        </div>
      )}

      {/* Acceso rápido */}
      <div style={{ marginTop: "2rem" }}>
        <div className="card" style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: "1rem", flexWrap: "wrap"
        }}>
          <div>
            <h2 style={{ marginBottom: "0.25rem" }}>Ver todas las transacciones</h2>
            <p style={{ color: "var(--eve-pizarra)", fontSize: "0.85rem" }}>
              Filtra por fecha, referencia o estado.
            </p>
          </div>
          <Link href="/transacciones" className="btn btn-cta">
            Ver transacciones
          </Link>
        </div>
      </div>
    </div>
  );
}
