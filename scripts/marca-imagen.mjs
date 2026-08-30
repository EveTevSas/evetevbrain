#!/usr/bin/env node
/* Mete una imagen nueva en la marca: la analiza, la convierte a WebP, la deja
 * en packages/brand, la apunta en el manifiesto y sincroniza las copias.
 *
 *   node scripts/marca-imagen.mjs <archivo> --app website [--app eveconecta]
 *   node scripts/marca-imagen.mjs foto.png --app website --nombre comercio-local
 *   node scripts/marca-imagen.mjs foto.png --app website --ancho 1280 --seco
 *
 * POR QUÉ EXISTE. Publicar una imagen son cinco pasos y el que se olvida
 * siempre es el cuarto. Convertir con los parámetros medidos, nombrarla sin
 * acentos, dejarla en la carpeta correcta, AÑADIRLA AL MANIFIESTO y sincronizar.
 * Sin el manifiesto el archivo está en el repositorio y no lo sirve nadie: la
 * página escribe una ruta impecable y responde 404. Peor todavía para el agente
 * de Eve Studio, que lista `packages/brand` —donde el archivo YA aparece— y
 * concluye que puede citarlo. Una imagen rota no falla ruidosamente.
 *
 * POR QUÉ NO USA EL CDN. Lo usaba: `cdn.jsdelivr.net/gh/Evetev-Dev/brand@1`.
 * Ese repositorio se borró en agosto de 2026 y cada app sirve hoy su marca
 * desde su propio origen. Ver packages/brand/assets/COMO-SE-SIRVEN.md.
 *
 * POR QUÉ cwebp Y NO UNA DEPENDENCIA. `sharp` son ~30 MB de binarios por
 * plataforma en un monorepo que no procesa imágenes en ningún build. Esto corre
 * a mano, unas pocas veces al mes, en el Mac de quien publica. La receta
 * —2048 px, calidad 80, alfa 50— está medida, no supuesta: el alfa cuesta la
 * mitad del archivo y bajarlo a 50 quita ~140 KB sin que se note; la calidad
 * casi no mueve el peso, el ancho sí.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, dirname, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFIESTO = join(raiz, "scripts/marca-sync.mjs");

const ANCHO_POR_DEFECTO = 2048;
const CALIDAD = 80;
const CALIDAD_ALFA = 50;
/* A partir de aquí la imagen empieza a pesar en la carga de la página. No es un
   error —hay ilustraciones que lo justifican— pero sí algo que hay que ver. */
const PESO_QUE_PREOCUPA = 250 * 1024;

const rojo = (t) => `\x1b[31m${t}\x1b[0m`;
const verde = (t) => `\x1b[32m${t}\x1b[0m`;
const gris = (t) => `\x1b[2m${t}\x1b[0m`;

function morir(mensaje, pista) {
  console.error(`\n${rojo("✗")} ${mensaje}`);
  if (pista) console.error(`  ${gris(pista)}`);
  process.exit(1);
}

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

// ── Argumentos ─────────────────────────────────────────────────────────────
const USO =
  "Uso: node scripts/marca-imagen.mjs <archivo> --app <app> [--app <otra>]\n" +
  "       [--nombre <sin-extension>] [--carpeta ilustraciones|mascota|…]\n" +
  "       [--ancho 2048] [--reemplazar] [--seco]";

const argv = process.argv.slice(2);
const apps = [];
let origen = null;
let nombre = null;
let carpeta = null;
let ancho = ANCHO_POR_DEFECTO;
let seco = false;
let reemplazar = false;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--app") apps.push(argv[++i]);
  else if (a === "--nombre") nombre = argv[++i];
  else if (a === "--carpeta") carpeta = argv[++i];
  else if (a === "--ancho") ancho = Number(argv[++i]);
  else if (a === "--seco") seco = true;
  else if (a === "--reemplazar") reemplazar = true;
  else if (a.startsWith("--")) morir(`No conozco la opción ${a}.`, USO);
  else if (origen === null) origen = a;
  else morir(`Sobra el argumento "${a}": solo se publica una imagen por vez.`);
}

if (!origen) morir("Falta la imagen a publicar.", USO);
if (!existsSync(origen)) morir(`No existe el archivo ${origen}.`);
if (!apps.length) morir("Falta --app: hay que decir qué app va a servir la imagen.", USO);
if (!Number.isInteger(ancho) || ancho < 16 || ancho > 8192)
  morir(`--ancho ${ancho} no es un ancho razonable (16–8192).`);

