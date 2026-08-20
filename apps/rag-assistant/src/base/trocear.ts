import type { Documento, Fragmento } from "./tipos.js";
import type { Reglas } from "./reglas.js";

/** Estimación de tokens. No se llama a un tokenizador real a propósito: el
 *  troceo solo necesita saber si una sección se pasa de larga, y un factor
 *  sobre el número de palabras basta. Errar por poco aquí no rompe nada. */
export function tokensAprox(texto: string): number {
  const palabras = texto.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(palabras * 1.35);
}

/** Trocea un documento **por sección semántica**, no por número de caracteres:
 *  un encabezado `##` y su cuerpo son un fragmento. Una sección que se pase del
 *  máximo se parte por párrafo, con una frase de solape para que la costura no
 *  deje una idea partida en dos mitades que ninguna se entiende sola. */
export function trocear(doc: Documento, reglas: Reglas): Fragmento[] {
  const secciones = partirPorEncabezado(doc.cuerpo, doc.titulo);
  const fragmentos: Fragmento[] = [];

  for (const seccion of secciones) {
    const trozos =
      tokensAprox(seccion.texto) <= reglas.troceo.tokensMaximo
        ? [seccion.texto]
        : partirLargo(seccion.texto, reglas.troceo.tokensObjetivo, reglas.troceo.solapeFrases);

    for (const texto of trozos) {
      fragmentos.push({
        id: `${doc.id}#${fragmentos.length + 1}`,
        documentoId: doc.id,
        titulo: doc.titulo,
        seccion: seccion.titulo,
        texto: texto.trim(),
        contexto: "",
        producto: doc.producto,
        audiencia: doc.audiencia,
        confianza: doc.confianza,
        vigencia: doc.vigencia
      });
    }
  }

  return fragmentos;
}

interface Seccion {
  titulo: string;
  texto: string;
}

function partirPorEncabezado(cuerpo: string, tituloDocumento: string): Seccion[] {
  const lineas = cuerpo.split(/\r?\n/);
  const secciones: Seccion[] = [];
  let actual: Seccion = { titulo: tituloDocumento, texto: "" };

  for (const linea of lineas) {
    const encabezado = /^##\s+(.*)$/.exec(linea);
    if (encabezado) {
      if (actual.texto.trim()) secciones.push(actual);
      actual = { titulo: (encabezado[1] ?? "").trim(), texto: "" };
    } else {
      actual.texto += `${linea}\n`;
    }
  }
  if (actual.texto.trim()) secciones.push(actual);

  // El encabezado viaja dentro del texto del fragmento: es señal de búsqueda y
  // le da al modelo el título de lo que está leyendo.
  return secciones.map((s) => ({
    titulo: s.titulo,
    texto: `## ${s.titulo}\n\n${s.texto.trim()}`
  }));
}

function partirLargo(texto: string, objetivo: number, solape: number): string[] {
  const parrafos = texto.split(/\n\s*\n/).filter((p) => p.trim());
  const trozos: string[] = [];
  let acumulado: string[] = [];

  for (const parrafo of parrafos) {
    acumulado.push(parrafo);
    if (tokensAprox(acumulado.join("\n\n")) < objetivo) continue;
    trozos.push(acumulado.join("\n\n"));
    acumulado = solape > 0 ? ultimasFrases(parrafo, solape) : [];
  }
  if (acumulado.length && acumulado.join("").trim()) trozos.push(acumulado.join("\n\n"));

  return trozos.length ? trozos : [texto];
}

function ultimasFrases(parrafo: string, cuantas: number): string[] {
  const partes = parrafo
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.;:!?])\s+/);
  const cola = partes.slice(-cuantas).join(" ").trim();
  return cola ? [cola] : [];
}
