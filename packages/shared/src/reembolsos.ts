import type { DesgloseCobro } from "./tarifa";

/**
 * Reparto de un reembolso (spec `reembolsos-contracargos`). Un reembolso R
 * sobre un cobro de monto M devuelve proporcionalmente lo que era del
 * comercio, la comisión de EvePay y su IVA: las tres partes suman R en
 * enteros, mitad arriba, y la del comercio absorbe el resto. El costo del
 * proveedor no se reparte: no se recupera, EvePay lo asume.
 *
 * Misma fórmula que `evepay.repartir_reembolso` en la base; un test las compara.
 */
export interface ReparticionReembolso {
  comercio: number;
  comision: number;
  iva: number;
}

function proporcional(parte: number, r: number, total: number): number {
  if (total <= 0) return 0;
  return Number((BigInt(parte) * BigInt(r) * 2n + BigInt(total)) / (2n * BigInt(total)));
}

export function repartirReembolso(
  montoReembolsoMinor: number,
  cobro: DesgloseCobro
): ReparticionReembolso {
  const m = cobro.montoMinor;
  if (montoReembolsoMinor <= 0 || m <= 0) return { comercio: 0, comision: 0, iva: 0 };
  const comision = Math.min(proporcional(cobro.comision, montoReembolsoMinor, m), cobro.comision);
  const iva = Math.min(proporcional(cobro.iva, montoReembolsoMinor, m), cobro.iva);
  const comercio = montoReembolsoMinor - comision - iva;
  return { comercio, comision, iva };
}
