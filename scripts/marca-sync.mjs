#!/usr/bin/env node
/* Copia los activos de marca desde packages/brand a la carpeta pública de cada
 * app que los use.
 *
 *   node scripts/marca-sync.mjs          → copia
 *   node scripts/marca-sync.mjs --check  → falla si alguna copia se desvió
 *
 * POR QUÉ EXISTE. Hasta agosto de 2026 estos archivos se pedían al CDN
 * (jsdelivr sobre el repo Evetev-Dev/brand). Ese repo se borró, y con él la
 * dependencia: ahora cada app sirve la marca desde su propio origen. Si una app
 * se cae, se cae sola; ninguna depende del despliegue de otra ni de un tercero.
 *
 * POR QUÉ COPIAS Y NO UN IMPORT. Las apps son estáticas o de Next, y cada una
 * se despliega con su propio Root Directory en Vercel. Leer de packages/ en el
 * build exige activar «incluir archivos fuera del Root Directory» en cada
 * proyecto: una casilla de un panel, fácil de olvidar en el proyecto siguiente,
 * que rompe el despliegue sin avisar. La copia va al repo y el CI la vigila.
 *
 * POR QUÉ UN MANIFIESTO Y NO «COPIAR TODO». Las ilustraciones pesan 200 KB
 * cada una. Copiarlas a las siete apps mete un megabyte largo en el repo para
 * que seis no lo usen. Cada app declara lo que necesita, y añadir un activo a
 * una página es una línea aquí — que además deja dicho quién usa qué.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Dónde vive cada activo dentro de packages/brand. El CDN los servía en la
 *  raíz (`@1/favicon/…`), pero aquí `assets/` los agrupa y `ilustraciones/`
 *  está fuera; este mapa traduce entre las dos formas para que el manifiesto se
 *  escriba con los nombres de siempre. */
const ORIGEN = (activo) =>
  activo.startsWith("ilustraciones/")
    ? join(raiz, "packages/brand", activo)
    : join(raiz, "packages/brand/assets", activo);

/** Qué necesita cada app, y dónde lo sirve.
 *
 *  `destino` es la carpeta que el navegador ve como /marca: la raíz del sitio
 *  en las estáticas, public/ en las de Next. */
const APPS = [
  {
    nombre: "website",
    destino: "apps/website/marca",
    activos: [
      "favicon/favicon.svg",
      "favicon/favicon-32.png",
      "favicon/apple-touch-icon.png",
      "favicon/mask-icon.svg",
      "isotipos/isotipo-azul-noche.svg",
      "isotipos/isotipo-cian.svg",
      "isotipos/isotipo-gradiente-corporativo.svg",
      "unidades/unidad-izquierda-negro.svg",
      "unidades/unidad-derecha-negro.svg",
      "tokens/colores.css",
      "mascota/mascota-saludando.png",
      "mascota/mascota-contacto-cliente.webp",
      "ilustraciones/conjunto-residencial-calle.webp",
      "ilustraciones/pasarela-de-pago.webp",
      "ilustraciones/asistente-documental.webp",
      "ilustraciones/datafono.webp",
      "ilustraciones/tingua.webp",
      "ilustraciones/colibri.webp"
    ]
  },
  {
    nombre: "eveconecta",
    destino: "apps/eveconecta/public/marca",
    activos: ["ilustraciones/conjunto-residencial-calle.webp"]
  },
  {
    nombre: "eveledger",
    destino: "apps/eveledger/public/marca",
    activos: [
      "favicon/favicon.svg",
      "favicon/favicon-32.png",
      "favicon/apple-touch-icon.png",
      "favicon/mask-icon.svg",
      "isotipos/isotipo-azul-noche.svg"
    ]
  },
  {
    nombre: "evepay-admin",
    destino: "apps/evepay-admin/public/marca",
    activos: [
      "favicon/favicon.svg",
      "isotipos/isotipo-azul-noche.svg",
      "ilustraciones/pasarela-de-pago.webp"
    ]
  },
  {
    nombre: "eve-merchants",
    destino: "apps/eve-merchants/public/marca",
    activos: [
      "favicon/favicon.svg",
      "favicon/apple-touch-icon.png",
      "isotipos/isotipo-azul-noche.svg"
    ]
  },
  {
    nombre: "eve-studio",
    destino: "apps/eve-studio/public/marca",
    activos: [
      "favicon/favicon.svg",
      "favicon/mask-icon.svg",
      "isotipos/isotipo-azul-noche.svg",
      "tokens/colores.css"
    ]
  },
  {
    // El widget se incrusta en páginas ajenas, así que su mascota NO puede ser
    // una ruta relativa: se resuelve contra el origen del propio script (ver
    // `nuevaBase` en fluxi.js), que es este servicio.
    nombre: "rag-assistant",
    destino: "apps/rag-assistant/public/marca",
    activos: ["mascota/mascota.webp"]
  }
];

const comprobar = process.argv.includes("--check");
let problemas = 0;

for (const { nombre, destino, activos } of APPS) {
  const dir = join(raiz, destino);
  if (!comprobar) mkdirSync(dir, { recursive: true });

  const esperados = new Set(activos.map((a) => a.split("/").pop()));

  for (const activo of activos) {
    const origen = ORIGEN(activo);
    if (!existsSync(origen)) {
      console.error(`  ✗ ${nombre}: no existe la fuente ${activo}`);
      problemas++;
      continue;
    }
    const ruta = join(dir, activo.split("/").pop());
    const rel = ruta.slice(raiz.length + 1);
    const fuente = readFileSync(origen);
    const actual = existsSync(ruta) ? readFileSync(ruta) : null;

    if (actual && actual.equals(fuente)) {
      if (!comprobar) console.log(`  = ${rel}`);
      continue;
    }
    if (comprobar) {
      console.error(`  ✗ ${rel} ${actual === null ? "no existe" : "se desvió de la fuente"}`);
      problemas++;
    } else {
      writeFileSync(ruta, fuente);
      console.log(`  ↻ ${rel}`);
    }
  }

  /* Lo que sobra también es un problema: un activo que se quita del manifiesto
     pero se queda en la carpeta sigue sirviéndose, y la página que lo use
     seguirá funcionando hasta que alguien despliegue desde un clon limpio. */
  if (existsSync(dir)) {
    for (const f of readdirSync(dir)) {
      if (esperados.has(f)) continue;
      const rel = join(destino, f);
      if (comprobar) {
        console.error(`  ✗ ${rel} sobra: no está en el manifiesto`);
        problemas++;
      } else {
        rmSync(join(dir, f));
        console.log(`  − ${rel} (sobraba)`);
      }
    }
  }
}

if (problemas > 0) {
  if (comprobar) {
    console.error(
      `\n${problemas} problema(s). Corre \`pnpm marca:sync\` y súbelo, o corrige el manifiesto` +
        " en scripts/marca-sync.mjs."
    );
  }
  process.exit(1);
}
console.log(comprobar ? `✓ ${APPS.length} app(s) al día` : `✓ sincronizadas ${APPS.length} app(s)`);
