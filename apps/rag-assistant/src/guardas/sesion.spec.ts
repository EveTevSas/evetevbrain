import { describe, expect, it } from "vitest";
import { emitirSesion, verificarSesion } from "./sesion";

const SECRETO = "secreto-de-prueba";

describe("token de sesion", () => {
  it("el que emite es el que verifica", () => {
    const token = emitirSesion(SECRETO);
    expect(verificarSesion(token, SECRETO)).toMatchObject({ valida: true });
  });

  it("rechaza una firma manipulada", () => {
    const token = emitirSesion(SECRETO);
    const roto = `${token.slice(0, -3)}xyz`;
    expect(verificarSesion(roto, SECRETO)).toMatchObject({
      valida: false,
      motivo: "firma_invalida"
    });
  });

  it("rechaza el token firmado con otro secreto", () => {
    expect(verificarSesion(emitirSesion("otro"), SECRETO)).toMatchObject({ valida: false });
  });

  it("rechaza el token vencido", () => {
    const token = emitirSesion(SECRETO, 0);
    expect(verificarSesion(token, SECRETO, 60 * 60 * 1000)).toMatchObject({
      valida: false,
      motivo: "sesion_vencida"
    });
  });

  it("rechaza la peticion sin token", () => {
    expect(verificarSesion(undefined, SECRETO)).toMatchObject({
      valida: false,
      motivo: "sin_sesion"
    });
  });
});
