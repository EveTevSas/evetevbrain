import { margenMensual, gastosMensual } from "@/lib/financiero";
import FinancieroClient from "./FinancieroClient";

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

export default async function FinancieroPage({
  searchParams
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  const sp = await searchParams;
  const ahora = new Date();
  const anio = Number(sp.anio) || ahora.getUTCFullYear();
  const mes = Number(sp.mes) || ahora.getUTCMonth() + 1;

  const margenes = await margenMensual(anio, mes);
  const gastos = await gastosMensual(anio, mes);
  const anios = [anio - 2, anio - 1, anio, anio + 1];

  return (
    <div className="space-y-6">
      <h1>Margen y gastos</h1>

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

      <FinancieroClient
        anio={anio}
        mes={mes}
        mesTexto={`${MESES[mes - 1]} de ${anio}`}
        margenes={margenes}
        gastos={gastos}
      />
    </div>
  );
}
