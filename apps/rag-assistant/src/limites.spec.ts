import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buscarLimite, leerLimites } from "./limites";

const BASE = join(dirname(fileURLToPath(import.meta.url)), "..", "base");
const limites = leerLimites(readFileSync(join(BASE, "_limites.md"), "utf8"));

describe("limites", () => {
  it("saca la derivacion general del archivo", () => {
    expect(limites.derivacionGeneral).toContain("contacto@evetev.com");
  });

  it("lee las senales aunque el formateador parta la linea en dos", () => {
    // Regresion: el patron estaba anclado a la linea y Prettier reflowo la
    // cursiva y cambio `*` por `_`, asi que el limite de asesoria legal nunca
    // se disparaba y la pregunta se iba por abstencion.
    const legal = limites.temas.find((t) => t.tema.startsWith("Asesoría legal"));
    expect(legal?.senales).toContain("qué me recomiendas invertir");
  });

  it("detecta la asesoria tributaria", () => {
    expect(buscarLimite("me conviene declarar renta con esto", limites)?.tema).toMatch(/Asesoría/);
  });

  it("detecta la peticion de comparacion", () => {
    expect(buscarLimite("cual es la diferencia con otra pasarela", limites)).toBeDefined();
  });

  it("no dispara con una pregunta normal de producto", () => {
    expect(buscarLimite("que es evepay", limites)).toBeUndefined();
  });
});
