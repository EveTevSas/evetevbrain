import { describe, expect, it } from "vitest";
import { normalizar, tokenizar } from "./texto";

describe("normalizacion", () => {
  it("quita tildes pero conserva la ene", () => {
    expect(normalizar("Año Señor Bogotá")).toBe("año señor bogota");
  });
});

describe("tokenizacion", () => {
  it("descarta vacias y palabras de menos de tres letras", () => {
    expect(tokenizar("el pago de la cuota")).toEqual(["pago", "cuota"]);
  });

  it("conserva las cifras aunque sean cortas", () => {
    expect(tokenizar("son 3 pasos")).toContain("3");
  });

  it("quita el plural simple sin destrozar palabras cortas", () => {
    expect(tokenizar("pagos comercios mes")).toEqual(["pago", "comercio", "mes"]);
  });
});
