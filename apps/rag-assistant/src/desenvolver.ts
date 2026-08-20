/** Junta las lineas de un parrafo en una sola, conservando los parrafos.
 *
 *  Los textos de `_selladas.md` y `_limites.md` estan escritos en Markdown con
 *  el ancho que le da Prettier, y esos saltos son de formato, no del mensaje.
 *  Sin esto la respuesta sale en la pantalla cortada por donde cayo el
 *  formateador. */
export function desenvolver(texto: string): string {
  return texto
    .split(/\n\s*\n/)
    .map((parrafo) => parrafo.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}
