import { tokenizar } from "./recuperar/texto.js";

/** Respuestas selladas: preguntas frecuentes con respuesta literal, que salen
 *  **sin llamar al modelo**. Son las mas rapidas, las mas baratas y las unicas
 *  con cero riesgo de invencion. En un sitio corporativo se llevan la mayor
 *  parte del trafico real. */
export interface Sellada {
  pregunta: string;
  variantes: string[];
  respuesta: string;
}

/** Parte `_selladas.md`: un `##` por pregunta, con sus lineas `**Variantes:**`
 *  y `**Respuesta:**`. */
export function leerSelladas(markdown: string): Sellada[] {
  const cuerpo = markdown.replace(/^---[\s\S]*?\n---\n/, "");
  const salida: Sellada[] = [];

  for (const bloque of cuerpo.split(/^## /m).slice(1)) {
    const lineas = bloque.split(/\r?\n/);
    const pregunta = (lineas.shift() ?? "").trim();
    const resto = lineas.join("\n");

    const variantes = /\*\*Variantes:\*\*\s*(.+)/.exec(resto);
    const respuesta = /\*\*Respuesta:\*\*\s*([\s\S]*)/.exec(resto);
    if (!pregunta || !respuesta) continue;

    salida.push({
      pregunta,
      variantes: (variantes?.[1] ?? "")
        .split("·")
        .map((v) => v.trim())
        .filter(Boolean),
      respuesta: (respuesta[1] ?? "").trim()
    });
  }

  return salida;
}

/** Cuanto de la pregunta sellada cubre lo que la persona escribio, y al reves.
 *  Se exige que el solape sea alto **en las dos direcciones**: si solo se mide
 *  en un sentido, la pregunta corta dispara con cualquier pregunta larga que la
 *  contenga, que casi siempre es otra pregunta distinta. */
const UMBRAL_SELLADA = 0.7;

export function buscarSellada(consulta: string, selladas: Sellada[]): Sellada | undefined {
  const tokensConsulta = new Set(tokenizar(consulta));
  if (tokensConsulta.size === 0) return undefined;

  let mejor: { sellada: Sellada; puntaje: number } | undefined;

  for (const sellada of selladas) {
    for (const candidata of [sellada.pregunta, ...sellada.variantes]) {
      const tokens = new Set(tokenizar(candidata));
      if (tokens.size === 0) continue;

      let comunes = 0;
      for (const t of tokens) if (tokensConsulta.has(t)) comunes++;
      const puntaje = Math.min(comunes / tokens.size, comunes / tokensConsulta.size);

      if (puntaje >= UMBRAL_SELLADA && (!mejor || puntaje > mejor.puntaje)) {
        mejor = { sellada, puntaje };
      }
    }
  }

  return mejor?.sellada;
}
