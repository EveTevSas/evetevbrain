import { describe, expect, it } from "vitest";
import {
  POLITICA_DISPERSION_POR_DEFECTO,
  PoliticaDispersionSchema,
  repartirReserva,
  reservaDelLote
} from "./dispersion";

describe("reservaDelLote", () => {
  it("2,5 % de $48.572 son $1.214 (mitad arriba, en enteros)", () => {
    expect(reservaDelLote(48_572, 250)).toBe(1_214);
    expect(reservaDelLote(48_572, 0)).toBe(0);
  });
});

describe("repartirReserva", () => {
  it("la suma de las partes es exactamente la reserva, y cada parte va con su monto", () => {
    const montos = [48_572, 19_200, 333];
    const partes = repartirReserva(montos, 1_703);
    expect(partes.reduce((a, p) => a + p, 0)).toBe(1_703);
    expect(partes[0]).toBeGreaterThan(partes[1]!);
    expect(partes[1]).toBeGreaterThan(partes[2]!);
  });

  it("un solo cobro se lleva toda la reserva; sin reserva todos quedan en cero", () => {
    expect(repartirReserva([48_572], 1_214)).toEqual([1_214]);
    expect(repartirReserva([100, 200], 0)).toEqual([0, 0]);
    expect(repartirReserva([], 500)).toEqual([]);
  });

  /* El caso que rompe los repartos ingenuos: tres tercios de 100 no son
     enteros. El último absorbe el resto y nadie pierde un centavo. */
  it("reparte 100 entre tres iguales sin perder ni inventar centavos", () => {
    const partes = repartirReserva([1_000, 1_000, 1_000], 100);
    expect(partes).toEqual([33, 33, 34]);
  });

  it("ninguna parte supera el monto de su cobro", () => {
    const partes = repartirReserva([10, 10_000], 5_000);
    expect(partes[0]).toBeLessThanOrEqual(10);
    expect(partes.reduce((a, p) => a + p, 0)).toBe(5_000);
  });
});

describe("PoliticaDispersionSchema", () => {
  it("la política por defecto es válida: T+1, sin reserva, 30 días, primer cobro retenido", () => {
    expect(PoliticaDispersionSchema.safeParse(POLITICA_DISPERSION_POR_DEFECTO).success).toBe(true);
    expect(POLITICA_DISPERSION_POR_DEFECTO).toEqual({
      diasLiquidacion: 1,
      reservaBps: 0,
      diasReserva: 30,
      retenerPrimerCobro: true
    });
  });

  it("rechaza reservas de más del 50 % y días fuera de rango", () => {
    expect(
      PoliticaDispersionSchema.safeParse({ ...POLITICA_DISPERSION_POR_DEFECTO, reservaBps: 5001 })
        .success
    ).toBe(false);
    expect(
      PoliticaDispersionSchema.safeParse({
        ...POLITICA_DISPERSION_POR_DEFECTO,
        diasLiquidacion: 31
      }).success
    ).toBe(false);
    expect(
      PoliticaDispersionSchema.safeParse({ ...POLITICA_DISPERSION_POR_DEFECTO, diasReserva: -1 })
        .success
    ).toBe(false);
  });
});
