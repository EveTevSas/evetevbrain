import Link from "next/link";
import { inventarioMensual } from "@/lib/inventarios";
import { formatoGalones, fechaAInput } from "@/lib/format";
import { IconoAlerta } from "@/components/iconos";

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

const tdNum = "px-3 py-1.5 text-right tabular-nums";

export default async function InventariosPage({
  searchParams
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  const sp = await searchParams;
  const ahora = new Date();
  const anio = Number(sp.anio) || ahora.getUTCFullYear();
  const mes = Number(sp.mes) || ahora.getUTCMonth() + 1;

  const { diasEnMes, productos } = await inventarioMensual(anio, mes);
  const anios = [anio - 2, anio - 1, anio, anio + 1];

  return (
    <div className="space-y-6">
      <h1>Inventarios</h1>

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
        {MESES[mes - 1]} de {anio} — inicial, ventas, teórica y variación se derivan; solo se
        digitan compras (descargas) e inventario físico. Toca un día para digitar.
      </p>

      {productos.map((p) => (
        <section key={p.id} className="card overflow-x-auto">
          <h2 className="px-3 pt-3">{p.nombre}</h2>
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-eve-tinte text-eve-pizarra">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Día</th>
                <th className="px-3 py-2 text-right font-medium">Inicial</th>
                <th className="px-3 py-2 text-right font-medium">Compras</th>
                <th className="px-3 py-2 text-right font-medium">Ventas</th>
                <th className="px-3 py-2 text-right font-medium">Teórica</th>
                <th className="px-3 py-2 text-right font-medium">Físico</th>
                <th className="px-3 py-2 text-right font-medium">Variación</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: diasEnMes }, (_, i) => i + 1).map((dia) => {
                const fila = p.dias.get(dia)!;
                const fecha = fechaAInput(new Date(Date.UTC(anio, mes - 1, dia)));
                const vacio = <span className="text-eve-muted">—</span>;
                return (
                  <tr key={dia} className="border-t border-eve-linea">
                    <td className="px-3 py-1.5">{dia}</td>
                    <td className={tdNum}>
                      {fila.inicial !== null ? formatoGalones(fila.inicial) : vacio}
                    </td>
                    <td className={tdNum}>
                      {fila.compras > 0 ? formatoGalones(fila.compras) : vacio}
                    </td>
                    <td className={tdNum}>
                      {fila.ventas !== null ? formatoGalones(fila.ventas) : vacio}
                    </td>
                    <td className={tdNum}>
                      {fila.teorica !== null ? formatoGalones(fila.teorica) : vacio}
                    </td>
                    <td className={tdNum}>
                      {fila.fisico !== null ? formatoGalones(fila.fisico) : vacio}
                    </td>
                    <td className={tdNum}>
                      {fila.variacion !== null ? (
                        fila.alerta ? (
                          <span className="badge bg-eve-alerta/10 text-eve-alerta">
                            <IconoAlerta className="h-3.5 w-3.5" />
                            {formatoGalones(fila.variacion)}
                          </span>
                        ) : (
                          formatoGalones(fila.variacion)
                        )
                      ) : (
                        vacio
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <Link href={`/inventarios/${fecha}`} className="lnk">
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}

      <p className="text-sm">
        <Link href="/cierres" className="lnk">
          ← Volver a cierres
        </Link>
      </p>
    </div>
  );
}
