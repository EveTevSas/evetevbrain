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
      "ilustraciones/tingua-card.webp",
      "ilustraciones/tingua-con-celular.webp"
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

/** Lo que no se copia como archivo, sino que se incrusta dentro de otro.
 *
 *  La API no sirve estáticos —su panel de administración es una sola plantilla
 *  HTML— así que sus tokens van dentro del propio archivo, entre dos marcas.
 *  Se sincroniza igual que lo demás porque ya se desvió una vez: se incrustó la
 *  copia, luego se corrigió un comentario en la fuente, y la copia se quedó
 *  atrás publicando una URL muerta. Nadie lo habría visto, y redesplegar no lo
 *  arreglaba: el texto viejo estaba en el código, no en el build. */
/** El destino es un template literal de TypeScript, así que un backtick o un
 *  ${ dentro del CSS cerrarían la cadena y romperían el build. Pasó: la fuente
 *  llevaba `pnpm marca:sync` entre backticks en un comentario y `nest build`
 *  falló con «',' expected». Se escapa aquí y no se prohíbe en la fuente,
 *  porque la fuente es CSS y no tiene por qué saber dónde acaba copiada. */
const escaparParaPlantilla = (texto) =>
  texto.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

const INCRUSTADOS = [
  {
    archivo: "apps/api/src/modules/admin/admin-page.ts",
    fuente: "packages/brand/assets/tokens/colores.css",
    inicio: "/* MARCA:INICIO tokens",
    fin: "/* MARCA:FIN */"
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

for (const { archivo, fuente, inicio, fin } of INCRUSTADOS) {
  const ruta = join(raiz, archivo);
  const texto = readFileSync(ruta, "utf8");
  const i = texto.indexOf(inicio);
  const j = texto.indexOf(fin, i);
  if (i === -1 || j === -1) {
    console.error(`  ✗ ${archivo}: no encuentro las marcas ${inicio}…${fin}`);
    problemas++;
    continue;
  }
  /* Del bloque solo se compara lo que viene DESPUÉS del comentario de cabecera:
     esa cabecera explica por qué está incrustado y no existe en la fuente. */
  const finCabecera = texto.indexOf("*/", i) + 2;
  const actual = texto.slice(finCabecera, j).trim();
  const esperado = escaparParaPlantilla(readFileSync(join(raiz, fuente), "utf8").trim());

  if (actual === esperado) {
    if (!comprobar) console.log(`  = ${archivo} (tokens incrustados)`);
    continue;
  }
  if (comprobar) {
    console.error(`  ✗ ${archivo}: los tokens incrustados se desviaron de ${fuente}`);
    problemas++;
  } else {
    writeFileSync(ruta, texto.slice(0, finCabecera) + "\n" + esperado + "\n" + texto.slice(j));
    console.log(`  ↻ ${archivo} (tokens incrustados)`);
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
console.log(
  comprobar
    ? `✓ ${APPS.length} app(s) + ${INCRUSTADOS.length} incrustado(s) al día`
    : `✓ sincronizadas ${APPS.length} app(s) y ${INCRUSTADOS.length} incrustado(s)`
);
