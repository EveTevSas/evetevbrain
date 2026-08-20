import { describe, expect, it } from "vitest";
import { decidir, UMBRALES_INICIALES } from "./compuerta";

describe("compuerta de abstencion", () => {
  it("se abstiene cuando ninguna senal llega al umbral", () => {
    expect(decidir({ cobertura: 0.2 })).toEqual({ responder: false, motivo: "sin material" });
  });

  it("responde con solo la cobertura lexica, sin vectores", () => {
    expect(decidir({ cobertura: 0.8 })).toEqual({ responder: true, motivo: "cobertura" });
  });

  it("responde con solo el coseno, aunque el lexico falle", () => {
    // Es el caso que justifica el hibrido: la persona usa otras palabras.
    expect(decidir({ cobertura: 0.1, coseno: 0.9 })).toEqual({
      responder: true,
      motivo: "coseno"
    });
  });

  it("los umbrales de arranque no estan calibrados y se pueden sustituir", () => {
    expect(decidir({ cobertura: 0.4 }, { ...UMBRALES_INICIALES, cobertura: 0.3 }).responder).toBe(
      true
    );
  });
});
