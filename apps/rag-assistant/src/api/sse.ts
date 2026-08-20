import type { Evento } from "../atender.js";

/** Serializa eventos como SSE. Un formato de dos lineas: no hace falta una
 *  libreria para esto. */
export function comoSse(evento: Evento): string {
  return `data: ${JSON.stringify(evento)}\n\n`;
}

export const CABECERAS_SSE = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive"
} as const;
