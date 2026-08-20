import { sinTildes } from "./normalizar.js";

/** Los temas que Eve no responde, con la respuesta **ya redactada**.
 *
 *  No se le pide al modelo que juzgue si una pregunta es asesoria legal: se
 *  detecta el tema y sale el texto fijo. Un juicio que el modelo hace es un
 *  juicio que el modelo puede fallar. */
export interface Limite {
  tema: string;
  /** Palabras y giros que delatan el tema. Salen del propio `_limites.md`. */
  senales: string[];
  respuesta: string;
}

export interface Limites {
  /** La que se usa cuando la recuperacion no alcanza el umbral. */
  derivacionGeneral: string;
  temas: Limite[];
}

const TEMA_GENERAL = "Derivacion general";

export function leerLimites(markdown: string): Limites {
  const cuerpo = markdown.replace(/^---[\s\S]*?\n---\n/, "");
  const temas: Limite[] = [];
  let derivacionGeneral = "";

  for (const bloque of cuerpo.split(/^## /m).slice(1)) {
    const lineas = bloque.split(/\r?\n/);
    const tema = (lineas.shift() ?? "").trim();
    const resto = lineas.join("\n");

    const respuesta = [...resto.matchAll(/^>\s?(.*)$/gm)]
      .map((m) => (m[1] ?? "").trim())
      .join(" ")
      .trim();
    if (!tema || !respuesta) continue;

    // La linea de senales se lee sobre el parrafo con los espacios normalizados,
    // NUNCA anclada a la linea. Prettier la reflowo en dos lineas y ademas
    // cambio el delimitador de cursiva de `*` a `_`, asi que un patron anclado
    // dejo de encontrarla y el limite de asesoria legal nunca se disparaba. Es
    // el mismo fallo que ya se corrigio en el validador: si una regla depende
    // de donde cae el salto de linea, se rompe el dia que alguien reformatea.
    const plano = resto.replace(/^>.*$/gm, "").replace(/\s+/g, " ");
    const crudoSenales = /[_*]([^_*]+)[_*]/.exec(plano)?.[1] ?? "";
    const senales = [...crudoSenales.matchAll(/[«"]([^»"]+)[»"]/g)]
      .map((m) => (m[1] ?? "").trim())
      .filter(Boolean);

    if (sinTildes(tema).toLowerCase() === sinTildes(TEMA_GENERAL).toLowerCase()) {
      derivacionGeneral = respuesta;
    } else {
      temas.push({ tema, senales, respuesta });
    }
  }

  return { derivacionGeneral, temas };
}

/** Devuelve el limite que cubre la consulta, si alguno. Comparacion literal
 *  sobre el texto normalizado: si una senal hay que afinarla, se afina en
 *  `_limites.md` y no en el codigo. */
export function buscarLimite(consulta: string, limites: Limites): Limite | undefined {
  const texto = sinTildes(consulta).toLowerCase();
  return limites.temas.find((limite) =>
    limite.senales.some((senal) => texto.includes(sinTildes(senal).toLowerCase()))
  );
}
