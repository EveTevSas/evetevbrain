import { sinTildes } from "../normalizar.js";

/** Normalización y tokenización para el español.
 *
 *  Deliberadamente conservadora: sin raíz morfológica agresiva. Un stemmer
 *  fuerte confunde «pago» con «pagar» y también «pasarela» con «pasar», y en un
 *  corpus de 400 fragmentos ese ruido cuesta más de lo que aporta. Se quita el
 *  plural simple y nada más. */

const VACIAS = new Set([
  "a",
  "al",
  "algo",
  "alguna",
  "algunas",
  "alguno",
  "algunos",
  "ante",
  "antes",
  "como",
  "con",
  "contra",
  "cual",
  "cuales",
  "cuando",
  "de",
  "del",
  "desde",
  "donde",
  "dos",
  "el",
  "ella",
  "ellas",
  "ellos",
  "en",
  "entre",
  "era",
  "es",
  "esa",
  "esas",
  "ese",
  "eso",
  "esos",
  "esta",
  "estan",
  "estas",
  "este",
  "esto",
  "estos",
  "ha",
  "hace",
  "hacen",
  "hasta",
  "hay",
  "la",
  "las",
  "le",
  "les",
  "lo",
  "los",
  "mas",
  "me",
  "mi",
  "mucho",
  "muy",
  "ni",
  "no",
  "nos",
  "nosotros",
  "o",
  "otra",
  "otras",
  "otro",
  "otros",
  "para",
  "pero",
  "poco",
  "por",
  "porque",
  "que",
  "quien",
  "se",
  "ser",
  "si",
  "sin",
  "sobre",
  "solo",
  "son",
  "su",
  "sus",
  "tambien",
  "tanto",
  "te",
  "tiene",
  "tienen",
  "toda",
  "todas",
  "todo",
  "todos",
  "tu",
  "un",
  "una",
  "unas",
  "uno",
  "unos",
  "usted",
  "ustedes",
  "y",
  "ya",
  "yo"
]);

export function normalizar(texto: string): string {
  return sinTildes(texto.toLowerCase());
}

export function tokenizar(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9ñ]+/)
    .filter((t) => t.length > 0)
    .filter((t) => !VACIAS.has(t))
    .filter((t) => t.length >= 3 || /^\d+$/.test(t))
    .map(quitarPlural);
}

/** Quita el plural más común del español. `-es` solo tras consonante, para no
 *  destrozar «mes» ni «pies». */
function quitarPlural(token: string): string {
  if (token.length > 4 && /[^aeiou]es$/.test(token)) return token.slice(0, -2);
  if (token.length > 3 && /[aeiou]s$/.test(token)) return token.slice(0, -1);
  return token;
}
