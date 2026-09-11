import { describe, expect, it } from "vitest";
import { CUENTAS, naturalezaDeCuenta, saldoNatural } from "./cuentas";

describe("naturalezaDeCuenta", () => {
  it.each([
    [CUENTAS.clearing("combopay"), "activo"],
    ["akua_clearing", "activo"],
    [CUENTAS.recaudo, "activo"],
    [CUENTAS.bancoHistorico, "activo"],
    [CUENTAS.merchantPayable("m-1"), "pasivo"],
    [CUENTAS.ivaPorPagar, "pasivo"],
    [CUENTAS.porPagar("combopay"), "pasivo"],
    ["retenido:m-1", "pasivo"],
    [CUENTAS.comisionEvepay, "ingreso"],
    [CUENTAS.costoProveedor("combopay"), "gasto"]
  ])("%s es %s", (cuenta, esperada) => {
    expect(naturalezaDeCuenta(cuenta)).toBe(esperada);
  });
});

describe("saldoNatural", () => {
  /* El ejemplo de la spec: con débito 5 000 000 y crédito 80 000 en clearing,
     el proveedor nos debe 4 920 000 (positivo, es un activo); con crédito
     4 857 200 en merchant_payable se le deben 4 857 200 al comercio (positivo,
     es un pasivo). Ninguno sale negativo por el lado del asiento. */
  it("activos y gastos crecen con débitos; pasivos e ingresos, con créditos", () => {
    expect(saldoNatural(5_000_000, 80_000, "activo")).toBe(4_920_000);
    expect(saldoNatural(0, 4_857_200, "pasivo")).toBe(4_857_200);
    expect(saldoNatural(0, 120_000, "ingreso")).toBe(120_000);
    expect(saldoNatural(80_000, 0, "gasto")).toBe(80_000);
  });

  it("un saldo del lado contrario a la naturaleza sale negativo: es la señal de revisar", () => {
    expect(saldoNatural(0, 100, "activo")).toBe(-100);
    expect(saldoNatural(100, 0, "pasivo")).toBe(-100);
  });
});
