import { describe, expect, it } from "vitest";
import {
  calcularIva,
  calcularTarifa,
  desglosarCobro,
  validarTarifaComercio,
  validarTarifaProveedor
} from "./tarifa";

/* Cifras de ejemplo de la spec `comisiones`, en centavos: cobro de $50.000,
   EvePay cobra $1.200 fijos con IVA del 19 %, ComboPay nos cobra $800. */
const COBRO = 5_000_000;
const TARIFA_EVEPAY = { bps: 0, fijoMinor: 120_000, ivaBps: 1900 as const };
const TARIFA_COMBOPAY = { bps: 0, fijoMinor: 80_000, descuentaEnConsignacion: true };

describe("calcularTarifa (CA-6: enteros, mitad arriba)", () => {
  it("el caso borde de la spec: 2,90 % de $1.005 → 2 914,5 → 2 915 centavos", () => {
    expect(calcularTarifa(100_500, { bps: 290, fijoMinor: 0 })).toBe(2_915);
  });

  it.each([
    [100_000, 290, 0, 2_900], // 2,90 % exacto
    [100_000, 290, 50_000, 52_900], // más un fijo de $500
    [1, 1, 0, 0], // 0,0001 → 0
    [5_000, 1, 0, 1], // 0,5 → 1 (mitad arriba)
    [4_999, 1, 0, 0], // 0,4999 → 0
    [100_000, 0, 0, 0], // 0 %
    [100_000, 10_000, 0, 100_000] // 100 %
  ])("monto %i × %i bps + %i fijo = %i", (monto, bps, fijoMinor, esperado) => {
    expect(calcularTarifa(monto, { bps, fijoMinor })).toBe(esperado);
  });

  /* monto × bps se sale del rango exacto de number: por eso el BigInt. */
  it("no pierde centavos con montos grandes", () => {
    const monto = Number.MAX_SAFE_INTEGER;
    expect(calcularTarifa(monto, { bps: 10_000, fijoMinor: 0 })).toBe(monto);
    expect(calcularTarifa(monto, { bps: 5_000, fijoMinor: 0 })).toBe(4_503_599_627_370_496);
  });
});

describe("calcularIva (CA-12: misma regla que las tarifas)", () => {
  it("19 % de $1.200 son $228", () => {
    expect(calcularIva(120_000, 1900)).toBe(22_800);
  });

  it("con IVA en 0 % no hay IVA", () => {
    expect(calcularIva(120_000, 0)).toBe(0);
  });

  it("redondea mitad arriba igual que la tarifa: 19 % de 2 915 = 553,85 → 554", () => {
    expect(calcularIva(2_915, 1900)).toBe(554);
  });
});

describe("desglosarCobro", () => {
  it("el ejemplo de la spec: el comercio recibe $48.572 y EvePay gana $400", () => {
    expect(desglosarCobro(COBRO, TARIFA_EVEPAY, TARIFA_COMBOPAY)).toEqual({
      montoMinor: COBRO,
      comision: 120_000,
      iva: 22_800,
      alComercio: 4_857_200,
      costoProveedor: 80_000,
      margen: 40_000
    });
  });

  it("sin IVA el comercio recibe $48.800 y el margen no cambia", () => {
    const d = desglosarCobro(COBRO, { ...TARIFA_EVEPAY, ivaBps: 0 }, TARIFA_COMBOPAY);
    expect(d.iva).toBe(0);
    expect(d.alComercio).toBe(4_880_000);
    expect(d.margen).toBe(40_000);
  });

  /* Piloto sin comisión: permitido, la consola solo advierte (CA-10). */
  it("una tarifa de 0 % y $0 deja el margen negativo por el costo del proveedor", () => {
    const d = desglosarCobro(COBRO, { bps: 0, fijoMinor: 0, ivaBps: 1900 }, TARIFA_COMBOPAY);
    expect(d.comision).toBe(0);
    expect(d.iva).toBe(0);
    expect(d.alComercio).toBe(COBRO);
    expect(d.margen).toBe(-80_000);
  });

  /* CA-7: quien llama rechaza el cobro cuando alComercio ≤ 0. */
  it("si la comisión más su IVA se come el monto, alComercio queda en cero o negativo", () => {
    const d = desglosarCobro(100_000, { bps: 0, fijoMinor: 100_000, ivaBps: 0 }, TARIFA_COMBOPAY);
    expect(d.alComercio).toBe(0);
    const d2 = desglosarCobro(
      100_000,
      { bps: 0, fijoMinor: 100_000, ivaBps: 1900 },
      TARIFA_COMBOPAY
    );
    expect(d2.alComercio).toBeLessThan(0);
  });

  it("las partes siempre suman el monto", () => {
    const d = desglosarCobro(
      1_234_567,
      { bps: 290, fijoMinor: 30_000, ivaBps: 1900 },
      { bps: 250, fijoMinor: 0 }
    );
    expect(d.alComercio + d.comision + d.iva).toBe(1_234_567);
  });
});

describe("validarTarifaComercio (CA-8, CA-11)", () => {
  it("acepta una tarifa bien formada", () => {
    expect(validarTarifaComercio({ bps: 290, fijoMinor: 30_000, ivaBps: 1900 })).toEqual({
      ok: true,
      tarifa: { bps: 290, fijoMinor: 30_000, ivaBps: 1900 }
    });
  });

  it.each([
    [{ bps: -1, fijoMinor: 0, ivaBps: 0 }, "bps"],
    [{ bps: 10_001, fijoMinor: 0, ivaBps: 0 }, "bps"],
    [{ bps: 2.5, fijoMinor: 0, ivaBps: 0 }, "bps"],
    [{ bps: 290, fijoMinor: -1, ivaBps: 0 }, "fijoMinor"],
    [{ bps: 290, fijoMinor: 0, ivaBps: 500 }, "ivaBps"],
    [{ bps: 290, fijoMinor: 0, ivaBps: 19 }, "ivaBps"],
    [{ bps: 290, fijoMinor: 0 }, "ivaBps"]
  ])("rechaza %j señalando %s", (input, campo) => {
    const r = validarTarifaComercio(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.some((e) => e.startsWith(`${campo}:`))).toBe(true);
  });

  it("el mensaje del IVA dice cuáles son las dos opciones", () => {
    const r = validarTarifaComercio({ bps: 0, fijoMinor: 0, ivaBps: 1600 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores).toEqual(["ivaBps: El IVA solo puede ser 0 % o 19 %"]);
  });
});

describe("validarTarifaProveedor", () => {
  it("exige declarar si descuenta su tarifa en la consignación", () => {
    expect(validarTarifaProveedor({ bps: 0, fijoMinor: 80_000 }).ok).toBe(false);
    expect(
      validarTarifaProveedor({ bps: 0, fijoMinor: 80_000, descuentaEnConsignacion: true }).ok
    ).toBe(true);
  });
});
