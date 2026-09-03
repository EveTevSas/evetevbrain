import { describe, expect, it } from "vitest";
import { digitoVerificacionNit, nitCoincideConDv } from "./nit.util";

describe("digitoVerificacionNit (algoritmo DIAN)", () => {
  /* NITs reales de entidades públicas colombianas, con su DV publicado. Se
     usan de referencia porque cualquiera puede verificarlos por fuera. */
  it.each([
    ["830053105", 3], // Cámara de Comercio de Bogotá
    ["800197268", 4], // DIAN
    ["899999061", 9], // Universidad Nacional de Colombia
    ["860007336", 1] // Banco de Bogotá
  ])("%s → DV %i", (numero, esperado) => {
    expect(digitoVerificacionNit(numero)).toBe(esperado);
  });

  it("acepta el número con puntos y guiones, como lo escribe la gente", () => {
    expect(digitoVerificacionNit("830.053.105")).toBe(3);
    expect(digitoVerificacionNit("830-053-105")).toBe(3);
    expect(digitoVerificacionNit(" 830053105 ")).toBe(3);
  });

  it("un número con letras o vacío no tiene dígito", () => {
    expect(digitoVerificacionNit("830O53105")).toBeNull();
    expect(digitoVerificacionNit("")).toBeNull();
    expect(digitoVerificacionNit("abc")).toBeNull();
  });

  it("un número más largo que la serie de primos no se calcula a medias", () => {
    expect(digitoVerificacionNit("1".repeat(16))).toBeNull();
  });
});

describe("nitCoincideConDv", () => {
  it("acepta el par correcto y rechaza el equivocado", () => {
    expect(nitCoincideConDv("830053105", "3")).toBe(true);
    expect(nitCoincideConDv("830053105", "7")).toBe(false);
  });

  /* El caso que esto existe para atrapar: un dígito cambiado al teclear. El
     número sigue pareciendo válido y solo el DV lo delata. */
  it("detecta un dígito transpuesto en el número", () => {
    // 830053105 → 830053015 (dos dígitos cambiados de orden)
    expect(nitCoincideConDv("830053015", "3")).toBe(false);
  });

  it("sin DV declarado no bloquea: una cédula no lleva", () => {
    expect(nitCoincideConDv("1020304050", "")).toBe(true);
    expect(nitCoincideConDv("1020304050", null)).toBe(true);
    expect(nitCoincideConDv("1020304050", undefined)).toBe(true);
  });
});
