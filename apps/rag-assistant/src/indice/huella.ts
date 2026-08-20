import { createHash } from "node:crypto";
import type { DocumentoCrudo } from "../base/leer.js";

/** Huella del corpus: identifica el contenido exacto del que salio un indice.
 *  Se calcula sobre ruta + frontmatter + cuerpo de cada documento, en orden
 *  estable, para que dos compilaciones del mismo corpus den lo mismo. */
export function huellaCorpus(crudos: DocumentoCrudo[]): string {
  const hash = createHash("sha256");
  for (const doc of [...crudos].sort((a, b) => a.ruta.localeCompare(b.ruta))) {
    hash.update(doc.ruta);
    for (const clave of Object.keys(doc.meta).sort()) {
      hash.update(` ${clave}=${doc.meta[clave]}`);
    }
    hash.update(` ${doc.cuerpo}`);
  }
  return hash.digest("hex");
}
