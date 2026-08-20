import datos from "../../indice/indice.json" with { type: "json" };
import type { Indice } from "./tipos.js";

/** El indice **importado como modulo**, no leido del disco.
 *
 *  Es lo que hace que la funcion desplegada no dependa del sistema de archivos:
 *  el empaquetador sigue el import y lo mete en el bundle. Con `readFileSync`
 *  habria que acertar con `includeFiles` y con rutas relativas que cambian al
 *  empaquetar — un modo de fallo que solo aparece en produccion, que es donde
 *  peor se diagnostica. */
export const indice = datos as unknown as Indice;
