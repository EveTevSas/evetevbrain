import { describe, expect, it } from "vitest";
import {
  describirErrores,
  leerTarifaComercio,
  montoDigitado,
  porcentaje,
  porcentajeABps
} from "./tarifas";

describe("porcentaje ↔ puntos básicos", () => {
  it("acepta coma o punto, y el signo de porcentaje", () => {
    expect(porcentajeABps("2,9")).toBe(290);
    expect(porcentajeABps("2.90")).toBe(290);
    expect(porcentajeABps(" 2,9 % ")).toBe(290);
    expect(porcentajeABps("0")).toBe(0);
    expect(porcentajeABps("100")).toBe(10_000);
  });

  it("lo que no es un número queda como NaN para que el esquema lo rechace", () => {
    expect(porcentajeABps("abc")).toBeNaN();
    expect(porcentajeABps("")).toBeNaN();
  });

  it("muestra 290 bps como 2,9 %", () => {
    expect(porcentaje(290)).toBe("2,9 %");
    expect(porcentaje(0)).toBe("0 %");
    expect(porcentaje(1900)).toBe("19 %");
  });
});

describe("montoDigitado", () => {
  it("acepta separadores de miles y el signo de pesos; vacío es cero", () => {
    expect(montoDigitado("1.200")).toBe(1200);
    expect(montoDigitado("$ 1.200")).toBe(1200);
    expect(montoDigitado("1200")).toBe(1200);
    expect(montoDigitado("")).toBe(0);
    expect(montoDigitado("x")).toBeNaN();
  });
});

describe("leerTarifaComercio", () => {
  it("traduce el formulario al contrato sin validarlo", () => {
    const f = new FormData();
    f.set("porcentaje", "2,9");
    f.set("fijo", "300");
    f.set("ivaBps", "1900");
    expect(leerTarifaComercio(f)).toEqual({ bps: 290, fijoMinor: 300, ivaBps: 1900 });
  });
});

describe("describirErrores", () => {
  it("cambia el nombre técnico del campo por el que ve la persona", () => {
    expect(describirErrores(["bps: fuera de rango", "ivaBps: solo 0 o 19"])).toBe(
      "Porcentaje: fuera de rango · IVA: solo 0 o 19"
    );
  });
});
