/** Guardas de entrada del endpoint publico.
 *
 *  Es un endpoint **abierto que gasta dinero**: sin guardas, un script lo vacia
 *  en una tarde. */

export interface Configuracion {
  origenes: string[];
  secreto: string;
  /** Longitud maxima del mensaje. */
  topeMensaje: number;
  /** Turnos de historial que viajan al modelo. */
  topeHistorial: number;
}

export const POR_DEFECTO = {
  topeMensaje: 500,
  topeHistorial: 4
} as const;

/** Previews de Vercel de **nuestros** proyectos, para poder probar en el PR.
 *
 *  Incluye `website-*` y no solo `rag-assistant-*`: sin eso, la preview de
 *  cualquier PR del sitio mostraba el asistente degradado al enlace de contacto
 *  —el navegador bloquea la petición— y **nada se ponía rojo**. Es el mismo modo
 *  de fallo silencioso que ya conocemos de la lista de orígenes de los
 *  formularios, y se arregla antes de que muerda, no después. */
const ORIGEN_PREVIEW = /^https:\/\/(rag-assistant|website)-[a-z0-9-]+\.vercel\.app$/;
const ORIGEN_LOCAL = /^http:\/\/localhost:\d{2,5}$/;

/** **El punto fragil de todo esto**, y ya nos mordio una vez con los
 *  formularios: si una web estrena dominio y no se agrega aqui, el navegador
 *  bloquea la peticion y el asistente deja de funcionar **sin que el despliegue
 *  avise**. Nada se pone rojo. */
export function origenPermitido(origen: string | undefined, permitidos: string[]): boolean {
  if (!origen) return false;
  return permitidos.includes(origen) || ORIGEN_PREVIEW.test(origen) || ORIGEN_LOCAL.test(origen);
}

export function cabecerasCors(
  origen: string | undefined,
  permitidos: string[]
): Record<string, string> {
  // `Vary` para que ningun cache sirva la respuesta de un origen a otro.
  const base: Record<string, string> = { Vary: "Origin" };
  if (!origenPermitido(origen, permitidos)) return base;
  return {
    ...base,
    "Access-Control-Allow-Origin": origen ?? "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Fluxi-Sesion"
  };
}

export type Validacion =
  { valido: true; mensaje: string } | { valido: false; estado: number; motivo: string };

export function validarCuerpo(cuerpo: unknown, topeMensaje: number): Validacion {
  if (typeof cuerpo !== "object" || cuerpo === null) {
    return { valido: false, estado: 400, motivo: "cuerpo_invalido" };
  }
  const datos = cuerpo as Record<string, unknown>;

  // Campo trampa, igual que en los formularios: si viene lleno se responde 200
  // y no se hace nada, para no darle al bot la señal de que fue detectado.
  if (typeof datos["apellido2"] === "string" && datos["apellido2"].length > 0) {
    return { valido: false, estado: 200, motivo: "trampa" };
  }

  const mensaje = typeof datos["mensaje"] === "string" ? datos["mensaje"].trim() : "";
  if (!mensaje) return { valido: false, estado: 400, motivo: "mensaje_vacio" };
  if (mensaje.length > topeMensaje) return { valido: false, estado: 400, motivo: "mensaje_largo" };

  return { valido: true, mensaje };
}
