import Link from "next/link";
import { consolidadoMensual } from "@/lib/cierres";
import { formatoGalones } from "@/lib/format";

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

export default async function ConsolidadoPage({
  searchParams
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  const sp = await searchParams;
  const ahora = new Date();
  const anio = Number(sp.anio) || ahora.getUTCFullYear();
  const mes = Number(sp.mes) || ahora.getUTCMonth() + 1;

  const { diasEnMes, productos, matriz } = await consolidadoMensual(anio, mes);

  const totalPorProducto = new Map<string, number>();
  const totalPorDia = new Map<number, number>();
  let totalMes = 0;
  for (const [dia, fila] of matriz) {
    let sumaDia = 0;
    for (const [pid, gal] of fila) {
      totalPorProducto.set(pid, (totalPorProducto.get(pid) ?? 0) + gal);
      sumaDia += gal;
    }
    totalPorDia.set(dia, sumaDia);
    totalMes += sumaDia;
  }

  const anios = [anio - 2, anio - 1, anio, anio + 1];

  return (
    <div className="space-y-6">
      <h1>Consolidado mensual de galones</h1>

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
        {/* Acción secundaria (mezclado): esta vista no tiene CTA coral */}
        <button type="submit" className="btn btn-sec">
          Ver
        </button>
      </form>

      <p className="text-sm text-eve-pizarra">
        {MESES[mes - 1]} de {anio} — solo cierres en estado Cerrado. Sin digitación: se deriva de
        los cierres diarios.
      </p>

      {/* La tabla ancha tiene su propio scroll horizontal contenido */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-eve-tinte text-eve-pizarra">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Día</th>
              {productos.map((p) => (
                <th key={p.id} className="px-3 py-2 text-right font-medium">
                  {p.nombre}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-semibold text-eve-azul-noche">Total día</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: diasEnMes }, (_, i) => i + 1).map((dia) => {
              const fila = matriz.get(dia);
              return (
                <tr key={dia} className="border-t border-eve-linea">
                  <td className="px-3 py-1.5">{dia}</td>
                  {productos.map((p) => {
                    const gal = fila?.get(p.id);
                    return (
                      <td key={p.id} className="px-3 py-1.5 text-right tabular-nums">
                        {gal !== undefined ? (
                          formatoGalones(gal)
                        ) : (
                          <span className="text-eve-muted">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                    {totalPorDia.has(dia) ? (
                      formatoGalones(totalPorDia.get(dia)!)
                    ) : (
                      <span className="text-eve-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-eve-linea bg-eve-tinte">
              <td className="px-3 py-2 font-semibold">Total mes</td>
              {productos.map((p) => (
                <td key={p.id} className="cifra px-3 py-2 text-right">
                  {formatoGalones(totalPorProducto.get(p.id) ?? 0)}
                </td>
              ))}
              {/* Acumulado del mes: cifra protagonista en Baloo 2 700 */}
              <td className="cifra px-3 py-2 text-right">{formatoGalones(totalMes)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-sm">
        <Link href="/" className="lnk">
          ← Volver a cierres
        </Link>
      </p>
    </div>
  );
}
