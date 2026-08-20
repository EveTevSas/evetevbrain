import { beforeEach, describe, expect, it } from "vitest";
import { anotarUso, consultarCupo, reiniciarCupos, type LimitesCupo } from "./cupos";

const LIMITES: LimitesCupo = {
  porVentana: 2,
  ventanaMs: 1000,
  porDia: 3,
  tokensPorDia: 500
};

beforeEach(reiniciarCupos);

describe("cupos", () => {
  it("deja pasar hasta el tope de la ventana", () => {
    expect(consultarCupo("a", LIMITES, 0).permitido).toBe(true);
    anotarUso("a", 1, 0);
    anotarUso("a", 1, 0);
    expect(consultarCupo("a", LIMITES, 0)).toMatchObject({
      permitido: false,
      motivo: "cupo_ventana"
    });
  });

  it("la ventana se libera con el tiempo", () => {
    anotarUso("a", 1, 0);
    anotarUso("a", 1, 0);
    expect(consultarCupo("a", LIMITES, 5000).permitido).toBe(true);
  });

  it("el cupo diario aguanta aunque la ventana se libere", () => {
    for (let i = 0; i < 3; i++) anotarUso("a", 1, i * 2000);
    expect(consultarCupo("a", LIMITES, 10_000)).toMatchObject({
      permitido: false,
      motivo: "cupo_dia"
    });
  });

  it("el presupuesto de tokens corta a todo el mundo, no solo a quien lo gasto", () => {
    anotarUso("derrochador", 600, 0);
    expect(consultarCupo("otro", LIMITES, 0)).toMatchObject({
      permitido: false,
      motivo: "presupuesto"
    });
  });

  it("cada clave lleva su propio contador", () => {
    anotarUso("a", 1, 0);
    anotarUso("a", 1, 0);
    expect(consultarCupo("b", LIMITES, 0).permitido).toBe(true);
  });
});
