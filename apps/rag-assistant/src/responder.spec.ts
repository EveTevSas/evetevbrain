import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Indice } from "./indice/tipos";
import { responder, type Contexto } from "./responder";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const indice = JSON.parse(readFileSync(join(RAIZ, "indice", "indice.json"), "utf8")) as Indice;
const ctx: Contexto = { indice };

describe("los cuatro caminos de una respuesta", () => {
  it("sella una pregunta frecuente sin tocar el modelo", () => {
    const r = responder("como cobran?", ctx);
    expect(r.camino).toBe("sellada");
  });

  it("corta un tema vetado con texto fijo, sin tocar el modelo", () => {
    const r = responder("me conviene declarar renta con esto", ctx);
    expect(r.camino).toBe("limite");
  });

  it("se abstiene ante algo ajeno al negocio, sin tocar el modelo", () => {
    const r = responder("cual es la capital de Francia", ctx);
    expect(r.camino).toBe("abstencion");
    if (r.camino === "abstencion") expect(r.respuesta).toContain("contacto@evetev.com");
  });

  it("recupera y prepara la generacion cuando si hay material", () => {
    const r = responder("quien autoriza los gastos del conjunto", ctx);
    expect(r.camino).toBe("generar");
    if (r.camino === "generar") {
      expect(r.fragmentos[0]?.documentoId).toBe("eveconecta-aprobaciones");
      expect(r.fragmentos.length).toBeLessThanOrEqual(6);
    }
  });

  it("confirma la linea de IA sin inventarle producto", () => {
    // La empresa opera tres lineas y la web ofrece dos: el corpus tiene que
    // poder confirmar la tercera sin ficha de producto.
    const r = responder("hacen inteligencia artificial empresarial", ctx);
    expect(r.camino).toBe("generar");
    if (r.camino === "generar") {
      expect(r.fragmentos.map((f) => f.documentoId)).toContain("empresa-lineas");
    }
  });

  it("nunca entrega mas fragmentos de los que caben en el tope", () => {
    const r = responder("el dinero pasa por su tesoreria", { ...ctx, tope: 3 });
    if (r.camino === "generar") expect(r.fragmentos.length).toBeLessThanOrEqual(3);
  });
});

describe("hueco conocido: sin vectores el lexico no cubre el vocabulario", () => {
  it("recupera el fragmento equivocado cuando la persona usa otras palabras", () => {
    // «quedan/plata» contra «dinero/tesoreria/fondos»: la respuesta esta en la
    // base —evepay-gateway-puro— pero BM25 no llega a ella y trae otra cosa.
    // Es EXACTAMENTE el hueco que cierra la mitad densa de la recuperacion, y
    // el motivo por el que el hibrido no es un adorno. Se deja escrito para que
    // el dia que entren los vectores esto falle y haya que cambiarlo.
    const r = responder("ustedes se quedan con mi plata mientras tanto?", ctx);
    expect(r.camino).toBe("generar");
    if (r.camino === "generar") {
      expect(r.fragmentos[0]?.documentoId).not.toBe("evepay-gateway-puro");
    }
  });

  it("ya no se abstiene con la pregunta de cobro duplicado", () => {
    // Antes se abstenia con el fragmento correcto ya recuperado de primero: la
    // cobertura plana hundia el puntaje con las palabras de relleno de la
    // pregunta. Con la señal ponderada por idf pasa la compuerta.
    const r = responder("que pasa si mi cliente paga dos veces", ctx);
    expect(r.camino).toBe("generar");
    if (r.camino === "generar") {
      expect(r.fragmentos[0]?.documentoId).toBe("evepay-capacidades");
    }
  });
});
