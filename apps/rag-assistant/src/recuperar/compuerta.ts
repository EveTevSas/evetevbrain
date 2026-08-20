/** La compuerta de abstención: decide **si** se responde, antes de gastar un
 *  token. Es la capa 2 del cierre del ambiente y la más barata de todas — es
 *  imposible que el modelo invente sobre algo que nunca se le preguntó.
 *
 *  No mira el puntaje de la fusión a propósito (ver `rrf.ts`). Mira las dos
 *  señales crudas, cada una acotada y explicable:
 *
 *  - **cobertura léxica** — qué proporción de los términos de la pregunta
 *    aparece en el mejor fragmento. Está en [0,1].
 *  - **coseno** — la similitud del mejor fragmento denso. En [-1,1], y ausente
 *    mientras el índice se compile sin vectores.
 *
 *  Basta con que UNA de las dos pase: son señales complementarias justamente
 *  porque fallan en sitios distintos. */

export interface Umbrales {
  cobertura: number;
  coseno: number;
}

/** Valores de arranque. **Sin calibrar todavía**: se fijan con el set dorado en
 *  cuanto exista, y hasta entonces son una conjetura razonada, no un número
 *  medido. */
export const UMBRALES_INICIALES: Umbrales = { cobertura: 0.5, coseno: 0.55 };

export interface Señales {
  cobertura: number;
  coseno?: number;
}

export type Decision =
  | { responder: true; motivo: "cobertura" | "coseno" }
  | { responder: false; motivo: "sin material" };

export function decidir(señales: Señales, umbrales: Umbrales = UMBRALES_INICIALES): Decision {
  if (señales.coseno !== undefined && señales.coseno >= umbrales.coseno) {
    return { responder: true, motivo: "coseno" };
  }
  if (señales.cobertura >= umbrales.cobertura) {
    return { responder: true, motivo: "cobertura" };
  }
  return { responder: false, motivo: "sin material" };
}
