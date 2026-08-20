/** Compila `base/` en `indice/indice.json`.
 *
 *  Se corre a mano y su salida **se commitea**: el indice no es un artefacto de
 *  build. Compilarlo en cada despliegue nos ataria a que el proveedor de
 *  embeddings este arriba justo cuando desplegamos, y gastaria vectores en cada
 *  push.
 *
 *      pnpm --filter @evetev/rag-assistant compilar
 *      pnpm --filter @evetev/rag-assistant compilar -- --comprobar
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { aDocumento, leerCrudos } from "../src/base/leer.js";
import { leerReglas } from "../src/base/reglas.js";
import { trocear } from "../src/base/trocear.js";
import { validar, vencidos } from "../src/base/validar.js";
import { huellaCorpus } from "../src/indice/huella.js";
import type { Indice } from "../src/indice/tipos.js";
import { construirBm25 } from "../src/recuperar/bm25.js";
import type { Fragmento } from "../src/base/tipos.js";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const BASE = join(RAIZ, "base");
const DESTINO = join(RAIZ, "indice", "indice.json");

const soloComprobar = process.argv.includes("--comprobar");

const reglas = leerReglas(BASE);
const crudos = leerCrudos(BASE);

const fallos = validar(crudos, reglas);
if (fallos.length > 0) {
  console.error(`\n${fallos.length} fallo(s) de validacion:\n`);
  for (const f of fallos) {
    const donde = f.linea === undefined ? f.ruta : `${f.ruta}:${f.linea}`;
    console.error(`  ${donde}\n     [${f.tipo}] ${f.detalle}`);
  }
  console.error("\nLa base no se compila hasta que esto quede limpio.\n");
  process.exit(1);
}

const caducados = vencidos(crudos);
for (const d of caducados) {
  console.warn(`aviso: ${d.ruta} vencio el ${d.meta["vigencia"]} — baja a confianza media`);
}

const configuracion = new Set(reglas.configuracion.archivos);
const documentos = crudos
  .filter((c) => {
    const nombre = c.ruta.split("/").pop() ?? c.ruta;
    return !nombre.startsWith("_");
  })
  .map(aDocumento);

const rutasVencidas = new Set(caducados.map((d) => d.ruta));
const fragmentos: Fragmento[] = [];
for (const doc of documentos) {
  const degradado = rutasVencidas.has(doc.ruta) ? { ...doc, confianza: "media" as const } : doc;
  fragmentos.push(...trocear(degradado, reglas));
}

// Se indexa el texto MAS su contexto: el contexto es para encontrar, no para
// responder, y por eso no viaja al modelo. Mientras la contextualizacion no
// haya corrido, `contexto` esta vacio y esto es simplemente el texto.
const paraIndexar = fragmentos.map((f) => `${f.contexto} ${f.texto}`.trim());

const indice: Indice = {
  version: 1,
  // Sin marca de tiempo a proposito: dejaria un diff en cada compilacion aunque
  // el contenido fuera identico, y la huella ya identifica el corpus exacto.
  huella: huellaCorpus(crudos),
  fragmentos,
  bm25: construirBm25(paraIndexar)
};

const resumen = [
  `${documentos.length} documentos + ${configuracion.size} de configuracion`,
  `${fragmentos.length} fragmentos`,
  `huella ${indice.huella.slice(0, 12)}`,
  caducados.length ? `${caducados.length} vencido(s)` : "ninguno vencido"
].join(" · ");

if (soloComprobar) {
  const previo = JSON.parse(readFileSync(DESTINO, "utf8")) as Indice;
  if (previo.huella !== indice.huella) {
    console.error("\nEl indice no corresponde a la base actual.");
    console.error(`  indice: ${previo.huella}`);
    console.error(`  base:   ${indice.huella}`);
    console.error("\nRecompila y commitea el indice en el mismo cambio.\n");
    process.exit(1);
  }
  console.log(`indice al dia — ${resumen}`);
} else {
  mkdirSync(dirname(DESTINO), { recursive: true });
  writeFileSync(DESTINO, `${JSON.stringify(indice, null, 1)}\n`, "utf8");
  console.log(`compilado — ${resumen}`);
}
