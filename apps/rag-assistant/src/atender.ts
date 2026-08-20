import type { Fragmento } from "./base/tipos.js";
import type { Motor, Uso } from "./generar/motor.js";
import { armarMensaje } from "./generar/plantilla.js";
import { enlacesDe, verificar } from "./guardas/salida.js";
import { responder, type Contexto } from "./responder.js";

/** El turno completo: enruta, y si toca generar, llama al modelo y **verifica lo
 *  que escribio** antes de devolverlo. */
export interface ContextoCompleto extends Contexto {
  motor: Motor;
  /** El texto bajo `## Prompt` de `_sistema.md`. */
  sistema: string;
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
    sistema: ctx.sistema,
    usuario: armarMensaje(consulta, enrutado.fragmentos),
    temperatura: ctx.temperatura,
    topeTokens: ctx.topeTokens ?? 220
  });

  const veredicto = verificar(texto, enrutado.fragmentos, enlacesDe(ctx.sistema));
  if (!veredicto.valida) {
    // Degrada, no se rompe: sale la derivacion de siempre.
    return {
      respuesta: ctx.limites.derivacionGeneral,
      camino: "descartada",
      fragmentos: enrutado.fragmentos,
      uso,
      descarte: `${veredicto.motivo}: ${veredicto.detalle}`
    };
  }

  // Un fragmento de confianza media nunca sustenta una respuesta sin derivar
  // ademas a una persona: es informacion cierta pero en movimiento.
  const dudoso = enrutado.fragmentos.some((f) => f.confianza === "media");
  const respuesta = dudoso ? `${texto.trim()}\n\n${ctx.limites.derivacionGeneral}` : texto.trim();

  return { respuesta, camino: "generada", fragmentos: enrutado.fragmentos, uso };
}
