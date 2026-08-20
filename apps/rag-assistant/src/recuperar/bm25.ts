import { tokenizar } from "./texto.js";

/** BM25 precompilado. Los postings, las frecuencias documentales y las
 *  longitudes se calculan al compilar la base; en ejecución esto es una
 *  búsqueda en tabla y cuesta menos de 5 ms sobre un corpus de este tamaño. */
export interface IndiceBm25 {
  /** término → [posición del documento, frecuencia en él][] */
  postings: Record<string, [number, number][]>;
  /** longitud en tokens de cada documento, en el mismo orden que los fragmentos */
  longitudes: number[];
  longitudMedia: number;
  total: number;
}

const K1 = 1.5;
const B = 0.75;

export function construirBm25(textos: string[]): IndiceBm25 {
  const postings: Record<string, [number, number][]> = {};
  const longitudes: number[] = [];

  textos.forEach((texto, i) => {
    const tokens = tokenizar(texto);
    longitudes.push(tokens.length);
    const frecuencias = new Map<string, number>();
    for (const t of tokens) frecuencias.set(t, (frecuencias.get(t) ?? 0) + 1);
    for (const [termino, f] of frecuencias) {
      (postings[termino] ??= []).push([i, f]);
    }
  });

  const suma = longitudes.reduce((a, b) => a + b, 0);
  return {
    postings,
    longitudes,
    longitudMedia: longitudes.length ? suma / longitudes.length : 0,
    total: textos.length
  };
}

export interface Puntuado {
  posicion: number;
  puntaje: number;
}

export function buscarBm25(indice: IndiceBm25, consulta: string, tope = 20): Puntuado[] {
  const terminos = tokenizar(consulta);
  const acumulado = new Map<number, number>();

  for (const termino of terminos) {
    const posting = indice.postings[termino];
    if (!posting) continue;
    const idf = Math.log(1 + (indice.total - posting.length + 0.5) / (posting.length + 0.5));
    for (const [posicion, frecuencia] of posting) {
      const longitud = indice.longitudes[posicion] ?? 0;
      const norma = 1 - B + (B * longitud) / (indice.longitudMedia || 1);
      const parcial = (idf * (frecuencia * (K1 + 1))) / (frecuencia + K1 * norma);
      acumulado.set(posicion, (acumulado.get(posicion) ?? 0) + parcial);
    }
  }

  return [...acumulado.entries()]
    .map(([posicion, puntaje]) => ({ posicion, puntaje }))
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, tope);
}

/** Proporción de términos de la consulta que aparecen en un documento.
 *
 *  Es la señal que usa la compuerta, y no el puntaje BM25 ni el de la fusión:
 *  BM25 no está acotado y depende del corpus, y RRF puntúa por **posición**, así
 *  que su valor es el mismo tanto si el primer resultado es perfecto como si es
 *  basura. La cobertura está en [0,1], se explica en una frase y se calibra. */
export function cobertura(consulta: string, texto: string): number {
  const terminos = new Set(tokenizar(consulta));
  if (terminos.size === 0) return 0;
  const enDocumento = new Set(tokenizar(texto));
  let encontrados = 0;
  for (const t of terminos) if (enDocumento.has(t)) encontrados++;
  return encontrados / terminos.size;
}

/** Cobertura **ponderada por idf**: cuánto del *peso informativo* de la
 *  pregunta aparece en el fragmento.
 *
 *  La cobertura plana trata «pasa» y «cliente» igual que «idempotencia», y por
 *  eso «¿qué pasa si mi cliente paga dos veces?» se abstenía **con el fragmento
 *  correcto ya recuperado de primero**: las palabras de relleno de la pregunta
 *  hundían la proporción. Pesar cada término por su idf hace que manden los
 *  términos que discriminan, que son los que de verdad dicen si el fragmento
 *  habla de lo que se preguntó.
 *
 *  Un término que no está en el corpus recibe el idf más alto y cuenta como no
 *  cubierto: por eso una pregunta ajena al negocio sigue dando cerca de cero. */
export function coberturaPonderada(indice: IndiceBm25, consulta: string, texto: string): number {
  const terminos = [...new Set(tokenizar(consulta))];
  if (terminos.length === 0) return 0;
  const enDocumento = new Set(tokenizar(texto));

  let total = 0;
  let cubierto = 0;
  for (const termino of terminos) {
    const df = indice.postings[termino]?.length ?? 0;
    const idf = Math.log(1 + (indice.total - df + 0.5) / (df + 0.5));
    total += idf;
    if (enDocumento.has(termino)) cubierto += idf;
  }
  return total === 0 ? 0 : cubierto / total;
}
