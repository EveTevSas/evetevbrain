#!/usr/bin/env node
/* Materia prima para elegir el tema de un artículo.
 *
 *   pnpm --filter @evetev/eve-store blog:temas                       → semillas del catálogo
 *   pnpm --filter @evetev/eve-store blog:temas "piel seca" "bloqueador"  → semillas propias
 *
 * Saca tres cosas y no decide nada:
 *
 *   1. Lo que vende la tienda HOY, publicado y con existencias: es el mapa de
 *      temas posibles, porque un artículo sin producto al que llevar no cumple
 *      el paso 4 de la guía.
 *   2. Qué busca la gente en Colombia alrededor de cada semilla, según el
 *      autocompletado de Google y de YouTube. Es literalmente el método de la
 *      guía —«escribir una palabra y ver qué sugiere el buscador»—, y como la
 *      consulta va sin cookies ni historial, sale lo mismo que en una ventana
 *      privada.
 *   3. Los artículos que ya existen, para no repetir tema y para saber a qué
 *      enlazar.
 *
 * El autocompletado dice qué se busca, no cuánto ni si está subiendo. Para
 * «tendencia» en sentido estricto, la skill completa con Google Trends y con
 * noticias del momento; este script es el punto de partida, no el veredicto.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parse as leerYaml } from "yaml";

import { cargarEntorno } from "./entorno.mjs";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
cargarEntorno();

async function catalogoPublicado() {
  if (process.env.DATABASE_URL && process.env.TIENDA_FIXTURE !== "1") {
    try {
      const postgres = (await import("postgres")).default;
      const sql = postgres(process.env.DATABASE_URL, {
        prepare: false,
        onnotice: () => {},
        connect_timeout: 12
      });
      const filas = await sql`
        select slug, nombre, marca, contenido, existencias, atributos
          from tienda.producto where publicado order by marca, nombre`;
      await sql.end();
      return { origen: "base de datos (publicados)", filas };
    } catch (x) {
      console.warn(
        `· La base no respondió (${x.message}); se usa el volcado del repo, que NO sabe qué está publicado.`
      );
    }
  }
  const json = JSON.parse(readFileSync(join(raiz, "catalogo", "catalogo.json"), "utf8"));
  return { origen: "catalogo.json (sin estado de publicación)", filas: json.productos };
}

async function sugerencias(q, ds) {
  const url =
    "https://suggestqueries.google.com/complete/search?client=firefox&hl=es&gl=co&ie=utf-8&oe=utf-8" +
    (ds ? `&ds=${ds}` : "") +
    `&q=${encodeURIComponent(q)}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    return (await r.json())[1] ?? [];
  } catch {
    return [];
  }
}

/* De «Aceite de Coco Orgánico» a «aceite de coco»: la semilla es el
   ingrediente, que es de lo que habla un artículo. El nombre comercial entero
   no lo busca nadie. */
function semilla(nombre) {
  return nombre
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(
      /\b(org[aá]nico|natural|convencional|premium|prensado en fr[ií]o|sin olor ni sabor|color rojo|30 ml|\d+\s*(ml|gr?|oz))\b/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

const { origen, filas } = await catalogoPublicado();
console.log(`\n## Catálogo — ${origen}\n`);
for (const p of filas) {
  const agotado = Number(p.existencias ?? 0) > 0 ? "" : "  [AGOTADO]";
  console.log(
    `- ${p.marca} · ${p.nombre}${p.contenido ? ` · ${p.contenido}` : ""} → /producto/${p.slug}${agotado}`
  );
}

const propias = process.argv.slice(2);
const semillas = propias.length
  ? propias
  : [...new Set(filas.map((p) => semilla(p.nombre)))].filter(Boolean);
console.log(`\n## Qué se busca en Colombia\n`);
for (const s of semillas) {
  const [google, youtube] = await Promise.all([sugerencias(s), sugerencias(s, "yt")]);
  console.log(`### ${s}`);
  console.log(`- Google: ${google.slice(0, 8).join(" · ") || "(sin sugerencias)"}`);
  console.log(`- YouTube: ${youtube.slice(0, 5).join(" · ") || "(sin sugerencias)"}\n`);
}

const carpeta = join(raiz, "contenido", "articulos");
console.log(`## Artículos que ya existen\n`);
const existentes = existsSync(carpeta) ? readdirSync(carpeta).filter((f) => f.endsWith(".md")) : [];
if (!existentes.length) console.log("- (ninguno)");
for (const f of existentes) {
  const c =
    leerYaml(/^---\n([\s\S]*?)\n---/.exec(readFileSync(join(carpeta, f), "utf8"))?.[1] ?? "") ?? {};
  console.log(
    `- [${c.estado}] /blog/${f.replace(/\.md$/, "")} — ${c.titulo} (${(c.temas ?? []).join(", ")})`
  );
}
