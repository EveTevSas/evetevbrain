#!/usr/bin/env node
/* Mantiene una sola fuente de los archivos que comparten las landings de
 * producto: el armazón de CSS y el envío de los formularios de demo.
 *
 *   node scripts/landings-sync.mjs          → copia las fuentes a cada landing
 *   node scripts/landings-sync.mjs --check  → falla si alguna copia se desvió
 *
 * Por qué copias versionadas y no un paso de build: las landings son estáticas
 * y Vercel las despliega con Root Directory en apps/website. Leer un archivo de
 * packages/ durante el build exige activar «incluir archivos fuera del Root
 * Directory» en el proyecto — una casilla de un panel, fácil de olvidar, y que
 * rompe el despliegue sin avisar. La copia va al repo y el CI garantiza que no
 * se desvíe: la comprobación vive donde vive el código.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
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

/** Dónde aterrizan las copias. Antes eran tres carpetas —una por landing, cada
 *  una en su propio dominio— y el script las descubría por un marcador en su
 *  package.json. Ahora las tres landings son rutas de un mismo sitio
 *  (evetev.com/conecta, /evepay, /intelligence), así que comparten una sola
 *  copia servida en /landings/ y el descubrimiento sobra: un destino explícito
 *  dice más y no puede quedarse en cero por accidente. */
const DESTINO = "apps/website/landings";

const comprobar = process.argv.includes("--check");
const objetivos = [join(raiz, DESTINO)];
if (!comprobar) mkdirSync(objetivos[0], { recursive: true });

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
    ? `✓ ${DESTINO} al día`
    : `✓ sincronizado: ${COMPARTIDOS.length} archivo(s) en ${DESTINO}`
);
