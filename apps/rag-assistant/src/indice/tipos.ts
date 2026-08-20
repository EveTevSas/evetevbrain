import type { Fragmento } from "../base/tipos.js";
import type { Limites } from "../limites.js";
import type { IndiceBm25 } from "../recuperar/bm25.js";
import type { Sellada } from "../selladas.js";

/** El indice es **un archivo del repositorio**, no un artefacto de compilacion
 *  ni una base de datos: se revisa en el PR, tiene historia y se deshace con
 *  `git revert`. Con este tamano de corpus la recuperacion no toca la red. */
export interface Indice {
  version: 1;
  /** SHA-256 del corpus. La CI lo compara con el de `base/` y falla si no
   *  cuadran: sin esta comprobacion un PR podria cambiar la base y dejar
   *  publicado el indice viejo, y el asistente responderia la version anterior
   *  sin que nada se pusiera rojo. */
  huella: string;
  fragmentos: Fragmento[];
  bm25: IndiceBm25;
  /** Todo lo que el asistente necesita para atender viaja aqui dentro: asi la
   *  funcion desplegada **no lee el sistema de archivos**. Un solo artefacto,
   *  sin `includeFiles` que acertar ni rutas que se rompan al empaquetar. */
  selladas: Sellada[];
  limites: Limites;
  /** El texto bajo `## Prompt` de `_sistema.md`, ya extraido. */
  sistema: string;
  /** Presente solo si se compilo con vectores. */
  denso?: {
    modelo: string;
    dimension: number;
    /** Un vector por fragmento, cuantizado a int8 con escala propia. */
    vectores: number[][];
    escalas: number[];
  };
}
