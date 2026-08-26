import Link from "next/link";
import { prisma } from "@/lib/db";
import { totalVentasPesos } from "@/lib/calc";
import { formatoPesos, formatoFecha } from "@/lib/format";
import { IconoExito } from "@/components/iconos";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cierres = await prisma.dailyClose.findMany({
    orderBy: { fecha: "desc" },
    include: { readings: true }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1>Cierres diarios</h1>
        {/* Único botón coral de la vista (C2) */}
        <Link href="/cierres/nuevo" className="btn btn-cta">
          Nuevo cierre
        </Link>
      </div>

      {cierres.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-eve-pizarra">
            No hay cierres todavía. Crea el primero con &quot;Nuevo cierre&quot;.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-eve-tinte text-left text-eve-pizarra">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Total ventas</th>
                <th className="px-4 py-3"></th>
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
                  <tr key={c.id} className="border-t border-eve-linea">
                    <td className="px-4 py-3">{formatoFecha(c.fecha)}</td>
                    <td className="px-4 py-3">
                      {c.estado === "CLOSED" ? (
                        <span className="badge bg-eve-exito/10 text-eve-exito">
                          <IconoExito className="h-3.5 w-3.5" />
                          Cerrado
                        </span>
                      ) : (
                        <span className="badge bg-eve-alerta/10 text-eve-alerta">Borrador</span>
                      )}
                    </td>
                    {/* Cifra protagonista en Baloo 2 700 (§3) */}
                    <td className="cifra px-4 py-3 text-right">{formatoPesos(total)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/cierres/${c.id}`} className="lnk">
                        {c.estado === "CLOSED" ? "Ver" : "Editar"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
