/** Servidor local: sirve `public/` y expone la misma API que Vercel.
 *
 *      MOONSHOT_API_KEY=... pnpm --filter @evetev/rag-assistant servir
 *
 *  Usa el mismo `src/api/nucleo`, asi que lo que se prueba aqui es lo que corre
 *  en produccion. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { leerEntorno, manejar, type Peticion } from "../src/api/nucleo.js";
import { CABECERAS_SSE, comoSse } from "../src/api/sse.js";
import { indice } from "../src/indice/incluido.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUERTO = Number(process.env["PUERTO"] ?? 3005);

const entorno = leerEntorno({
  ...process.env,
  // En local se permite cualquier localhost, que ya cubre `origenPermitido`.
  FLUXI_ORIGENES: process.env["FLUXI_ORIGENES"] ?? "http://localhost:" + PUERTO
});

const TIPOS: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PUERTO}`);

  if (!url.pathname.startsWith("/api/")) {
    const archivo = url.pathname === "/" ? "/demo.html" : url.pathname;
    try {
      const contenido = await readFile(join(RAIZ, "public", archivo));
      res.writeHead(200, { "Content-Type": TIPOS[extname(archivo)] ?? "text/plain" });
      res.end(contenido);
    } catch {
      res.writeHead(404).end("no encontrado");
    }
    return;
  }

  const peticion: Peticion = {
    ruta: url.pathname,
    metodo: req.method ?? "GET",
    origen: encabezado(req.headers["origin"]),
    sesion: encabezado(req.headers["x-fluxi-sesion"]),
    ip: "127.0.0.1",
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
  for await (const evento of respuesta.eventos) res.write(comoSse(evento));
  res.end();
}).listen(PUERTO, () => {
  console.log(
    `Fluxi en http://localhost:${PUERTO} — modelo ${entorno.modelo}` +
      `${entorno.llaveModelo ? "" : " (SIN LLAVE: solo selladas, limites y abstencion)"}`
  );
});

function encabezado(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

async function leerCuerpo(req: import("node:http").IncomingMessage): Promise<unknown> {
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
