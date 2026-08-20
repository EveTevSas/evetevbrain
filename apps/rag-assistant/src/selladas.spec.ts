import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buscarSellada, leerSelladas } from "./selladas";

const BASE = join(dirname(fileURLToPath(import.meta.url)), "..", "base");
const selladas = leerSelladas(readFileSync(join(BASE, "_selladas.md"), "utf8"));

describe("respuestas selladas", () => {
  it("lee todas las del archivo con su respuesta", () => {
    expect(selladas.length).toBeGreaterThanOrEqual(10);
    expect(selladas.every((s) => s.respuesta.length > 0)).toBe(true);
  });

  it("responde una pregunta frecuente sin tocar el modelo", () => {
    expect(buscarSellada("como cobran?", selladas)?.pregunta).toBe("¿Cómo cobran?");
  });

  it("reconoce una variante", () => {
    expect(buscarSellada("cuanto cuesta", selladas)).toBeDefined();
  });

  it("no sella una pregunta que solo contiene a la sellada", () => {
    // El solape se exige en las DOS direcciones: si solo se midiera en una,
    // esta pregunta se llevaria la respuesta generica de tarifas, que no
    // responde lo que se pregunto.
    const otra =
      "como cobran los conjuntos la cuota de administracion cuando hay mora y se acumula";
    expect(buscarSellada(otra, selladas)).toBeUndefined();
  });

  it("no sella algo ajeno al negocio", () => {
    expect(buscarSellada("cual es la capital de Francia", selladas)).toBeUndefined();
  });
});
