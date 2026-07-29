"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";
import { api, type Cobro } from "@/lib/api";
import { getApiKey } from "@/lib/auth";

function estadoPill(estado: string) {
  if (estado === "aprobado") return <span className="pill pill-green">Aprobado</span>;
  if (estado === "fallido") return <span className="pill pill-red">Fallido</span>;
  if (estado === "pendiente") return <span className="pill pill-yellow">Pendiente</span>;
  return <span className="pill pill-gray">{estado}</span>;
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.875rem 0", borderBottom: "1px solid var(--gray-100)" }}>
      <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      <span className={mono ? "mono" : ""} style={{ fontSize: "0.9rem", color: "var(--navy)", fontWeight: "500" }}>{value}</span>
    </div>
  );
}

export default function DetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [cobro, setCobro] = useState<Cobro | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const key = getApiKey();
    if (!key) return;
    api.pagos.obtener(key, id)
      .then((c) => { if (c) setCobro(c); else setNotFound(true); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const fmt = (minor: number, moneda = "COP") =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: moneda, maximumFractionDigits: 0 }).format(minor / 100);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <Link href="/transacciones" style={{ color: "var(--gray-400)", textDecoration: "none", fontSize: "0.875rem" }}>← Transacciones</Link>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "var(--navy)" }}>Detalle de pago</h1>
      </div>

      {loading && <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--gray-400)" }}>Cargando...</div>}

      {notFound && (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--gray-400)" }}>Transacción no encontrada.</p>
          <Link href="/transacciones" className="btn-primary" style={{ textDecoration: "none", display: "inline-block", marginTop: "1rem" }}>Volver</Link>
        </div>
      )}

      {cobro && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Monto principal */}
          <div className="card" style={{ textAlign: "center" }}>
            <p style={{ margin: "0 0 0.5rem", fontSize: "3rem", fontWeight: "700", color: cobro.estado === "aprobado" ? "var(--green)" : cobro.estado === "fallido" ? "var(--red)" : "var(--navy)" }}>
              {fmt(cobro.montoMinor, cobro.moneda)}
            </p>
            <div>{estadoPill(cobro.estado)}</div>
          </div>

          {/* Detalles */}
          <div className="card">
            <h2 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", fontWeight: "700", color: "var(--navy)" }}>Detalles</h2>
            <Row label="ID de pago" value={cobro.id} mono />
            <Row label="Referencia" value={cobro.referencia} />
            <Row label="Moneda" value={cobro.moneda} />
            <Row label="Creado" value={fmtDate(cobro.creadoEn)} />
            {cobro.checkoutUrl && (
              <Row label="Link de pago" value={
                <a href={cobro.checkoutUrl} target="_blank" rel="noopener noreferrer"
                  style={{ color: "var(--coral)", textDecoration: "none", fontSize: "0.8rem" }}>
                  Abrir link →
                </a>
              } />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
