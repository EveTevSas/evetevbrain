/** Tipos de la base documental. El contrato del frontmatter vive en
 *  `base/_reglas.json`; aquí solo su forma en TypeScript. */

export const PRODUCTOS = ["empresa", "evepay", "eveconecta", "legales"] as const;
export type Producto = (typeof PRODUCTOS)[number];

export const AUDIENCIAS = [
  "general",
  "comercio",
  "residente",
  "desarrollador",
  "candidato"
] as const;
export type Audiencia = (typeof AUDIENCIAS)[number];

export const CONFIANZAS = ["alta", "media"] as const;
export type Confianza = (typeof CONFIANZAS)[number];

export interface Documento {
  /** Ruta relativa a `base/`, para que los mensajes de error sean accionables. */
  ruta: string;
  id: string;
  titulo: string;
  producto: Producto;
  audiencia: Audiencia;
  /** ISO `AAAA-MM-DD`. Pasada esa fecha el documento baja a confianza media. */
  vigencia: string;
  fuente: string;
  confianza: Confianza;
  cuerpo: string;
}

export interface Fragmento {
  /** `<id del documento>#<n>` — es lo que el modelo cita y lo que se verifica. */
  id: string;
  documentoId: string;
  titulo: string;
  /** El encabezado `##` del que salió, o el título si el documento no tiene. */
  seccion: string;
  /** El texto tal cual. Es lo único que se le entrega al modelo. */
  texto: string;
  /** Dos o tres líneas que sitúan el fragmento en su documento. Se vectorizan
   *  junto al texto y NO se le muestran al modelo: son para encontrar, no para
   *  responder. Vacío mientras la contextualización no haya corrido. */
  contexto: string;
  producto: Producto;
  audiencia: Audiencia;
  confianza: Confianza;
  vigencia: string;
}

export interface Fallo {
  ruta: string;
  tipo: string;
  detalle: string;
  linea?: number;
}
