#!/usr/bin/env node
/* Mantiene una sola fuente de los archivos que comparten las landings de
 * producto: el armazón de CSS y el envío de los formularios de demo.
 *
 *   node scripts/landings-sync.mjs          → copia las fuentes a cada landing
 *   node scripts/landings-sync.mjs --check  → falla si alguna copia se desvió
 *
 * Por qué copias versionadas y no un paso de build: las landings son estáticas
 * y Vercel las despliega con Root Directory en apps/<landing>. Leer un archivo
 * de packages/ durante el build exige activar «incluir archivos fuera del Root
 * Directory» en cada proyecto — una casilla de un panel, fácil de olvidar en el
 * siguiente proyecto, y que rompe el despliegue sin avisar. La copia va al repo
 * y el CI garantiza que no se desvíe: la comprobación vive donde vive el código.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Qué se comparte. Los dos son texto y admiten el mismo comentario de
 *  cabecera, así que el aviso vale igual para el CSS que para el JS. */
const COMPARTIDOS = [
  { fuente: "packages/brand/landing/base.css", destino: "base.css" },
  { fuente: "packages/brand/landing/formularios.js", destino: "formularios.js" }
];

const aviso = (fuente) => `/* ARCHIVO GENERADO — NO EDITAR.
   Copia de ${fuente}. Edita allí y corre \`pnpm landings:sync\`.
   Los cambios hechos aquí los revierte el siguiente sync, y el CI los rechaza. */\n\n`;

/** Una landing se declara a sí misma con "evetev": { "landing": true } en su
 *  package.json. Se prefiere a detectarlas por el nombre de la carpeta o por
 *  la presencia del archivo: una app nueva se apunta escribiendo una línea, sin
 *  tener que crear antes las copias vacías ni tocar este script. */
function landings() {
  const apps = join(raiz, "apps");
  return readdirSync(apps, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(apps, d.name))
    .filter((dir) => {
      const pkg = join(dir, "package.json");
      if (!existsSync(pkg)) return false;
      return JSON.parse(readFileSync(pkg, "utf8")).evetev?.landing === true;
    });
}

const comprobar = process.argv.includes("--check");
const objetivos = landings();

if (objetivos.length === 0) {
  // Sin destinos no hay nada que garantizar, y un "todo bien" aquí sería
  // engañoso: significa que el descubrimiento falló, no que esté sincronizado.
  console.error("✗ No se encontró ninguna landing. ¿Se movieron las apps?");
  process.exit(1);
}

let desviadas = 0;
for (const { fuente, destino } of COMPARTIDOS) {
  const esperado = aviso(fuente) + readFileSync(join(raiz, fuente), "utf8");

  for (const dir of objetivos) {
    const ruta = join(dir, destino);
    const rel = ruta.slice(raiz.length + 1);
    const actual = existsSync(ruta) ? readFileSync(ruta, "utf8") : null;

    if (actual === esperado) {
      if (!comprobar) console.log(`  = ${rel}`);
      continue;
    }
    if (comprobar) {
      console.error(`  ✗ ${rel} ${actual === null ? "no existe" : "se desvió de la fuente"}`);
      desviadas++;
    } else {
      writeFileSync(ruta, esperado);
      console.log(`  ↻ ${rel}`);
    }
  }
}

if (comprobar && desviadas > 0) {
  console.error(
    `\n${desviadas} copia(s) desviada(s). Edita la fuente en packages/brand/landing/` +
      " y corre `pnpm landings:sync`."
  );
  process.exit(1);
}
console.log(
  comprobar
    ? `✓ ${objetivos.length} landing(s) al día`
    : `✓ sincronizado: ${COMPARTIDOS.length} archivo(s) × ${objetivos.length} landing(s)`
);
