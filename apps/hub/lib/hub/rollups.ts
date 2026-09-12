import "server-only";

import { mesActual } from "@/lib/db";
import { resumenEvepay, type ResumenEvepay } from "@/lib/evepay";
import { mrrPorProducto } from "./cuentas";
import { cierreDelMes, listarCostos, type CierreMes, type Costo } from "./finanzas";

/**
 * Los números de la compañía en un solo lugar, para que Global, Finanzas y
 * Salud digan lo mismo. Ingresos = comisión de EvePay (según su ledger) + MRR
 * registrado en los enlaces. Costos = facturas registradas en el Hub. El costo
 * del proveedor de pagos según el ledger de EvePay se muestra como referencia y
 * NO se suma a las facturas: sería contarlo dos veces.
 */
export interface Rollup {
  mes: string;
  evepay: ResumenEvepay | null;
  mrr: Awaited<ReturnType<typeof mrrPorProducto>>;
  costos: Costo[];
  cierre: CierreMes | null;
  ingresos: {
    evepayMinor: number;
    eveconectaMinor: number;
    eveledgerMinor: number;
    mrrMinor: number;
    totalMinor: number;
  };
  costosMinor: number;
  margenMinor: number;
}

export async function rollupDelMes(): Promise<Rollup> {
  const mes = mesActual();
  const [evepay, mrr, costos, cierre] = await Promise.all([
    resumenEvepay(),
    mrrPorProducto(),
    listarCostos(mes),
    cierreDelMes(mes)
  ]);
  const evepayMinor = evepay?.comisionMesMinor ?? 0;
  const mrrMinor = mrr.eveconecta.mrrMinor + mrr.eveledger.mrrMinor;
  const totalMinor = evepayMinor + mrrMinor;
  const costosMinor = costos.reduce((s, c) => s + c.montoMinor, 0);
  return {
    mes,
    evepay,
    mrr,
    costos,
    cierre,
    ingresos: {
      evepayMinor,
      eveconectaMinor: mrr.eveconecta.mrrMinor,
      eveledgerMinor: mrr.eveledger.mrrMinor,
      mrrMinor,
      totalMinor
    },
    costosMinor,
    margenMinor: totalMinor - costosMinor
  };
}