// ── El manifiesto es la fuente de verdad de qué apps existen ───────────────
/* Se lee con expresiones regulares y no se importa: marca-sync.mjs sincroniza
   al importarse, y aquí solo queremos mirarlo. Es frágil a propósito — si el
   formato del manifiesto cambia, esto se para y lo dice, en vez de escribir en
   un sitio equivocado. */
const manifiesto = readFileSync(MANIFIESTO, "utf8");
const bloques = [...manifiesto.matchAll(/nombre:\s*"([^"]+)",\s*\n\s*destino:\s*"([^"]+)"/g)].map(
  (m) => ({ nombre: m[1], destino: m[2], indice: m.index })
);
if (!bloques.length)
  morir(
    "No encuentro las apps dentro de scripts/marca-sync.mjs.",
    "¿Cambió el formato del manifiesto? Revísalo antes de seguir."
  );

for (const app of apps) {
  if (!bloques.some((b) => b.nombre === app))
    morir(
      `La app "${app}" no está en el manifiesto.`,
      `Las que hay: ${bloques.map((b) => b.nombre).join(", ")}.`
    );
}

// ── Análisis de la fuente ──────────────────────────────────────────────────
/* Cabeceras a mano, sin dependencias. Solo se necesitan tres datos —formato,
   tamaño y si trae transparencia— y los tres viven en los primeros bytes. */
function analizar(buf, ruta) {
  const bytes = buf.length;

  // PNG: firma, luego IHDR con ancho, alto y tipo de color en los bytes 16–25.
  if (buf.length > 24 && buf.toString("hex", 0, 8) === "89504e470d0a1a0a") {
    const tipoColor = buf[25];
    return {
      formato: "PNG",
      ancho: buf.readUInt32BE(16),
      alto: buf.readUInt32BE(20),
      // 4 = gris+alfa, 6 = RGB+alfa. Un tRNS también da transparencia en los
      // otros tipos, así que se busca el trozo por si acaso.
      alfa: tipoColor === 4 || tipoColor === 6 || buf.includes(Buffer.from("tRNS"))
    };
  }

  // JPEG: recorrer marcadores hasta un SOF, que lleva las dimensiones. No hay
  // transparencia en JPEG, y esa es justamente la razón de que esté descartado
  // para las ilustraciones: van de fondo con `contain` y el rectángulo blanco
  // se recorta contra el degradado de la portada.
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marca = buf[i + 1];
      const esSOF = marca >= 0xc0 && marca <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marca);
      if (esSOF)
        return {
          formato: "JPEG",
          alto: buf.readUInt16BE(i + 5),
          ancho: buf.readUInt16BE(i + 7),
          alfa: false
        };
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return { formato: "JPEG", ancho: 0, alto: 0, alfa: false };
  }

  // WebP: RIFF/WEBP. VP8X trae dimensiones-1 en 24 bits y un bit de alfa;
  // VP8L (sin pérdida) y VP8 (con pérdida) las traen en otro sitio.
  if (
    buf.length > 30 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    const tipo = buf.toString("ascii", 12, 16);
    if (tipo === "VP8X")
      return {
        formato: "WebP",
        ancho: (buf.readUIntLE(24, 3) & 0xffffff) + 1,
        alto: (buf.readUIntLE(27, 3) & 0xffffff) + 1,
        alfa: Boolean(buf[20] & 0x10)
      };
    if (tipo === "VP8L") {
      const b = buf.readUInt32LE(21);
      return {
        formato: "WebP",
        ancho: (b & 0x3fff) + 1,
        alto: ((b >> 14) & 0x3fff) + 1,
        alfa: Boolean((buf[24] >> 4) & 0x08)
      };
    }
    if (tipo === "VP8 ")
      return {
        formato: "WebP",
        ancho: buf.readUInt16LE(26) & 0x3fff,
        alto: buf.readUInt16LE(28) & 0x3fff,
        alfa: false
      };
  }

  if (buf.toString("utf8", 0, 400).includes("<svg"))
    morir(
      `${ruta} es un SVG, y aquí no se convierte.`,
      "Un SVG ya es ligero: cópialo a packages/brand/ y añádelo al manifiesto a mano.\n" +
        "  Y si es una ilustración de escena, no la dibujes: se generan."
    );

  morir(
    `No reconozco el formato de ${ruta}.`,
    "Se admiten PNG, JPEG y WebP. Si viene de otra herramienta, expórtalo a PNG primero."
  );
}

