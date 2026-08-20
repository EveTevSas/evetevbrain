import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Las reglas de contenido viven en `base/_reglas.json` y no en el código, para
 *  que un cliente nuevo traiga las suyas sin tocar el motor. */
export interface Reglas {
  frasesVetadas: string[];
  disponibilidad: { patron: string; exigeNegacionEnLaFrase: string[] };
  promesasDeFecha: { frases: string[]; patronMesAno: string };
  competidores: string[];
  tarifas: { patron: string; exigeAlgunaDe: string[] };
  frontmatter: {
    obligatorios: string[];
    producto: string[];
    audiencia: string[];
    confianza: string[];
    fuente: string[];
  };
  configuracion: { archivos: string[] };
  troceo: { tokensObjetivo: number; tokensMaximo: number; solapeFrases: number };
}

export function leerReglas(raizBase: string): Reglas {
  const crudo = readFileSync(join(raizBase, "_reglas.json"), "utf8");
  return JSON.parse(crudo) as Reglas;
}
