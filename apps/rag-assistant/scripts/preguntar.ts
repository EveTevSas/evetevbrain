/** Banco de pruebas del motor, en la terminal.
 *
 *      pnpm --filter @evetev/rag-assistant preguntar "¿cómo cobran?"
 *
 *  Sin `MOONSHOT_API_KEY` muestra el camino que tomo la peticion y los
 *  fragmentos que se entregarian — util para calibrar la compuerta sin gastar
 *  un token. Con llave, responde de verdad y verifica lo que el modelo escribio.
 */
import { atender } from "../src/atender.js";
import { cargar } from "../src/cargar.js";
import { motorMoonshot } from "../src/generar/moonshot.js";
import { responder } from "../src/responder.js";

const consulta = process.argv.slice(2).join(" ").trim();
if (!consulta) {
  console.error('uso: preguntar "tu pregunta"');
  process.exit(1);
}

const cargado = cargar();
const llave = process.env["MOONSHOT_API_KEY"];

console.log(`\n> ${consulta}\n`);

if (!llave) {
  const r = responder(consulta, cargado);
  if (r.camino === "generar") {
    console.log(
      `[GENERAR] cobertura ${r.senales.cobertura.toFixed(2)} — sin llave, no se llama al modelo`
    );
    console.log(`\nFragmentos que se entregarian (${r.fragmentos.length}):\n`);
    for (const f of r.fragmentos) {
      const marca = f.confianza === "media" ? " [confianza media]" : "";
      console.log(`  [#${f.id}] ${f.titulo} > ${f.seccion}${marca}`);
    }
  } else {
    console.log(`[${r.camino.toUpperCase()}] — 0 tokens\n`);
    console.log(r.respuesta);
  }
  console.log("");
  process.exit(0);
}

const motor = motorMoonshot({
  llave,
  modelo: process.env["FLUXI_MODELO"] ?? "kimi-k2.6",
  claveDeCache: "fluxi-sistema-v1"
});

const r = await atender(consulta, { ...cargado, motor });

const etiqueta = r.camino.toUpperCase();
if (r.uso) {
  const { tokensEntrada, tokensSalida, tokensCacheados, milisegundos } = r.uso;
  console.log(
    `[${etiqueta}] ${motor.nombre} · ${milisegundos} ms · ${tokensEntrada} entrada` +
      ` (${tokensCacheados} en cache) · ${tokensSalida} salida\n`
  );
} else {
  console.log(`[${etiqueta}] — 0 tokens\n`);
}
if (r.descarte) console.log(`descartada por ${r.descarte}\n`);
console.log(r.respuesta);
console.log("");
