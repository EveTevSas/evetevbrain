import type { Puntuado } from "./bm25.js";

/** Fusión por rango recíproco (Reciprocal Rank Fusion).
 *
 *  Fusiona por **posición**, no por puntaje, y ese es todo el punto: BM25 y el
 *  coseno viven en escalas incompatibles, y promediarlas es el error que rompe
 *  las tuberías RAG en producción. `k = 60` es el valor que la literatura
 *  reporta como estable.
 *
 *  **Lo que RRF no sirve para decidir es si responder.** Un primer puesto suma
 *  `1/(60+1)` tanto si el resultado es perfecto como si es basura, porque solo
 *  mira la posición. De eso se encarga la compuerta, con la cobertura léxica y
 *  el coseno crudos. */
const K = 60;

export function fusionarRrf(listas: Puntuado[][], tope: number): Puntuado[] {
  const acumulado = new Map<number, number>();

  for (const lista of listas) {
    lista.forEach((item, indice) => {
      acumulado.set(item.posicion, (acumulado.get(item.posicion) ?? 0) + 1 / (K + indice + 1));
    });
  }

  return [...acumulado.entries()]
    .map(([posicion, puntaje]) => ({ posicion, puntaje }))
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, tope);
}
