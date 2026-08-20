import type { IncomingMessage, ServerResponse } from "node:http";
import { leerEntorno, manejar, type Peticion } from "../src/api/nucleo.js";
import { CABECERAS_SSE, comoSse } from "../src/api/sse.js";
import { indice } from "../src/indice/incluido.js";

/** Adaptador de Vercel. Solo traduce: toda la logica vive en `src/api/nucleo`,
 *  que es lo mismo que corre el servidor local de `scripts/servir.ts`. Una sola
 *  implementacion, sin una segunda que se desincronice.
 *
 *  Va en una unica funcion con `rewrites`, igual que `apps/eve-studio`: Vercel
 *  publica la funcion en `/api/index` y no deduce que el resto de rutas le
 *  pertenecen. */
const entorno = leerEntorno(process.env);

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const peticion: Peticion = {
    ruta: url.pathname,
    metodo: req.method ?? "GET",
    origen: cabecera(req, "origin"),
    sesion: cabecera(req, "x-fluxi-sesion"),
    ip: cabecera(req, "x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0",
    cuerpo: await leerCuerpo(req)
  };

  const respuesta = await manejar(peticion, { indice, entorno });

  if (!respuesta.eventos) {
    res.writeHead(respuesta.estado, {
      ...respuesta.cabeceras,
      "Content-Type": "application/json; charset=utf-8"
    });
    res.end(JSON.stringify(respuesta.json ?? {}));
    return;
  }

  res.writeHead(respuesta.estado, { ...respuesta.cabeceras, ...CABECERAS_SSE });
  for await (const evento of respuesta.eventos) {
    res.write(comoSse(evento));
  }
  res.end();
}

function cabecera(req: IncomingMessage, nombre: string): string | undefined {
  const valor = req.headers[nombre];
  return Array.isArray(valor) ? valor[0] : valor;
}

async function leerCuerpo(req: IncomingMessage): Promise<unknown> {
  if (req.method !== "POST") return undefined;
  const trozos: Buffer[] = [];
  for await (const trozo of req) trozos.push(trozo as Buffer);
  const crudo = Buffer.concat(trozos).toString("utf8");
  if (!crudo) return undefined;
  try {
    return JSON.parse(crudo);
  } catch {
    return undefined;
  }
}
