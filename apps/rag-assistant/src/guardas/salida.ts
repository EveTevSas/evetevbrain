import type { Fragmento } from "../base/tipos.js";
import { sinTildes } from "../normalizar.js";

/** Verificacion de la salida del modelo: las capas 4 y 5 del cierre.
 *
 *  Existe por una leccion propia. En `apps/eve-studio` la regla 13 del prompt
 *  decia «termina siempre indicando la URL del PR que te devolvio la
 *  herramienta»; sin haber llamado a la herramienta, la unica forma de cumplirla
 *  era inventarse la URL. **La regla que debia dar trazabilidad fue la que
 *  fabrico el numero.**
 *
 *  De ahi la regla dura: ninguna instruccion del prompt se da por cumplida
 *  porque el modelo diga que la cumplio. Se le pide que cite, y aqui se
 *  comprueba que la cita exista. */

export type Veredicto =
  | { valida: true }
  | {
      valida: false;
      motivo: "cita inexistente" | "cifra inventada" | "enlace inventado";
      detalle: string;
    };

const CITA = /\[#([^\]\s]+)\]/g;
/** Una cifra: digitos con separadores o porcentaje pegado. */
const CIFRA = /\d[\d.,]*\s?%?/g;
const ENLACE = /(https?:\/\/[^\s)]+|[\w.+-]+@[\w.-]+\.\w+)/g;

/** Extrae los enlaces y correos que aparecen en un texto. Se usa sobre el
 *  prompt de sistema para saber cuales estan **autorizados por nosotros**. */
export function enlacesDe(texto: string): string[] {
  return [...(texto.match(ENLACE) ?? [])];
}

export function verificar(
  respuesta: string,
  entregados: Fragmento[],
  /** Enlaces que el propio prompt de sistema manda escribir. No son inventos:
   *  se los pedimos nosotros.
   *
   *  Sin esto la guarda tumbaba respuestas correctas. El prompt dice «ofrece el
   *  formulario de contacto o contacto@evetev.com», el modelo obedecia, y como
   *  ese correo no estaba en los seis fragmentos entregados, la verificacion lo
   *  marcaba como enlace inventado y la respuesta buena se perdia. Es el mismo
   *  patron de la regla 13 de eve-studio al reves: alli el prompt obligaba a
   *  algo que el modelo tenia que fabricar; aqui prohibia algo que el prompt
   *  mismo ordenaba. El conjunto valido es contexto UNION prompt: las dos
   *  cosas las escribimos nosotros. */
  permitidos: string[] = []
): Veredicto {
  const ids = new Set(entregados.map((f) => f.id));

  for (const cita of respuesta.matchAll(CITA)) {
    const id = cita[1] ?? "";
    if (!ids.has(id)) {
      return { valida: false, motivo: "cita inexistente", detalle: id };
    }
  }

  // El contexto se compara sin tildes y en minusculas, igual que el resto del
  // motor: una guarda que depende de la ortografia no es una guarda.
  const contexto = sinTildes(entregados.map((f) => f.texto).join("\n")).toLowerCase();
  // Las citas se quitan ANTES de buscar cifras: `[#evepay-que-es#2]` lleva un
  // «2» que no es una cifra de la respuesta.
  const sinCitas = respuesta.replace(CITA, " ");

  for (const bruto of sinCitas.match(CIFRA) ?? []) {
    const cifra = bruto.trim();
    if (!cifra || !/\d/.test(cifra)) continue;
    if (contexto.includes(cifra.toLowerCase())) continue;
    // Segunda oportunidad comparando solo los digitos, para que «1.000» y
    // «1000» no se consideren distintos por el separador de miles.
    const soloDigitos = cifra.replace(/\D/g, "");
    if (soloDigitos && contexto.replace(/\D/g, "").includes(soloDigitos)) continue;
    return { valida: false, motivo: "cifra inventada", detalle: cifra };
  }

  const autorizados = new Set(permitidos.map((e) => sinTildes(e).toLowerCase()));
  for (const enlace of sinCitas.match(ENLACE) ?? []) {
    const plano = sinTildes(enlace)
      .toLowerCase()
      .replace(/[.,;:)]+$/, "");
    if (autorizados.has(plano) || contexto.includes(plano)) continue;
    return { valida: false, motivo: "enlace inventado", detalle: enlace };
  }

  return { valida: true };
}
