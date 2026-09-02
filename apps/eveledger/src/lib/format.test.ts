import { describe, it, expect } from "vitest";
import { fechaAInput, inputAFecha, formatoFecha, formatoPesos, formatoGalones } from "./format";

// Todo se guarda como medianoche UTC. Estos tests protegen el viaje redondo
// input ↔ Date: el error clásico es que un huso horario negativo (Colombia es
// UTC-5) corra la fecha un día al pasar por hora local.
describe("fechas en medianoche UTC", () => {
  it("inputAFecha produce medianoche UTC exacta", () => {
    const f = inputAFecha("2026-03-15");
    expect(f.toISOString()).toBe("2026-03-15T00:00:00.000Z");
  });

  it("el viaje redondo input → Date → input no corre el día", () => {
    expect(fechaAInput(inputAFecha("2026-03-15"))).toBe("2026-03-15");
    expect(fechaAInput(inputAFecha("2026-01-01"))).toBe("2026-01-01");
    expect(fechaAInput(inputAFecha("2026-12-31"))).toBe("2026-12-31");
  });

  it("formatoFecha usa el día UTC, sin correrlo al huso local", () => {
    // El separador y los ceros dependen de la versión de ICU; lo protegido es
    // que en UTC-5 el 5 de marzo no se muestre como 4 de marzo.
    expect(formatoFecha(inputAFecha("2026-03-05"))).toMatch(/^5\/0?3\/2026$/);
  });
});

describe("formato es-CO", () => {
  it("pesos con 2 decimales", () => {
    //  : es-CO separa el símbolo con espacio duro.
    expect(formatoPesos(1234567.5).replace(/ /g, " ")).toBe("$ 1.234.567,50");
  });

  it("galones con 3 decimales", () => {
    expect(formatoGalones(1234.5)).toBe("1.234,500");
  });
});
