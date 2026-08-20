/** Banco de pruebas del motor, en la terminal.
 *
 *      pnpm --filter @evetev/rag-assistant preguntar "como cobran?"
 *
 *  Todavia NO llama al modelo: muestra el camino que tomo la peticion y, cuando
 *  toca generar, los fragmentos que se le entregarian. Es lo que permite
 *  calibrar la compuerta antes de gastar un solo token. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Indice } from "../src/indice/tipos.js";
import { leerLimites } from "../src/limites.js";
import { responder } from "../src/responder.js";
import { leerSelladas } from "../src/selladas.js";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");

const consulta = process.argv.slice(2).join(" ").trim();
if (!consulta) {
  console.error('uso: preguntar "tu pregunta"');
  process.exit(1);
}

const indice = JSON.parse(readFileSync(join(RAIZ, "indice", "indice.json"), "utf8")) as Indice;
const selladas = leerSelladas(readFileSync(join(RAIZ, "base", "_selladas.md"), "utf8"));
const limites = leerLimites(readFileSync(join(RAIZ, "base", "_limites.md"), "utf8"));

const resultado = responder(consulta, { indice, selladas, limites });

console.log(`\n> ${consulta}\n`);

switch (resultado.camino) {
  case "sellada":
    console.log(`[SELLADA] coincide con "${resultado.pregunta}" — 0 tokens\n`);
    console.log(resultado.respuesta);
    break;
  case "limite":
    console.log(`[LIMITE] tema "${resultado.tema}" — 0 tokens\n`);
    console.log(resultado.respuesta);
    break;
  case "abstencion":
    console.log(
      `[ABSTENCION] cobertura ${resultado.senales.cobertura.toFixed(2)} bajo umbral — 0 tokens\n`
    );
    console.log(resultado.respuesta);
    break;
  case "generar": {
    console.log(
      `[GENERAR] pasa por ${resultado.decision.responder ? resultado.decision.motivo : ""}` +
        ` — cobertura ${resultado.senales.cobertura.toFixed(2)}\n`
    );
    console.log(`Fragmentos que se le entregarian al modelo (${resultado.fragmentos.length}):\n`);
    for (const f of resultado.fragmentos) {
      const marca = f.confianza === "media" ? " [confianza media]" : "";
      console.log(`  [#${f.id}] ${f.titulo} > ${f.seccion}${marca}`);
    }
    break;
  }
}
console.log("");
