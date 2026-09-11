import { describe, expect, it } from "vitest";
import { repartirReembolso } from "./reembolsos";
import { desglosarCobro } from "./tarifa";

/* El cobro de la spec: $50.000, comisión $1.200 + IVA $228, costo $800. */
const COBRO = desglosarCobro(
  5_000_000,
  { bps: 0, fijoMinor: 120_000, ivaBps: 1900 },
  { bps: 0, fijoMinor: 80_000 }
);

describe("repartirReembolso", () => {
  it("un reembolso total devuelve exactamente lo de cada quien", () => {
    expect(repartirReembolso(5_000_000, COBRO)).toEqual({
      comercio: 4_857_200,
      comision: 120_000,
      iva: 22_800
    });
  });

  it("uno parcial reparte proporcionalmente y las partes suman el reembolso", () => {
    const r = repartirReembolso(1_000_000, COBRO);
    expect(r.comercio + r.comision + r.iva).toBe(1_000_000);
    expect(r.comision).toBe(24_000); // 1 200 000 × 1/5
    expect(r.iva).toBe(4_560);
    expect(r.comercio).toBe(971_440);
  });

  it("el resto del redondeo lo absorbe el comercio y nadie devuelve más de lo que recibió", () => {
    const r = repartirReembolso(333_333, COBRO);
    expect(r.comercio + r.comision + r.iva).toBe(333_333);
    expect(r.comision).toBeLessThanOrEqual(COBRO.comision);
    expect(r.iva).toBeLessThanOrEqual(COBRO.iva);
  });

  it("un cobro sin tarifas (anterior a la Fase 6) sale todo del comercio", () => {
    const viejo = desglosarCobro(
      150_000,
      { bps: 0, fijoMinor: 0, ivaBps: 0 },
      { bps: 0, fijoMinor: 0 }
    );
    expect(repartirReembolso(150_000, viejo)).toEqual({ comercio: 150_000, comision: 0, iva: 0 });
  });

  it("cero o negativo no reparte nada", () => {
    expect(repartirReembolso(0, COBRO)).toEqual({ comercio: 0, comision: 0, iva: 0 });
  });
});
