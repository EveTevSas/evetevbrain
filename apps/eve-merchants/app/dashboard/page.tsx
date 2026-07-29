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

/* Íconos para las métricas */
function IconIngresos() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
function IconTotal() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}
function IconAprobados() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
function IconFallidos() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function MetricCard({
  label, value, sub, icon, iconBg, iconColor,
}: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; iconBg: string; iconColor: string;
}) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <p style={{
          margin: 0, fontSize: "0.68rem", fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.08em",
          color: "var(--eve-muted)"
        }}>
          {label}
        </p>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: iconBg, color: iconColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
      <div>
        <p className="metric" style={{ margin: 0, fontSize: "clamp(1.5rem,2.5vw,2rem)", color: "var(--eve-azul-noche)" }}>
          {value}
        </p>
        {sub && <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "var(--eve-pizarra)" }}>{sub}</p>}
      </div>
    </div>
  );
}

type Range = "today" | "week" | "month" | "all";

function rangeToParam(r: Range) {
  const now = new Date(); const iso = (d: Date) => d.toISOString();
  if (r === "all") return {};
  const desde = new Date(now);
  if (r === "today")     { desde.setHours(0, 0, 0, 0); }
  else if (r === "week") { desde.setDate(now.getDate() - 7); }
  else                   { desde.setDate(1); desde.setHours(0, 0, 0, 0); }
  return { desde: iso(desde), hasta: iso(now) };
}

const RANGES: { key: Range; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "week",  label: "7 días" },
  { key: "month", label: "Este mes" },
  { key: "all",   label: "Todo" },
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
      .then(setStats).catch(console.error).finally(() => setLoading(false));
  }, [range]);

  const aprobRate = stats && stats.total > 0
    ? Math.round((stats.aprobados / stats.total) * 100) : 0;

  return (
    <div>
      {/* Encabezado estilo EveConecta */}
      <div style={{ marginBottom: "1.75rem" }}>
        <p style={{
          margin: "0 0 0.25rem",
          fontSize: "0.68rem", fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.1em",
          color: "var(--eve-electrico)"
        }}>
          Resumen financiero
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: 0 }}>Dashboard</h1>
            <p style={{ margin: "0.25rem 0 0", color: "var(--eve-pizarra)", fontSize: "0.875rem" }}>
              Ingresos, transacciones y tasa de aprobación de EvePay.
            </p>
          </div>

          {/* Selector de rango */}
          <div style={{
            display: "flex", gap: "0.25rem",
            background: "var(--eve-tinte)",
            borderRadius: "var(--eve-radio-pill)",
            padding: "0.25rem",
            border: "1px solid var(--eve-linea)",
          }}>
            {RANGES.map(({ key, label }) => (
              <button key={key} onClick={() => setRange(key)} style={{
                border: "none", borderRadius: "var(--eve-radio-pill)",
                padding: "0.35rem 0.875rem", fontSize: "0.78rem",
                fontFamily: "'Inter',sans-serif",
                fontWeight: range === key ? 600 : 400,
                cursor: "pointer",
                background: range === key ? "#fff" : "transparent",
                color: range === key ? "var(--eve-azul-noche)" : "var(--eve-pizarra)",
                boxShadow: range === key ? "0 1px 4px rgba(10,37,64,.08)" : "none",
                transition: "all 0.15s",
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Métricas */}
      {loading ? (
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ flex: 1, minWidth: 180, height: 110, background: "var(--eve-hielo)", borderRadius: 14, border: "1px solid var(--eve-linea)" }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <MetricCard
            label="Ingresos aprobados"
            value={fmt(stats?.montoAprobadoMinor ?? 0)}
            sub="en el período"
            icon={<IconIngresos />}
            iconBg="#FEF2F2"
            iconColor="var(--eve-coral)"
          />
          <MetricCard
            label="Transacciones"
            value={String(stats?.total ?? 0)}
            sub="cobros iniciados"
            icon={<IconTotal />}
            iconBg="#EEF4FF"
            iconColor="var(--eve-electrico)"
          />
          <MetricCard
            label="Aprobados"
            value={String(stats?.aprobados ?? 0)}
            sub={`${aprobRate}% tasa de aprobación`}
            icon={<IconAprobados />}
            iconBg="#F0FDF4"
            iconColor="var(--eve-exito)"
          />
          <MetricCard
            label="Fallidos"
            value={String(stats?.fallidos ?? 0)}
            sub="rechazados o expirados"
            icon={<IconFallidos />}
            iconBg="#FEF2F2"
            iconColor="var(--eve-error)"
          />
        </div>
      )}

      {/* Acceso rápido */}
      <div className="card" style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: "1rem", flexWrap: "wrap",
      }}>
        <div>
          <h2 style={{ marginBottom: "0.25rem" }}>Transacciones</h2>
          <p style={{ color: "var(--eve-pizarra)", fontSize: "0.85rem" }}>
            Filtra por fecha, referencia o estado de pago.
          </p>
        </div>
        <Link href="/transacciones" className="btn btn-cta">
          Ver transacciones
        </Link>
      </div>
    </div>
  );
}
