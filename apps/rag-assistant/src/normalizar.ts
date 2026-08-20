/** Quita tildes conservando la ene.
 *
 *  En NFD la ene se descompone en `n` + tilde combinante (U+0303), asi que
 *  quitar todo el rango de marcas convertiria «año» en «ano» y «señor» en
 *  «senor». Se quita el rango entero MENOS U+0303.
 *
 *  Vive aparte porque lo usan tres capas que no deberian depender entre si: el
 *  tokenizador, el validador del corpus y el detector de limites. */
export function sinTildes(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u0302\u0304-\u036f]/g, "")
    .normalize("NFC");
}
