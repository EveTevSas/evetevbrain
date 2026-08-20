import type { Fragmento } from "./base/tipos.js";
import type { Motor, Uso } from "./generar/motor.js";
import { armarMensaje } from "./generar/plantilla.js";
import { cortarFrases } from "./generar/frases-seguras.js";
import { enlacesDe, verificar } from "./guardas/salida.js";
import { responder, type Contexto } from "./responder.js";

/** El turno completo: enruta, y si toca generar, llama al modelo y **verifica lo
 *  que escribio** antes de devolverlo. */
export interface ContextoCompleto extends Contexto {
  motor: Motor;
  /** Sin definir, no se envia: hay modelos que solo admiten su valor por
   *  defecto. Ver la nota en `PeticionModelo`. */
  temperatura?: number;
  topeTokens?: number;
}

export interface Atendida {
  respuesta: string;
  camino: "sellada" | "limite" | "abstencion" | "generada" | "descartada";
  fragmentos: Fragmento[];
  uso?: Uso;
  /** Presente si la verificacion tumbo la respuesta del modelo. */
  descarte?: string;
}

export async function atender(consulta: string, ctx: ContextoCompleto): Promise<Atendida> {
  const enrutado = responder(consulta, ctx);

  if (enrutado.camino !== "generar") {
    return { respuesta: enrutado.respuesta, camino: enrutado.camino, fragmentos: [] };
  }

  const { texto, uso } = await ctx.motor.generar({
    sistema: ctx.indice.sistema,
    usuario: armarMensaje(consulta, enrutado.fragmentos),
    temperatura: ctx.temperatura,
    topeTokens: ctx.topeTokens ?? 220
  });

  const veredicto = verificar(texto, enrutado.fragmentos, enlacesDe(ctx.indice.sistema));
  if (!veredicto.valida) {
    // Degrada, no se rompe: sale la derivacion de siempre.
    return {
      respuesta: ctx.indice.limites.derivacionGeneral,
      camino: "descartada",
      fragmentos: enrutado.fragmentos,
      uso,
      descarte: `${veredicto.motivo}: ${veredicto.detalle}`
    };
  }

  // Un fragmento de confianza media nunca sustenta una respuesta sin derivar
  // ademas a una persona: es informacion cierta pero en movimiento.
  const dudoso = enrutado.fragmentos.some((f) => f.confianza === "media");
  const respuesta = dudoso
    ? `${texto.trim()}\n\n${ctx.indice.limites.derivacionGeneral}`
    : texto.trim();

  return { respuesta, camino: "generada", fragmentos: enrutado.fragmentos, uso };
}

/** El turno completo, **transmitiendo**.
 *
 *  El problema que resuelve no es de comodidad: si se emite token a token y la
 *  verificacion falla al final, **la respuesta mala ya la vio la persona, y eso
 *  no se puede desdecir**. Aqui se acumula, se corta en frases completas —con
 *  sus citas, que van despues del punto— y **cada frase se verifica antes de
 *  emitirla**. Nada sin verificar llega nunca a la pantalla, y el primer texto
 *  aparece al cabo de una frase en vez de al cabo de la respuesta entera.
 *
 *  Si una frase no pasa, se corta ahi: lo ya emitido estaba verificado, y detras
 *  va la derivacion. */
export interface Fuente {
  id: string;
  titulo: string;
  seccion: string;
}

export type Evento =
  | { tipo: "texto"; texto: string }
  | {
      tipo: "fin";
      camino: Atendida["camino"];
      uso?: Uso;
      descarte?: string;
      /** Los fragmentos que la respuesta **realmente cito**, no los seis que se
       *  entregaron. El identificador es para verificar; esto es para que la
       *  persona vea de donde salio, con nombre y no con un id. */
      fuentes?: Fuente[];
    };

export async function* atenderEnTrozos(
  consulta: string,
  ctx: ContextoCompleto
): AsyncGenerator<Evento> {
  const enrutado = responder(consulta, ctx);

  if (enrutado.camino !== "generar") {
    yield { tipo: "texto", texto: enrutado.respuesta };
    yield { tipo: "fin", camino: enrutado.camino };
    return;
  }

  const permitidos = enlacesDe(ctx.indice.sistema);
  const trozos = ctx.motor.generarEnTrozos({
    sistema: ctx.indice.sistema,
    usuario: armarMensaje(consulta, enrutado.fragmentos),
    temperatura: ctx.temperatura,
    topeTokens: ctx.topeTokens ?? 220
  });

  let acumulado = "";
  let emitidas = 0;
  let uso: Uso | undefined;
  const citados = new Set<string>();

  for (;;) {
    let paso;
    try {
      paso = await trozos.next();
    } catch {
      // El proveedor fallo. Degrada, no se rompe.
      yield { tipo: "texto", texto: emitidas ? "" : ctx.indice.limites.derivacionGeneral };
      yield { tipo: "fin", camino: emitidas ? "generada" : "abstencion" };
      return;
    }

    if (paso.done) {
      uso = paso.value;
      const { listas } = cortarFrases(acumulado, true);
      const salida = yield* emitirVerificadas(
        listas,
        enrutado.fragmentos,
        permitidos,
        ctx,
        citados
      );
      if (salida) {
        yield { tipo: "fin", camino: "descartada", uso, descarte: salida };
        return;
      }
      emitidas += listas.length;
      break;
    }

    acumulado += paso.value;
    const { listas, resto } = cortarFrases(acumulado, false);
    acumulado = resto;
    const salida = yield* emitirVerificadas(listas, enrutado.fragmentos, permitidos, ctx, citados);
    if (salida) {
      yield { tipo: "fin", camino: "descartada", descarte: salida };
      return;
    }
    emitidas += listas.length;
  }

  // Un fragmento de confianza media nunca sustenta una respuesta sin derivar
  // ademas a una persona.
  if (enrutado.fragmentos.some((f) => f.confianza === "media")) {
    yield { tipo: "texto", texto: `\n\n${ctx.indice.limites.derivacionGeneral}` };
  }
  const fuentes: Fuente[] = enrutado.fragmentos
    .filter((f) => citados.has(f.id))
    .map((f) => ({ id: f.id, titulo: f.titulo, seccion: f.seccion }));

  yield { tipo: "fin", camino: "generada", ...(uso ? { uso } : {}), fuentes };
}

/** Emite las frases que pasan la verificacion. Devuelve el motivo si alguna no
 *  paso — en ese caso ya emitio la derivacion y hay que cortar. */
async function* emitirVerificadas(
  frases: string[],
  fragmentos: Fragmento[],
  permitidos: string[],
  ctx: ContextoCompleto,
  citados: Set<string>
): AsyncGenerator<Evento, string | undefined> {
  for (const frase of frases) {
    const veredicto = verificar(frase, fragmentos, permitidos);
    if (!veredicto.valida) {
      yield { tipo: "texto", texto: `\n\n${ctx.indice.limites.derivacionGeneral}` };
      return `${veredicto.motivo}: ${veredicto.detalle}`;
    }
    for (const cita of frase.matchAll(/\[#([^\]\s]+)\]/g)) {
      if (cita[1]) citados.add(cita[1]);
    }
    yield { tipo: "texto", texto: `${frase} ` };
  }
  return undefined;
}
