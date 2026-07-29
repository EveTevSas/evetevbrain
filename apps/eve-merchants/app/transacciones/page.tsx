"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type Cobro, type PaginaCobros } from "@/lib/api";
import { getApiKey } from "@/lib/auth";

const ESTADOS = ["", "aprobado", "fallido", "pendiente", "creado"] as const;

function estadoPill(estado: string) {
  if (estado === "aprobado")  return <span className="pill pill-green">Aprobado</span>;
  if (estado === "fallido")   return <span className="pill pill-red">Fallido</span>;
  if (estado === "pendiente") return <span className="pill pill-yellow">Pendiente</span>;
  return <span className="pill pill-gray">{estado}</span>;
}

function fmt(minor: number, moneda = "COP") {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: moneda, maximumFractionDigits: 0
  }).format(minor / 100);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

export default function TransaccionesPage() {
  const [data, setData]     = useState<PaginaCobros | null>(null);
  const [loading, setLoading] = useState(true);
  const [desde, setDesde]   = useState("");
  const [hasta, setHasta]   = useState("");
  const [estado, setEstado] = useState("");
  const [page, setPage]     = useState(1);

  const load = useCallback(() => {
    const key = getApiKey();
    if (!key) return;
    setLoading(true);
    api.pagos.listar(key, {
      desde: desde || undefined,
      hasta: hasta ? hasta + "T23:59:59Z" : undefined,
      estado: estado || undefined,
      page,
      limit: 20
    }).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [desde, hasta, estado, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ marginBottom: "0.25rem" }}>Transacciones</h1>
        <p style={{ color: "var(--eve-pizarra)", fontSize: "0.875rem" }}>
          Historial completo de cobros.
        </p>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{
              display: "block", fontSize: "0.75rem", fontWeight: 600,
              color: "var(--eve-azul-noche)", marginBottom: "0.25rem"
            }}>
              Desde
            </label>
            <input
              className="input"
              type="date"
              value={desde}
              onChange={(e) => { setDesde(e.target.value); setPage(1); }}
              style={{ width: 160 }}
            />
          </div>
          <div>
            <label style={{
              display: "block", fontSize: "0.75rem", fontWeight: 600,
              color: "var(--eve-azul-noche)", marginBottom: "0.25rem"
            }}>
              Hasta
            </label>
            <input
              className="input"
              type="date"
              value={hasta}
              onChange={(e) => { setHasta(e.target.value); setPage(1); }}
              style={{ width: 160 }}
            />
          </div>
          <div>
            <label style={{
              display: "block", fontSize: "0.75rem", fontWeight: 600,
              color: "var(--eve-azul-noche)", marginBottom: "0.25rem"
            }}>
              Estado
            </label>
            <select
              className="input"
              value={estado}
              onChange={(e) => { setEstado(e.target.value); setPage(1); }}
              style={{ width: 140 }}
            >
              {ESTADOS.map((e) => <option key={e} value={e}>{e || "Todos"}</option>)}
            </select>
          </div>
          {(desde || hasta || estado) && (
            <button
              className="btn btn-ghost"
              onClick={() => { setDesde(""); setHasta(""); setEstado(""); setPage(1); }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: "0 0 0.5rem" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--eve-pizarra)" }}>
            Cargando...
          </div>
        ) : !data?.items.length ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--eve-pizarra)" }}>
            <p style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", color: "var(--eve-azul-noche)" }}>
              Sin transacciones
            </p>
            <p style={{ margin: 0, fontSize: "0.85rem" }}>
              No hay cobros que coincidan con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Referencia</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((cobro: Cobro) => (
                  <tr key={cobro.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: "var(--eve-azul-noche)" }}>
                        {cobro.referencia}
                      </span>
                      <br />
                      <span className="mono" style={{ color: "var(--eve-muted)" }}>
                        {cobro.id.slice(0, 8)}…
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{fmt(cobro.montoMinor, cobro.moneda)}</td>
                    <td>{estadoPill(cobro.estado)}</td>
                    <td>{fmtDate(cobro.creadoEn)}</td>
                    <td>
                      <Link
                        href={`/transacciones/${cobro.id}`}
                        style={{
                          color: "var(--eve-electrico)",
                          fontSize: "0.8rem",
                          textDecoration: "none",
                          fontWeight: 600
                        }}
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", padding: "1rem 1.5rem 0.5rem"
              }}>
                <span style={{ fontSize: "0.8rem", color: "var(--eve-pizarra)" }}>
                  {data.total} transacciones — página {page} de {totalPages}
                </span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    className="btn btn-ghost"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ← Anterior
                  </button>
                  <button
                    className="btn btn-ghost"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
