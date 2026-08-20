/** Recorta un cuerpo en frases.
 *
 *  **Por puntuación, nunca por salto de línea.** Partir también por `\n` marcó
 *  «…todavía no se / puede usar en producción.» como si fuera una afirmación de
 *  disponibilidad: Prettier había reajustado el ancho del párrafo y la negación
 *  quedó en la línea anterior. Una regla que depende de dónde cae el salto de
 *  línea falla el día que alguien reformatea, así que los espacios del párrafo
 *  se normalizan antes de recortar. */
export function frases(cuerpo: string): string[] {
  const salida: string[] = [];
  for (const parrafo of cuerpo.split(/\n\s*\n/)) {
    const plano = parrafo.replace(/\s+/g, " ").trim();
    if (!plano) continue;
    for (const f of plano.split(/(?<=[.;:!?])\s+/)) {
      const limpia = f.trim();
      if (limpia) salida.push(limpia);
    }
  }
  return salida;
}
