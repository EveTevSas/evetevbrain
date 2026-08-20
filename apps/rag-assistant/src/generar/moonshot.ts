import type { Motor, PeticionModelo, RespuestaModelo, Uso } from "./motor.js";

/** Cliente de Moonshot (Kimi). API compatible con OpenAI, sin SDK: son treinta
 *  lineas de `fetch` y una dependencia menos en el camino caliente.
 *
 *  **Kimi no tiene endpoint de embeddings** —solo `chat/completions`—, asi que
 *  aqui solo vive la generacion. Los vectores son de otro proveedor. */
const URL_BASE = "https://api.moonshot.ai/v1";

export interface OpcionesMoonshot {
  llave: string;
  modelo: string;
  /** Apaga el razonamiento previo. Por defecto **si**, y no es un ahorro
   *  menor: los modelos de Kimi razonan antes de responder, ese razonamiento
   *  consume el presupuesto de salida, y con el tope en 220 tokens la primera
   *  llamada real devolvio **texto vacio** habiendolos gastado los 220 enteros.
   *
   *  Para esta tarea el razonamiento sobra: leer seis fragmentos y escribir
   *  tres frases citando de donde salieron. Lo que evita inventar es la
   *  compuerta y la verificacion, no que el modelo delibere.
   *
   *  El parametro no es el mismo en todos: `kimi-k3` razona siempre y solo
   *  admite bajar el esfuerzo; el resto acepta apagarlo del todo. */
  sinRazonamiento?: boolean;
  /** Etiqueta estable para que el proveedor acierte el cache de contexto: el
   *  prompt de sistema es identico en cada peticion y la entrada cacheada
   *  cuesta un orden de magnitud menos. */
  claveDeCache?: string;
}

export function motorMoonshot(opciones: OpcionesMoonshot): Motor {
  const cabeceras = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${opciones.llave}`
  };

  const sinRazonamiento = opciones.sinRazonamiento ?? true;
  const razonamiento = !sinRazonamiento
    ? {}
    : opciones.modelo.startsWith("kimi-k3")
      ? { reasoning_effort: "low" }
      : { thinking: { type: "disabled" } };

  function cuerpo(peticion: PeticionModelo, enTrozos: boolean): string {
    return JSON.stringify({
      model: opciones.modelo,
      ...razonamiento,
      messages: [
        { role: "system", content: peticion.sistema },
        { role: "user", content: peticion.usuario }
      ],
      ...(peticion.temperatura === undefined ? {} : { temperature: peticion.temperatura }),
      max_tokens: peticion.topeTokens,
      stream: enTrozos,
      ...(enTrozos ? { stream_options: { include_usage: true } } : {}),
      ...(opciones.claveDeCache ? { prompt_cache_key: opciones.claveDeCache } : {})
    });
  }

  async function* generarEnTrozos(
    peticion: PeticionModelo
  ): AsyncGenerator<string, Uso, undefined> {
    const arranque = Date.now();
    const respuesta = await fetch(`${URL_BASE}/chat/completions`, {
      method: "POST",
      headers: cabeceras,
      body: cuerpo(peticion, true)
    });
    if (!respuesta.ok || !respuesta.body) {
      throw new Error(`moonshot ${respuesta.status}: ${await respuesta.text()}`);
    }

    const lector = respuesta.body.getReader();
    const decodificador = new TextDecoder();
    let pendiente = "";
    let uso: Uso = { tokensEntrada: 0, tokensSalida: 0, tokensCacheados: 0, milisegundos: 0 };

    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      pendiente += decodificador.decode(value, { stream: true });
      const lineas = pendiente.split("\n");
      pendiente = lineas.pop() ?? "";

      for (const linea of lineas) {
        if (!linea.startsWith("data:")) continue;
        const carga = linea.slice(5).trim();
        if (!carga || carga === "[DONE]") continue;
        const trozo = JSON.parse(carga) as {
          choices?: { delta?: { content?: string; reasoning_content?: string } }[];
          usage?: {
            prompt_tokens?: number;
            completion_tokens?: number;
            cached_tokens?: number;
            prompt_cache_hit_tokens?: number;
          };
        };
        const texto = trozo.choices?.[0]?.delta?.content;
        if (texto) yield texto;
        if (trozo.usage) {
          uso = {
            tokensEntrada: trozo.usage.prompt_tokens ?? 0,
            tokensSalida: trozo.usage.completion_tokens ?? 0,
            tokensCacheados: trozo.usage.cached_tokens ?? trozo.usage.prompt_cache_hit_tokens ?? 0,
            milisegundos: Date.now() - arranque
          };
        }
      }
    }

    return { ...uso, milisegundos: Date.now() - arranque };
  }

  return {
    nombre: opciones.modelo,
    generarEnTrozos,
    async generar(peticion: PeticionModelo): Promise<RespuestaModelo> {
      const trozos = generarEnTrozos(peticion);
      let texto = "";
      let resultado = await trozos.next();
      while (!resultado.done) {
        texto += resultado.value;
        resultado = await trozos.next();
      }
      return { texto, uso: resultado.value };
    }
  };
}
