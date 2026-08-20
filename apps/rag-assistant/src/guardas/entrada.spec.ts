import { describe, expect, it } from "vitest";
import { origenPermitido, POR_DEFECTO, validarCuerpo } from "./entrada";

const PERMITIDOS = ["https://evetev.com"];

describe("guarda de origen", () => {
  it("deja pasar un origen de la lista", () => {
    expect(origenPermitido("https://evetev.com", PERMITIDOS)).toBe(true);
  });

  it("deja pasar una preview del propio proyecto y localhost", () => {
    expect(origenPermitido("https://rag-assistant-abc123.vercel.app", PERMITIDOS)).toBe(true);
    expect(origenPermitido("http://localhost:3005", PERMITIDOS)).toBe(true);
  });

  it("rechaza cualquier otro origen", () => {
    expect(origenPermitido("https://sitio-ajeno.com", PERMITIDOS)).toBe(false);
  });

  it("rechaza la peticion sin cabecera de origen", () => {
    expect(origenPermitido(undefined, PERMITIDOS)).toBe(false);
  });
});

describe("validacion del cuerpo", () => {
  it("acepta un mensaje normal", () => {
    expect(validarCuerpo({ mensaje: " hola " }, POR_DEFECTO.topeMensaje)).toEqual({
      valido: true,
      mensaje: "hola"
    });
  });

  it("rechaza el mensaje vacio", () => {
    const v = validarCuerpo({ mensaje: "   " }, POR_DEFECTO.topeMensaje);
    expect(v).toMatchObject({ valido: false, motivo: "mensaje_vacio" });
  });

  it("rechaza el mensaje mas largo que el tope", () => {
    const v = validarCuerpo({ mensaje: "x".repeat(501) }, POR_DEFECTO.topeMensaje);
    expect(v).toMatchObject({ valido: false, motivo: "mensaje_largo" });
  });

  it("la trampa responde 200 y no hace nada", () => {
    // 200 a proposito: al bot no se le confirma que fue detectado.
    const v = validarCuerpo({ mensaje: "hola", apellido2: "bot" }, POR_DEFECTO.topeMensaje);
    expect(v).toEqual({ valido: false, estado: 200, motivo: "trampa" });
  });
});
