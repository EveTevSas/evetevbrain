import Link from "next/link";
import { prisma } from "@/lib/db";
import { totalVentasPesos } from "@/lib/calc";
import { formatoPesos, formatoFecha } from "@/lib/format";
import { IconoExito } from "@/components/iconos";
import FiltrosCierres from "@/components/filtros-cierres";
import type { CloseStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function CierresPage({
  searchParams
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; estado?: string }>;
}) {
  const sp = await searchParams;
  const desde = sp.desde ?? "";
  const hasta = sp.hasta ?? "";
  const estadoParam = sp.estado ?? "";

  /* ── Filtro de fecha y estado ─────────────────────────── */
  type WhereCierre = NonNullable<Parameters<typeof prisma.dailyClose.findMany>[0]>["where"];
  const where: WhereCierre = {};

  if (desde || hasta) {
    where.fecha = {};
    if (desde) {
      // Desde el inicio del día en UTC
      where.fecha.gte = new Date(`${desde}T00:00:00.000Z`);
    }
    if (hasta) {
      // Hasta el final del día en UTC
      where.fecha.lte = new Date(`${hasta}T23:59:59.999Z`);
    }
  }

  if (estadoParam === "CLOSED" || estadoParam === "DRAFT") {
    where.estado = estadoParam as CloseStatus;
  }

  const [todos, cierres] = await Promise.all([
    prisma.dailyClose.count(),
    prisma.dailyClose.findMany({
      where,
      orderBy: { fecha: "desc" },
      include: { readings: true }
    })
  ]);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
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
            Operación diaria
          </p>
          <h1 style={{ margin: 0 }}>Diario</h1>
        </div>
        <Link href="/cierres/nuevo" className="btn btn-cta">
          + Nuevo cierre
        </Link>
      </div>

      {/* Filtros */}
      <FiltrosCierres
        desde={desde}
        hasta={hasta}
        estado={estadoParam}
        total={todos}
        filtrados={cierres.length}
      />

      {/* Tabla */}
      {cierres.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-eve-pizarra">
            {desde || hasta || estadoParam
              ? "Ningún cierre coincide con los filtros aplicados."
              : 'No hay cierres todavía. Crea el primero con "Nuevo cierre".'}
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead style={{ background: "#F4F9FD", textAlign: "left" }}>
              <tr>
                <th
                  style={{
                    padding: "0.75rem 1.25rem",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#94A3B8",
                    borderBottom: "1px solid #EDF3FA"
                  }}
                >
                  Fecha
                </th>
                <th
                  style={{
                    padding: "0.75rem 1.25rem",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#94A3B8",
                    borderBottom: "1px solid #EDF3FA"
                  }}
                >
                  Estado
                </th>
                <th
                  style={{
                    padding: "0.75rem 1.25rem",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#94A3B8",
                    borderBottom: "1px solid #EDF3FA",
                    textAlign: "right"
                  }}
                >
                  Total ventas
                </th>
                <th style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid #EDF3FA" }} />
              </tr>
            </thead>
            <tbody>
              {cierres.map((c) => {
                const total = totalVentasPesos(
                  c.readings.map((r) => ({
                    lecturaInicial: Number(r.lecturaInicial),
                    lecturaFinal: Number(r.lecturaFinal),
                    calibracion: Number(r.calibracion),
                    precio: Number(r.precio)
                  }))
                );
                return (
                  <tr key={c.id} style={{ borderTop: "1px solid #EDF3FA" }}>
                    <td
                      style={{ padding: "0.9rem 1.25rem", fontSize: "0.875rem", color: "#64748B" }}
                    >
                      {formatoFecha(c.fecha)}
                    </td>
                    <td style={{ padding: "0.9rem 1.25rem" }}>
                      {c.estado === "CLOSED" ? (
                        <span className="badge" style={{ background: "#dcfce7", color: "#16A34A" }}>
                          <IconoExito className="h-3.5 w-3.5" />
                          Cerrado
                        </span>
                      ) : (
                        <span className="badge" style={{ background: "#fef3c7", color: "#D97706" }}>
                          Borrador
                        </span>
                      )}
                    </td>
                    <td
                      className="cifra"
                      style={{
                        padding: "0.9rem 1.25rem",
                        textAlign: "right",
                        fontWeight: 700,
                        color: "#0A2540"
                      }}
                    >
                      {formatoPesos(total)}
                    </td>
                    <td style={{ padding: "0.9rem 1.25rem", textAlign: "right" }}>
                      <Link
                        href={`/cierres/${c.id}`}
                        style={{
                          color: "#4b3075",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          textDecoration: "none"
                        }}
                      >
                        {c.estado === "CLOSED" ? "Ver →" : "Editar →"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer con total de resultados */}
          <div
            style={{
              padding: "0.875rem 1.25rem",
              borderTop: "1px solid #EDF3FA",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span style={{ fontSize: "0.8rem", color: "#94A3B8" }}>
              {cierres.length} {cierres.length === 1 ? "cierre" : "cierres"}
              {(desde || hasta || estadoParam) && ` · filtrado de ${todos} total`}
            </span>
            {/* Resumen de ventas filtradas */}
            <span className="cifra" style={{ fontSize: "0.9rem", color: "#0A2540" }}>
              {formatoPesos(
                cierres.reduce(
                  (acc, c) =>
                    acc +
                    totalVentasPesos(
                      c.readings.map((r) => ({
                        lecturaInicial: Number(r.lecturaInicial),
                        lecturaFinal: Number(r.lecturaFinal),
                        calibracion: Number(r.calibracion),
                        precio: Number(r.precio)
                      }))
                    ),
                  0
                )
              )}
              <span
                style={{ fontSize: "0.72rem", fontWeight: 400, color: "#94A3B8", marginLeft: 4 }}
              >
                en ventas
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
