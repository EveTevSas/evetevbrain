import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Indice } from "./indice/tipos.js";

/** Carga el indice compilado. **Es lo unico que hace falta para atender**:
 *  fragmentos, BM25, selladas, limites y el prompt de anclaje viajan todos
 *  dentro del mismo archivo.
 *
 *  Se hizo asi al montar el endpoint: si la funcion desplegada tuviera que leer
 *  `base/*.md` habria que acertar con `includeFiles` y con rutas relativas que
 *  cambian al empaquetar — un modo de fallo que solo aparece en produccion. Un
 *  artefacto, importado como modulo, no tiene ese problema. */
export function cargar(raiz = raizPorDefecto()): Indice {
  return JSON.parse(readFileSync(join(raiz, "indice", "indice.json"), "utf8")) as Indice;
}

function raizPorDefecto(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}
