import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { Audiencia, Confianza, Documento, Producto } from "./tipos.js";
import { AUDIENCIAS, CONFIANZAS, PRODUCTOS } from "./tipos.js";

/** Un documento leído sin validar todavía: los campos pueden faltar o venir
 *  fuera de las listas permitidas. Validar es el paso siguiente, y separado a
 *  propósito, para poder reportar TODOS los fallos de una vez en vez de morir
 *  en el primero. */
export interface DocumentoCrudo {
  ruta: string;
  meta: Record<string, string>;
  cuerpo: string;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

export function leerCrudos(raizBase: string): DocumentoCrudo[] {
  const salida: DocumentoCrudo[] = [];
  for (const absoluta of recorrer(raizBase)) {
    const ruta = relative(raizBase, absoluta).split(sep).join("/");
    // El manual de redacción no es un documento del corpus.
    if (ruta === "README.md") continue;
    const texto = readFileSync(absoluta, "utf8");
    const m = FRONTMATTER.exec(texto);
    if (!m) {
      salida.push({ ruta, meta: {}, cuerpo: texto });
      continue;
    }
    const meta: Record<string, string> = {};
    for (const linea of (m[1] ?? "").split(/\r?\n/)) {
      const par = /^(\w+):\s*(.+?)\s*$/.exec(linea);
      if (par?.[1] && par[2]) meta[par[1]] = par[2];
    }
    salida.push({ ruta, meta, cuerpo: m[2] ?? "" });
  }
  return salida.sort((a, b) => a.ruta.localeCompare(b.ruta));
}

/** Convierte un crudo ya validado en `Documento`. Solo se llama cuando la
 *  validación pasó, así que los `as` son seguros: el validador comprobó que
 *  cada valor está en su lista. */
export function aDocumento(crudo: DocumentoCrudo): Documento {
  const m = crudo.meta;
  return {
    ruta: crudo.ruta,
    id: m["id"] ?? "",
    titulo: m["titulo"] ?? "",
    producto: (m["producto"] ?? "empresa") as Producto,
    audiencia: (m["audiencia"] ?? "general") as Audiencia,
    vigencia: m["vigencia"] ?? "",
    fuente: m["fuente"] ?? "",
    confianza: (m["confianza"] ?? "alta") as Confianza,
    cuerpo: crudo.cuerpo
  };
}

export const LISTAS = {
  producto: PRODUCTOS as readonly string[],
  audiencia: AUDIENCIAS as readonly string[],
  confianza: CONFIANZAS as readonly string[]
};

function* recorrer(dir: string): Generator<string> {
  for (const entrada of readdirSync(dir).sort()) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) yield* recorrer(ruta);
    else if (entrada.endsWith(".md")) yield ruta;
  }
}