const fuente = readFileSync(origen);
const info = analizar(fuente, origen);

// ── Nombre y destino ───────────────────────────────────────────────────────
/* Sin acentos ni espacios: el nombre acaba en una URL y en el manifiesto, y un
   archivo llamado `Ilustración final (2).png` los rompe los dos. */
const aKebab = (t) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const base = aKebab(nombre ?? basename(origen, extname(origen)));
if (!base) morir("El nombre queda vacío tras limpiarlo. Pasa uno con --nombre.");
const archivo = `${base}.webp`;

/* Las ilustraciones cuelgan de la raíz de packages/brand y todo lo demás de
   assets/. Es la misma traducción que hacen marca-sync.mjs y el agente. */
carpeta = carpeta ? carpeta.replace(/^\/|\/$/g, "") : "ilustraciones";
const rutaEnMarca = `${carpeta}/${archivo}`;
const destinoAbs =
  carpeta === "ilustraciones"
    ? join(raiz, "packages/brand", rutaEnMarca)
    : join(raiz, "packages/brand/assets", rutaEnMarca);

if (!existsSync(dirname(destinoAbs)))
  morir(
    `No existe la carpeta packages/brand/${carpeta === "ilustraciones" ? "" : "assets/"}${carpeta}.`,
    "Créala si de verdad es una familia nueva de activos; si no, revisa --carpeta."
  );

/* Reemplazar el contenido de una ruta que ya se sirve es distinto de publicar
   una imagen nueva: la URL no cambia, y ningún navegador que ya la tenga se
   entera. Lo que se ve entonces es la imagen VIEJA con el CSS NUEVO, que parece
   un fallo de despliegue y no lo es. */
const yaExistia = existsSync(destinoAbs);
if (yaExistia && !reemplazar)
  morir(
    `Ya hay un activo en packages/brand/${carpeta === "ilustraciones" ? "" : "assets/"}${rutaEnMarca}.`,
    "Si es una imagen distinta, dale otro nombre con --nombre: la URL tiene que cambiar\n" +
      "  para que los navegadores se enteren. Si de verdad quieres pisarla, --reemplazar."
  );

// ── Conversión ─────────────────────────────────────────────────────────────
try {
  execFileSync("cwebp", ["-version"], { stdio: "ignore" });
} catch {
  morir("No encuentro `cwebp`.", "Instálalo con: brew install webp");
}

/* Reducir sí, ampliar no: estirar una fuente pequeña no añade detalle, solo
   peso y bordes blandos. */
const anchoFinal = info.ancho && info.ancho < ancho ? info.ancho : ancho;
const argumentos = [
  "-q",
  String(CALIDAD),
  "-alpha_q",
  String(CALIDAD_ALFA),
  ...(anchoFinal !== info.ancho ? ["-resize", String(anchoFinal), "0"] : []),
  ...(info.alfa ? [] : ["-noalpha"]),
  "-quiet",
  origen,
  "-o",
  seco ? join(raiz, ".marca-imagen-prueba.webp") : destinoAbs
];

console.log(`\n  fuente   ${origen}`);
console.log(
  `           ${info.formato} · ${info.ancho}×${info.alto} · ${kb(info.bytes ?? fuente.length)}` +
    ` · ${info.alfa ? "con transparencia" : "sin transparencia"}`
);

if (!seco) mkdirSync(dirname(destinoAbs), { recursive: true });
try {
  execFileSync("cwebp", argumentos, { stdio: ["ignore", "ignore", "pipe"] });
} catch (e) {
  morir(`cwebp no pudo convertir la imagen.`, String(e.stderr || e.message).trim());
}

const salida = seco ? join(raiz, ".marca-imagen-prueba.webp") : destinoAbs;
const pesoFinal = statSync(salida).size;
console.log(
  `  ${verde("→")} WebP     ${anchoFinal}px · calidad ${CALIDAD}` +
    `${info.alfa ? ` · alfa ${CALIDAD_ALFA}` : ""} · ${kb(pesoFinal)}`
);
if (info.ancho && info.ancho < ancho)
  console.log(
    `           ${gris(`la fuente medía ${info.ancho}px: no se amplía, se deja como está`)}`
  );
