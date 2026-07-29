"use client";
import { useEffect, useState } from "react";
import { api, type Stats } from "@/lib/api";
import { getApiKey } from "@/lib/auth";

function fmt(minor: number, moneda = "COP"): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: moneda, maximumFractionDigits: 0 }).format(minor / 100);
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 180 }}>
      <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--gray-400)" }}>{label}</p>
      <p style={{ margin: "0 0 0.25rem", fontSize: "1.75rem", fontWeight: "700", color: color ?? "var(--navy)" }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--gray-400)" }}>{sub}</p>}
    </div>
  );
}

type Range = "today" | "week" | "month" | "all";

function rangeToParam(r: Range): { desde?: string; hasta?: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  if (r === "all") return {};
  const desde = new Date(now);
  if (r === "today") { desde.setHours(0, 0, 0, 0); }
  else if (r === "week") { desde.setDate(now.getDate() - 7); }
  else { desde.setDate(1); desde.setHours(0, 0, 0, 0); }
  return { desde: iso(desde), hasta: iso(now) };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("month");

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

  const RANGES: { key: Range; label: string }[] = [
    { key: "today", label: "Hoy" },
    { key: "week", label: "7 días" },
    { key: "month", label: "Este mes" },
    { key: "all", label: "Todo" }
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "var(--navy)" }}>Dashboard</h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--gray-400)", fontSize: "0.875rem" }}>Resumen de tu actividad en EvePay.</p>
        </div>
        {/* Range selector */}
        <div style={{ display: "flex", gap: "0.25rem", background: "var(--gray-100)", borderRadius: "999px", padding: "0.25rem" }}>
          {RANGES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              style={{
                border: "none", borderRadius: "999px", padding: "0.375rem 0.875rem",
                fontSize: "0.8rem", fontWeight: range === key ? "600" : "400",
                cursor: "pointer",
                background: range === key ? "#fff" : "transparent",
                color: range === key ? "var(--navy)" : "var(--gray-400)",
                boxShadow: range === key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s"
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div style={{ display: "flex", gap: "1rem" }}>
          {[1, 2, 3, 4].map((i) => <div key={i} className="card" style={{ flex: 1, height: 100, background: "var(--gray-100)", border: "none" }} />)}
        </div>
      ) : (
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <StatCard label="Ingresos aprobados" value={fmt(stats?.montoAprobadoMinor ?? 0)} sub="en el período" color="var(--coral)" />
          <StatCard label="Transacciones" value={String(stats?.total ?? 0)} sub="total del período" />
          <StatCard label="Aprobados" value={String(stats?.aprobados ?? 0)} sub={`${aprobRate}% tasa de aprobación`} color="var(--green)" />
          <StatCard label="Fallidos" value={String(stats?.fallidos ?? 0)} sub="rechazados/fallidos" color="var(--red)" />
        </div>
      )}

      {/* Quick link */}
      <div style={{ marginTop: "2rem" }}>
        <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: "0 0 0.25rem", fontWeight: "600", color: "var(--navy)" }}>Ver todas las transacciones</p>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--gray-400)" }}>Filtra por fecha, referencia o estado.</p>
          </div>
          <a href="/transacciones" className="btn-primary" style={{ textDecoration: "none" }}>Ver transacciones</a>
        </div>
      </div>
    </div>
  );
}
