import { describe, expect, it } from "vitest";
import { cortarFrases } from "./frases-seguras";

describe("corte en frases seguras", () => {
  it("no suelta nada mientras la frase no este cerrada", () => {
    expect(cortarFrases("El dinero va directo", false)).toEqual({
      listas: [],
      resto: "El dinero va directo"
    });
  });

  it("no suelta la frase hasta saber que no le sigue una cita", () => {
    // El punto no cierra la frase: la cita va DESPUES del punto.
    expect(cortarFrases("El dinero va directo.", false).listas).toEqual([]);
  });

  it("suelta la frase con su cita cuando ya llego lo siguiente", () => {
    const r = cortarFrases("Va directo. [#evepay-gateway-puro#1] Ademas", false);
    expect(r.listas).toEqual(["Va directo. [#evepay-gateway-puro#1]"]);
    expect(r.resto.trim()).toBe("Ademas");
  });

  it("no corta con una cita a medias", () => {
    expect(cortarFrases("Va directo. [#evepay-gate", false).listas).toEqual([]);
  });

  it("al terminar el flujo suelta lo que quede", () => {
    const r = cortarFrases("Va directo. [#evepay-gateway-puro#1]", true);
    expect(r.listas).toEqual(["Va directo. [#evepay-gateway-puro#1]"]);
    expect(r.resto).toBe("");
  });

  it("separa varias frases seguidas", () => {
    const r = cortarFrases("Una. Dos. Tres", false);
    expect(r.listas).toEqual(["Una.", "Dos."]);
    expect(r.resto.trim()).toBe("Tres");
  });
});