if (pesoFinal > PESO_QUE_PREOCUPA)
  console.log(
    `           ${gris(`pesa más de ${kb(PESO_QUE_PREOCUPA)}. Si hay que recortar, baja --ancho: la calidad casi no mueve el peso.`)}`
  );

if (seco) {
  console.log(
    `\n  ${gris("--seco: no se ha tocado el repositorio. Prueba en .marca-imagen-prueba.webp")}`
  );
  process.exit(0);
}

// ── Manifiesto ─────────────────────────────────────────────────────────────
/* El paso que se olvida. Se inserta la ruta en la lista `activos` de cada app
   pedida, respetando el orden en que se listaron las apps. */
let texto = readFileSync(MANIFIESTO, "utf8");
const anotadas = [];

for (const app of apps) {
  const inicio = texto.indexOf(`nombre: "${app}"`);
  const iActivos = texto.indexOf("activos: [", inicio);
  const iFin = texto.indexOf("]", iActivos);
  if (inicio === -1 || iActivos === -1 || iFin === -1)
    morir(`No encuentro la lista de activos de "${app}" en el manifiesto.`);

  const lista = texto.slice(iActivos, iFin);
  if (lista.includes(`"${rutaEnMarca}"`)) {
    console.log(`\n  = ${app} ya tenía ${rutaEnMarca} en el manifiesto`);
    continue;
  }

  /* Se inserta sin cuidar la sangría —una lista de una sola línea y otra de
     diez la quieren distinta— y luego se pasa Prettier, que es quien decide el
     formato en este repositorio. El CI corre `pnpm format:check`: dejar aquí
     una coma mal puesta rompería la rama entera por un espacio. */
  texto = `${texto.slice(0, iFin).replace(/\s*$/, "")}, "${rutaEnMarca}"${texto.slice(iFin)}`;
  anotadas.push(app);
}

if (anotadas.length) {
  writeFileSync(MANIFIESTO, texto);
  try {
    execFileSync("npx", ["prettier", "--write", "--log-level", "warn", MANIFIESTO], {
      cwd: raiz,
      stdio: ["ignore", "ignore", "pipe"]
    });
  } catch (e) {
    morir(
      "Prettier no pudo formatear el manifiesto tras anotar la imagen.",
      `Está escrito pero mal formateado, y el CI corre \`pnpm format:check\`.\n` +
        `  Arréglalo con: pnpm format\n  ${String(e.stderr || e.message).trim()}`
    );
  }
  console.log(`\n  ${verde("↻")} scripts/marca-sync.mjs — anotado en: ${anotadas.join(", ")}`);
}

// ── Sincronizar ────────────────────────────────────────────────────────────
console.log("\n  pnpm marca:sync");
try {
  execFileSync(process.execPath, [join(raiz, "scripts/marca-sync.mjs")], {
    stdio: "inherit",
    cwd: raiz
  });
} catch {
  morir(
    "La sincronización falló.",
    "La imagen y el manifiesto quedaron escritos; revisa el error de arriba antes de subir nada."
  );
}

// ── El parte para Eve Studio ───────────────────────────────────────────────
const rutasPublicas = apps.map((app) => {
  const b = bloques.find((x) => x.nombre === app);
  return { app, destino: b.destino, url: `/marca/${archivo}` };
});

console.log(`\n${verde("✓")} Listo. La imagen se sirve en:\n`);
for (const { app, destino } of rutasPublicas)
  console.log(`     ${app.padEnd(14)} ${destino}/${archivo}`);

console.log(`\n${gris("─".repeat(72))}`);
console.log("Para Eve Studio — pégale esto tal cual:\n");
console.log(`  Usa la imagen /marca/${archivo} (${anchoFinal}px de ancho,`);
console.log(
  `  ${info.alfa ? "con transparencia" : "sin transparencia"}, ${kb(pesoFinal)}). Ya está publicada y servida`
);
console.log(`  por ${apps.join(" y ")}. Cítala con esa ruta absoluta tal cual, sin`);
console.log(`  pasar por 'obtener_activo_github' ni por ningún CDN.`);
console.log(`${gris("─".repeat(72))}`);
console.log(
  `\n${gris("Falta subirlo: la imagen, el manifiesto y las copias que generó marca:sync van en el mismo commit.")}`
);
