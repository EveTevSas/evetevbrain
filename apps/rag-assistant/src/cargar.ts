import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Indice } from "./indice/tipos.js";
import { extraerPromptDeSistema } from "./generar/plantilla.js";
import { leerLimites, type Limites } from "./limites.js";
import { leerSelladas, type Sellada } from "./selladas.js";

/** Carga lo que el asistente necesita para atender: indice, selladas, limites y
 *  el prompt de anclaje. Todo son archivos del repositorio, asi que esto es
 *  lectura de disco y nada mas — no hay base de datos que despertar. */
export interface Cargado {
  indice: Indice;
  selladas: Sellada[];
  limites: Limites;
  sistema: string;
}

export function cargar(raiz = raizPorDefecto()): Cargado {
  const leer = (...partes: string[]) => readFileSync(join(raiz, ...partes), "utf8");
  return {
    indice: JSON.parse(leer("indice", "indice.json")) as Indice,
    selladas: leerSelladas(leer("base", "_selladas.md")),
    limites: leerLimites(leer("base", "_limites.md")),
    sistema: extraerPromptDeSistema(leer("base", "_sistema.md"))
  };
}

function raizPorDefecto(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}
