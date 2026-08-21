import { randomBytes } from "node:crypto";
import type { Indice } from "../indice/tipos.js";
import { atenderEnTrozos, type Evento } from "../atender.js";
import { responder } from "../responder.js";
import { motorMoonshot } from "../generar/moonshot.js";
import { cabecerasCors, origenPermitido, POR_DEFECTO, validarCuerpo } from "../guardas/entrada.js";
import { anotarUso, consultarCupo } from "../guardas/cupos.js";
import { emitirSesion, verificarSesion } from "../guardas/sesion.js";

/** El nucleo HTTP, sin conocer a Vercel ni a Node.
 *
 *  Recibe una peticion normalizada y devuelve una respuesta normalizada, que
 *  puede llevar un flujo de eventos. Los adaptadores —la funcion de Vercel y el
 *  servidor local— solo traducen. Asi lo que corre en produccion es lo mismo que
 *  se prueba en el portatil, sin una segunda implementacion que se desincronice. */

export interface Entorno {
  origenes: string[];
  secreto: string;
  llaveModelo: string | undefined;
  modelo: string;
}

export function leerEntorno(env: Record<string, string | undefined>): Entorno {
  // Los dominios propios van **en el código y se SUMAN**, no se reemplazan.
  //
  // La versión anterior los ponía como valor por defecto de `FLUXI_ORIGENES`, y
  // eso no sirve de nada: en cuanto la variable existe —y existe— el valor por
  // defecto no se aplica. Se comprobó del peor modo posible: la landing de Eve
  // Intelligence salió a producción con su propio asistente respondiendo
  // «ahora mismo no puedo responder», porque su dominio no estaba en la
  // variable y el respaldo del código nunca entró en juego.
  //
  // Sumar es lo correcto además de lo seguro: los dominios de Evetev jamás
  // aparecerán como origen en la instalación de un cliente, así que permitirlos
  // no le abre nada; y a nosotros nos garantiza que un despliegue nuestro
  // funciona aunque nadie toque la variable.
  const ORIGENES_PROPIOS = [
    "https://evetev.com",
    "https://www.evetev.com",
    "https://eveintelligence.evetev.com"
  ];
  const deLaVariable = (env["FLUXI_ORIGENES"] ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const origenes = [...new Set([...ORIGENES_PROPIOS, ...deLaVariable])];

  return {
    origenes,
    // Sin `FLUXI_SECRETO` se cae a un valor **aleatorio, generado al arrancar el
    // proceso**. La version anterior usaba una constante escrita aqui mismo, y
    // eso no era degradar: era publicar la llave. El repositorio es publico, asi
    // que cualquiera podia firmarse una sesion valida y saltarse la guarda. Se
    // detecto probandolo contra produccion, no razonandolo.
    //
    // El precio de la aleatoria es que las sesiones no cruzan de una instancia a
    // otra —Vercel levanta varias y son efimeras—, y por eso el widget reintenta
    // una vez pidiendo sesion nueva cuando recibe 401. Con el secreto puesto no
    // pasa ninguna de las dos cosas.
    secreto: env["FLUXI_SECRETO"] ?? SECRETO_DE_ARRANQUE,
    llaveModelo: env["MOONSHOT_API_KEY"],
    modelo: env["FLUXI_MODELO"] ?? "kimi-k2.6"
  };
}

/** Un secreto distinto en cada arranque. Nunca sale del proceso. */
const SECRETO_DE_ARRANQUE = randomBytes(32).toString("hex");

export interface Peticion {
  ruta: string;
  metodo: string;
  origen?: string | undefined;
  sesion?: string | undefined;
  ip: string;
  cuerpo?: unknown;
}

export interface Respuesta {
  estado: number;
  cabeceras: Record<string, string>;
  json?: unknown;
  eventos?: AsyncIterable<Evento>;
}

export async function manejar(
  peticion: Peticion,
  ctx: { indice: Indice; entorno: Entorno }
): Promise<Respuesta> {
  const { entorno } = ctx;
  const cors = cabecerasCors(peticion.origen, entorno.origenes);

  if (peticion.metodo === "OPTIONS") return { estado: 204, cabeceras: cors };

  if (peticion.ruta.endsWith("/salud")) {
    return {
      estado: 200,
      cabeceras: cors,
      json: {
        ok: true,
        fragmentos: ctx.indice.fragmentos.length,
        huella: ctx.indice.huella.slice(0, 12),
        modelo: entorno.modelo,
        modeloConfigurado: Boolean(entorno.llaveModelo),
        origenes: entorno.origenes.length
      }
    };
  }

  // Todo lo demas exige origen permitido. Sin esto el endpoint queda abierto a
  // cualquier pagina del mundo, gastando nuestro presupuesto.
  if (!origenPermitido(peticion.origen, entorno.origenes)) {
    return { estado: 403, cabeceras: cors, json: { error: "origen_no_permitido" } };
  }

  if (peticion.ruta.endsWith("/sesion")) {
    // **POST y no GET, a proposito.** El navegador no manda cabecera `Origin`
    // en un GET del mismo origen, asi que la guarda de origen rechazaba la
    // peticion de sesion del propio widget con un 403. En POST siempre la
    // manda, y asi el comportamiento es identico servido desde el mismo dominio
    // o desde otro — que es como va a estar en produccion.
    if (peticion.metodo !== "POST") {
      return { estado: 405, cabeceras: cors, json: { error: "metodo_no_permitido" } };
    }
    return { estado: 200, cabeceras: cors, json: { sesion: emitirSesion(entorno.secreto) } };
  }

  if (!peticion.ruta.endsWith("/chat")) {
    return { estado: 404, cabeceras: cors, json: { error: "no_encontrado" } };
  }
  if (peticion.metodo !== "POST") {
    return { estado: 405, cabeceras: cors, json: { error: "metodo_no_permitido" } };
  }

  const sesion = verificarSesion(peticion.sesion, entorno.secreto);
  if (!sesion.valida) {
    return { estado: 401, cabeceras: cors, json: { error: sesion.motivo } };
  }

  const validacion = validarCuerpo(peticion.cuerpo, POR_DEFECTO.topeMensaje);
  if (!validacion.valido) {
    // La trampa responde 200 y no hace nada: al bot no se le confirma que fue
    // detectado.
    if (validacion.motivo === "trampa") {
      return { estado: 200, cabeceras: cors, json: { respuesta: derivacion(ctx.indice) } };
    }
    return { estado: validacion.estado, cabeceras: cors, json: { error: validacion.motivo } };
  }

  const clave = `${sesion.id}|${peticion.ip}`;
  const cupo = consultarCupo(clave);
  if (!cupo.permitido) {
    // Degrada al formulario, no da error seco: la persona sigue teniendo salida.
    return {
      estado: 429,
      cabeceras: cors,
      json: { error: cupo.motivo, respuesta: derivacion(ctx.indice) }
    };
  }

  if (!entorno.llaveModelo) {
    // Sin llave el asistente no se rompe: responde lo que puede sin modelo
    // —selladas, limites— y deriva en lo demas. Mismo criterio que el
    // formulario de contacto cuando falta la clave del proveedor de correo.
    return { estado: 200, cabeceras: cors, eventos: sinModelo(validacion.mensaje, ctx.indice) };
  }

  const motor = motorMoonshot({
    llave: entorno.llaveModelo,
    modelo: entorno.modelo,
    claveDeCache: `fluxi-${ctx.indice.huella.slice(0, 8)}`
  });

  return {
    estado: 200,
    cabeceras: cors,
    eventos: conAnotacionDeUso(
      atenderEnTrozos(validacion.mensaje, { indice: ctx.indice, motor }),
      clave
    )
  };
}

function derivacion(indice: Indice): string {
  return indice.limites.derivacionGeneral;
}

/** Sin llave del modelo el asistente **no se rompe**: sigue resolviendo lo que
 *  no necesita modelo —selladas y limites— y deriva en todo lo demas. Es el
 *  mismo criterio que el formulario de contacto cuando falta la clave del
 *  proveedor de correo: degrada, no da error.
 *
 *  Se enruta a mano en vez de pasar por `atenderEnTrozos` con un motor de
 *  mentira: un motor que solo sabe lanzar excepciones es mas codigo y menos
 *  claro que este `if`. */
async function* sinModelo(mensaje: string, indice: Indice): AsyncGenerator<Evento> {
  const enrutado = responder(mensaje, { indice });
  const texto =
    enrutado.camino === "generar" ? indice.limites.derivacionGeneral : enrutado.respuesta;
  yield { tipo: "texto", texto };
  yield { tipo: "fin", camino: enrutado.camino === "generar" ? "abstencion" : enrutado.camino };
}

async function* conAnotacionDeUso(
  eventos: AsyncIterable<Evento>,
  clave: string
): AsyncGenerator<Evento> {
  for await (const evento of eventos) {
    if (evento.tipo === "fin") {
      anotarUso(clave, (evento.uso?.tokensEntrada ?? 0) + (evento.uso?.tokensSalida ?? 0));
    }
    yield evento;
  }
}
