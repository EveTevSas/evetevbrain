import { z } from "zod";
import { calcularTarifa } from "./tarifa";

/**
 * Dispersión asistida (spec `dispersion`): la política por comercio y el
 * reparto de la reserva entre los cobros de un lote. Vive aquí porque la API
 * lo usa al asentar y la consola al mostrar el lote: el mismo entero en los
 * dos lados.
 */

export const PoliticaDispersionSchema = z.object({
  /** T+N: días que el dinero debe llevar en la cuenta de recaudo antes de dispersarse. */
  diasLiquidacion: z.number().int().min(0).max(30),
  /** Reserva que se queda en `retenido:<merchant>` en cada lote. 0 = sin reserva. */
  reservaBps: z.number().int().min(0).max(5000),
  /** Días que la reserva espera antes de poder liberarse. */
  diasReserva: z.number().int().min(0).max(365),
  /** El primer cobro de un comercio nuevo no entra al lote hasta que alguien lo libera. */
  retenerPrimerCobro: z.boolean()
});
export type PoliticaDispersion = z.infer<typeof PoliticaDispersionSchema>;

export const POLITICA_DISPERSION_POR_DEFECTO: PoliticaDispersion = {
  diasLiquidacion: 1,
  reservaBps: 0,
  diasReserva: 30,
  retenerPrimerCobro: true
};

export const EstadoLoteSchema = z.enum(["programado", "aprobado", "pagado", "fallido"]);
export type EstadoLote = z.infer<typeof EstadoLoteSchema>;

/** La reserva de un lote: el porcentaje sobre lo que se le debe al comercio por sus cobros. */
export function reservaDelLote(totalCobrosMinor: number, reservaBps: number): number {
  return calcularTarifa(totalCobrosMinor, { bps: reservaBps, fijoMinor: 0 });
}

/**
 * Reparte la reserva del lote entre sus cobros, proporcional al monto de cada
 * uno, en enteros y mitad arriba; el último absorbe la diferencia para que la
 * suma sea exactamente la reserva. Así cada asiento de cobro cierra solo:
 * débito merchant_payable = crédito recaudo + crédito retenido.
 *
 * Misma fórmula que `evepay.repartir_reserva` en la base; un test las compara.
 */
export function repartirReserva(montosMinor: number[], reservaMinor: number): number[] {
  const total = montosMinor.reduce((a, m) => a + m, 0);
  if (montosMinor.length === 0 || reservaMinor <= 0 || total <= 0) {
    return montosMinor.map(() => 0);
  }
  const partes: number[] = [];
  let acumulado = 0;
  for (let i = 0; i < montosMinor.length; i++) {
    const monto = montosMinor[i]!;
    let parte: number;
    if (i === montosMinor.length - 1) {
      parte = reservaMinor - acumulado;
    } else {
      // redondeo mitad arriba de monto × reserva / total, en enteros
      parte = Number(
        (BigInt(monto) * BigInt(reservaMinor) * 2n + BigInt(total)) / (2n * BigInt(total))
      );
    }
    parte = Math.min(Math.max(parte, 0), monto);
    partes.push(parte);
    acumulado += parte;
  }
  return partes;
}
