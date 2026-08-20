import type { Fragmento } from "./base/tipos.js";
import type { Indice } from "./indice/tipos.js";
import { buscarBm25, coberturaPonderada } from "./recuperar/bm25.js";
import {
  decidir,
  UMBRALES_INICIALES,
  type Decision,
  type Umbrales
} from "./recuperar/compuerta.js";
import { fusionarRrf } from "./recuperar/rrf.js";
import { buscarLimite } from "./limites.js";
import { buscarSellada } from "./selladas.js";

/** Todo lo que hace falta para enrutar viaja dentro del indice: fragmentos,
 *  BM25, selladas, limites y prompt. */
export interface Contexto {
  indice: Indice;
  umbrales?: Umbrales;
  /** Cuantos fragmentos se le entregan al modelo. */
  tope?: number;
}

export type Resultado =
  | { camino: "sellada"; respuesta: string; pregunta: string }
  | { camino: "limite"; respuesta: string; tema: string }
  | { camino: "abstencion"; respuesta: string; senales: Senales }
  | { camino: "generar"; fragmentos: Fragmento[]; senales: Senales; decision: Decision };

export interface Senales {
  cobertura: number;
  coseno?: number;
}

/** El camino de una respuesta. **Dos de las cuatro salidas no llegan al
 *  modelo**: la sellada y la abstencion. En un sitio corporativo se llevan la
 *  mayor parte del trafico, cuestan cero y no pueden inventar nada. */
export function responder(consulta: string, ctx: Contexto): Resultado {
  const sellada = buscarSellada(consulta, ctx.indice.selladas);
  if (sellada) {
    return { camino: "sellada", respuesta: sellada.respuesta, pregunta: sellada.pregunta };
  }

  const limite = buscarLimite(consulta, ctx.indice.limites);
  if (limite) {
    return { camino: "limite", respuesta: limite.respuesta, tema: limite.tema };
  }

  const tope = ctx.tope ?? 6;
  const lexicos = buscarBm25(ctx.indice.bm25, consulta, 20);
  // Con una sola lista, RRF solo reordena por posicion y no cambia nada. Se
  // llama igual para que el dia que entren los vectores solo haya que anadir la
  // segunda lista aqui, y no reescribir el camino.
  const fusionados = fusionarRrf([lexicos], tope);

  const fragmentos = fusionados
    .map((f) => ctx.indice.fragmentos[f.posicion])
    .filter((f): f is Fragmento => f !== undefined);

  const mejor = fragmentos[0];
  const senales: Senales = {
    cobertura: mejor ? coberturaPonderada(ctx.indice.bm25, consulta, mejor.texto) : 0
  };
  const decision = decidir(senales, ctx.umbrales ?? UMBRALES_INICIALES);

  if (!decision.responder || fragmentos.length === 0) {
    return { camino: "abstencion", respuesta: ctx.indice.limites.derivacionGeneral, senales };
  }

  return { camino: "generar", fragmentos, senales, decision };
}
