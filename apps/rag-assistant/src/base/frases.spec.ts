import { describe, expect, it } from "vitest";
import { frases } from "./frases";

describe("recorte en frases", () => {
  it("no parte una frase que el formateador dejo en dos lineas", () => {
    // Regresion: Prettier reajusto el ancho del parrafo y la negacion quedo en
    // la linea anterior, asi que el validador leyo "puede usar en produccion"
    // como una afirmacion. El recorte va por puntuacion, nunca por salto.
    const cuerpo =
      "es la razon por la que el nucleo ya esta construido y EvePay\ntodavia no se puede usar en produccion.";
    expect(frases(cuerpo)).toEqual([
      "es la razon por la que el nucleo ya esta construido y EvePay todavia no se puede usar en produccion."
    ]);
  });

  it("separa frases por puntuacion", () => {
    expect(frases("Una. Dos; tres. ")).toEqual(["Una.", "Dos;", "tres."]);
  });

  it("trata los parrafos por separado", () => {
    expect(frases("Uno\n\nDos")).toEqual(["Uno", "Dos"]);
  });
});
