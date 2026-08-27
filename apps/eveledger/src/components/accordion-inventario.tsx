"use client";

import { useState } from "react";
import Link from "next/link";
import { formatoGalones } from "@/lib/format";

/* ── Tipos serializados (Map → array para pasar via props) ─ */
export interface FilaSerial {
  dia: number;
  inicial: number | null;
  compras: number;
  ventas: number | null;
  teorica: number | null;
  fisico: number | null;
  variacion: number | null;
  alerta: boolean;
  fecha: string; // YYYY-MM-DD para el link de edición
}

export interface ProductoSerial {
  id: string;
  nombre: string;
  filas: FilaSerial[];
  totalCompras: number;
  alertas: number;
  diasConFisico: number;
}

/* Un color por producto (Corriente, ACPM, Extra) */
const COLORES = ["#16A34A", "#1E6FEB", "#EE3D22"];
const COLORES_BG = ["#F0FDF4", "#EEF4FF", "#FFF5F5"];

/* ── Componente ─────────────────────────────────────────── */
export default function AccordionInventario({
  productos,
}: {
  productos: ProductoSerial[];
}) {
  const [abierto, setAbierto] = useState<string | null>(
    productos[0]?.id ?? null
  );

  const idxAbierto = productos.findIndex((p) => p.id === abierto);
  const productoAbierto = idxAbierto >= 0 ? productos[idxAbierto] : null;
  const colorAbierto = COLORES[idxAbierto] ?? "#64748B";

  return (
    <div>
      {/* ── Tres tarjetas selector ──────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        {productos.map((p, i) => {
          const color = COLORES[i] ?? "#64748B";
          const colorBg = COLORES_BG[i] ?? "#F4F9FD";
          const activo = abierto === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setAbierto(activo ? null : p.id)}
              style={{
                background: activo ? colorBg : "#fff",
                borderTop: `1.5px solid ${activo ? color : "#EDF3FA"}`,
                borderRight: `1.5px solid ${activo ? color : "#EDF3FA"}`,
                borderBottom: `1.5px solid ${activo ? color : "#EDF3FA"}`,
                borderLeft: `1.5px solid ${activo ? color : "#EDF3FA"}`,
                borderRadius: 14,
                padding: "1.25rem",
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.15s, background 0.15s",
                width: "100%",
              }}
            >
              {/* Nombre + chevron */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "#0A2540",
                  }}
                >
                  {p.nombre}
                </p>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={activo ? color : "#94A3B8"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: activo ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {/* Stats del mes */}
              <div
                style={{ display: "flex", gap: "1.25rem", marginTop: "1rem" }}
              >
                <div>
                  <p
                    style={{
                      margin: "0 0 0.2rem",
                      fontSize: "0.63rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: "#94A3B8",
                    }}
                  >
                    Compras mes
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      color: "#0A2540",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {p.totalCompras > 0 ? formatoGalones(p.totalCompras) : "—"}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      margin: "0 0 0.2rem",
                      fontSize: "0.63rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: "#94A3B8",
                    }}
                  >
                    Alertas
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      color: p.alertas > 0 ? "#B91C1C" : "#16A34A",
                    }}
                  >
                    {p.alertas === 0 ? "0" : `${p.alertas} días`}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      margin: "0 0 0.2rem",
                      fontSize: "0.63rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: "#94A3B8",
                    }}
                  >
                    Digitados
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      color: "#0A2540",
                    }}
                  >
                    {p.diasConFisico} días
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Panel de tabla del producto abierto ─────────── */}
      {productoAbierto && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #EDF3FA",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {/* Sub-encabezado */}
          <div
            style={{
              padding: "0.875rem 1.25rem",
              borderBottom: "1px solid #EDF3FA",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: colorAbierto,
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <p
              style={{
                margin: 0,
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#334155",
              }}
            >
              {productoAbierto.nombre} — detalle del mes
            </p>
          </div>

          {/* Tabla con scroll contenido */}
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: 700,
                fontSize: "0.85rem",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr style={{ background: "#F4F9FD" }}>
                  {[
                    { label: "Día", align: "left" as const },
                    { label: "Inicial", align: "right" as const },
                    { label: "Compras", align: "right" as const },
                    { label: "Ventas", align: "right" as const },
                    { label: "Teórica", align: "right" as const },
                    { label: "Físico", align: "right" as const },
                    { label: "Variación", align: "right" as const },
                    { label: "", align: "right" as const },
                  ].map((h) => (
                    <th
                      key={h.label}
                      style={{
                        padding: "0.6rem 0.875rem",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "#94A3B8",
                        textAlign: h.align,
                        borderBottom: "1px solid #EDF3FA",
                        position: "sticky",
                        top: 0,
                        background: "#F4F9FD",
                        zIndex: 2,
                      }}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productoAbierto.filas.map((f) => {
                  const vacio = (
                    <span style={{ color: "#CBD5E1" }}>—</span>
                  );
                  return (
                    <tr
                      key={f.dia}
                      style={{ borderTop: "1px solid #EDF3FA" }}
                    >
                      {/* Día */}
                      <td
                        style={{
                          padding: "0.55rem 0.875rem",
                          color: "#334155",
                          fontWeight: 600,
                        }}
                      >
                        {f.dia}
                      </td>

                      {/* Inicial */}
                      <td
                        style={{
                          padding: "0.55rem 0.875rem",
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          color: "#64748B",
                        }}
                      >
                        {f.inicial !== null
                          ? formatoGalones(f.inicial)
                          : vacio}
                      </td>

                      {/* Compras */}
                      <td
                        style={{
                          padding: "0.55rem 0.875rem",
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          color: f.compras > 0 ? colorAbierto : undefined,
                          fontWeight: f.compras > 0 ? 700 : 400,
                        }}
                      >
                        {f.compras > 0 ? formatoGalones(f.compras) : vacio}
                      </td>

                      {/* Ventas */}
                      <td
                        style={{
                          padding: "0.55rem 0.875rem",
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          color: "#64748B",
                        }}
                      >
                        {f.ventas !== null ? formatoGalones(f.ventas) : vacio}
                      </td>

                      {/* Teórica */}
                      <td
                        style={{
                          padding: "0.55rem 0.875rem",
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          color: "#64748B",
                        }}
                      >
                        {f.teorica !== null
                          ? formatoGalones(f.teorica)
                          : vacio}
                      </td>

                      {/* Físico */}
                      <td
                        style={{
                          padding: "0.55rem 0.875rem",
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          color: "#0A2540",
                          fontWeight: f.fisico !== null ? 600 : 400,
                        }}
                      >
                        {f.fisico !== null ? formatoGalones(f.fisico) : vacio}
                      </td>

                      {/* Variación */}
                      <td
                        style={{ padding: "0.55rem 0.875rem", textAlign: "right" }}
                      >
                        {f.variacion !== null ? (
                          f.alerta ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                color: "#B91C1C",
                                background: "#FEE2E2",
                                borderRadius: 999,
                                padding: "0.15rem 0.55rem",
                              }}
                            >
                              ⚠ {formatoGalones(f.variacion)}
                            </span>
                          ) : (
                            <span
                              style={{
                                fontVariantNumeric: "tabular-nums",
                                color: "#16A34A",
                                fontWeight: 600,
                              }}
                            >
                              {formatoGalones(f.variacion)}
                            </span>
                          )
                        ) : (
                          vacio
                        )}
                      </td>

                      {/* Link editar */}
                      <td
                        style={{ padding: "0.55rem 0.875rem", textAlign: "right" }}
                      >
                        <Link
                          href={`/inventarios/${f.fecha}`}
                          style={{
                            color: "#1E6FEB",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            textDecoration: "none",
                          }}
                        >
                          Editar →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
