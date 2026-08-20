/** Compara las dos senales de la compuerta sobre preguntas de dentro y de
 *  fuera del alcance. Herramienta de calibracion, no parte del motor. */
import { cargar } from "../src/cargar.js";
import { buscarBm25, cobertura, coberturaPonderada } from "../src/recuperar/bm25.js";
import { fusionarRrf } from "../src/recuperar/rrf.js";

const DENTRO = [
  "que pasa si mi cliente paga dos veces",
  "ustedes se quedan con mi plata mientras tanto",
  "quien autoriza los gastos del conjunto",
  "el dinero pasa por su tesoreria",
  "puedo cobrar por whatsapp",
  "hacen inteligencia artificial empresarial",
  "que ve un residente en el portal",
  "guardan el numero de mi tarjeta"
];

const FUERA = [
  "cual es la capital de Francia",
  "dame una receta de arepas",
  "quien gano el mundial de futbol",
  "como configuro mi router wifi",
  "cuanto cuesta un carro en Colombia"
];

const indice = cargar();

function medir(consulta: string) {
  const lista = buscarBm25(indice.bm25, consulta, 20);
  const mejor = fusionarRrf([lista], 1)[0];
  const frag = mejor ? indice.fragmentos[mejor.posicion] : undefined;
  if (!frag) return { plana: 0, ponderada: 0, id: "—" };
  return {
    plana: cobertura(consulta, frag.texto),
    ponderada: coberturaPonderada(indice.bm25, consulta, frag.texto),
    id: frag.id
  };
}

for (const [rotulo, preguntas] of [
  ["DENTRO", DENTRO],
  ["FUERA", FUERA]
] as const) {
  console.log(`\n${rotulo}`);
  for (const p of preguntas) {
    const { plana, ponderada, id } = medir(p);
    console.log(
      `  plana ${plana.toFixed(2)}  ponderada ${ponderada.toFixed(2)}  ${p.padEnd(46)} ${id}`
    );
  }
}
console.log("");
