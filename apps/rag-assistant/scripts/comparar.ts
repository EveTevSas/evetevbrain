/** Compara modelos generadores sobre las mismas preguntas.
 *
 *      MOONSHOT_API_KEY=... pnpm --filter @evetev/rag-assistant comparar
 *
 *  Existe porque el nivel de modelo **se elige midiendo**, no heredandolo de
 *  otra app. Mide latencia, tokens y si la respuesta sobrevivio a la
 *  verificacion de citas y cifras. */
import { atender } from "../src/atender.js";
import { cargar } from "../src/cargar.js";
import { motorMoonshot } from "../src/generar/moonshot.js";

const MODELOS = (process.env["FLUXI_MODELOS"] ?? "kimi-k3,kimi-k2.6").split(",");

const PREGUNTAS = [
  "quien autoriza los gastos del conjunto",
  "el dinero pasa por su tesoreria",
  "hacen inteligencia artificial empresarial",
  "como es la integracion para desarrolladores",
  "que pasa si mi cliente paga dos veces",
  "puedo cobrar por whatsapp"
];

const llave = process.env["MOONSHOT_API_KEY"];
if (!llave) {
  console.error("falta MOONSHOT_API_KEY");
  process.exit(1);
}

const indice = cargar();

for (const modelo of MODELOS) {
  const motor = motorMoonshot({ llave, modelo, claveDeCache: "fluxi-sistema-v1" });
  console.log(`\n${"=".repeat(72)}\n${modelo}\n${"=".repeat(72)}`);

  let msTotal = 0;
  let entradaTotal = 0;
  let salidaTotal = 0;
  let cacheTotal = 0;
  let descartadas = 0;
  let generadas = 0;

  for (const pregunta of PREGUNTAS) {
    const r = await atender(pregunta, { indice, motor });
    if (r.uso) {
      msTotal += r.uso.milisegundos;
      entradaTotal += r.uso.tokensEntrada;
      salidaTotal += r.uso.tokensSalida;
      cacheTotal += r.uso.tokensCacheados;
    }
    if (r.camino === "descartada") descartadas++;
    if (r.camino === "generada") generadas++;

    const ms = r.uso ? `${r.uso.milisegundos} ms` : "0 tokens";
    console.log(`\n> ${pregunta}\n  [${r.camino}] ${ms}`);
    if (r.descarte) console.log(`  descartada por ${r.descarte}`);
    console.log(`  ${r.respuesta.replace(/\n+/g, "\n  ")}`);
  }

  const n = generadas + descartadas || 1;
  console.log(
    `\n--- ${modelo}: ${generadas} generadas, ${descartadas} descartadas · ` +
      `${Math.round(msTotal / n)} ms de media · ` +
      `${Math.round(entradaTotal / n)} tokens de entrada (${Math.round(cacheTotal / n)} en cache) · ` +
      `${Math.round(salidaTotal / n)} de salida`
  );
}
console.log("");
