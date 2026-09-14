import "server-only";

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { Marked, type TokenizerAndRendererExtension } from "marked";
import { cache } from "react";
import { parse as leerYaml } from "yaml";

/* Los artículos de Eve-Orígenes.
 *
 * VIVEN COMO ARCHIVOS, NO EN LA BASE. Un artículo cambia poco y cada cambio
 * tiene que pasar una revisión: entra por PR, con el verificador corriendo en
 * CI (`scripts/verificar-articulos.mjs`) y la verificación final de la skill
 * `articulo-eve-origenes` anotada en su cabecera. Además no dependen de
 * Supabase, que en el plan Free se pausa: el blog no se cae porque la base
 * duerma.
 *
 * Formato: Markdown con cabecera YAML. La cabecera la escribe y la comprueba la
 * skill; el cuerpo es prosa normal con dos añadidos, que el verificador valida:
 *
 *   · `[3]` — cita a la fuente con id 3 de la cabecera.
 *   · `::producto[slug]` sola en una línea — tarjeta del producto en ese punto.
 *
 * ESTE MÓDULO NO VALIDA. Confía en que lo que llega a `main` ya pasó el
 * verificador, que es donde viven las reglas —palabras, fuentes, enlaces,
 * afirmaciones terapéuticas—. Tener las reglas en dos sitios es tenerlas
 * distintas a la primera corrección.
 */

export type TipoFuente = "revision" | "ensayo" | "institucion" | "periodismo" | "experto";

export type Fuente = {
  id: number;
  tipo: TipoFuente;
  titulo: string;
  autores?: string;
  editor: string;
  anio: number;
  url: string;
  doi?: string;
  /** Frase literal de la fuente. Es lo que el verificador busca en la página. */
  cita: string;
  /** Qué afirmación del artículo sostiene. */
  respalda: string;
};

export type Articulo = {
  slug: string;
  titulo: string;
  descripcion: string;
  gancho: string;
  respuestaCorta: string;
  estado: "borrador" | "publicado";
  publicadoEn: string;
  revisadoEn: string;
  temas: string[];
  territorio?: string;
  productos: string[];
  relacionados: string[];
  fuentes: Fuente[];
  verificacion?: { estado: "aprobado" | "rechazado"; fecha: string; afirmaciones: number };
  /** Trozos del cuerpo en orden: HTML de prosa o una tarjeta de producto. */
  bloques: ({ tipo: "prosa"; html: string } | { tipo: "producto"; slug: string })[];
  minutosLectura: number;
};

const CARPETA = join(process.cwd(), "contenido", "articulos");

/* `[n]` a una llamada de nota que salta a su referencia.
 *
 * Como extensión de Marked y no como un `replace` sobre el texto: un reemplazo
 * a ciegas también se comería un `[1]` dentro de un bloque de código o de un
 * enlace. El «no seguido de paréntesis» deja en paz los enlaces de Markdown,
 * `[texto](url)`. */
const cita: TokenizerAndRendererExtension = {
  name: "cita",
  level: "inline",
  start: (src) => src.match(/\[\d+\]/)?.index,
  tokenizer(src) {
    const m = /^\[(\d+)\](?!\()/.exec(src);
    if (m) return { type: "cita", raw: m[0], n: m[1] };
  },
  renderer: (t) =>
    `<sup class="cita"><a href="#fuente-${t.n}" aria-label="Fuente ${t.n}">[${t.n}]</a></sup>`
};

const markdown = new Marked({ gfm: true, extensions: [cita] });

/* Las lecturas de minutos se calculan a 200 palabras por minuto, que es la
 * cifra habitual para lectura en pantalla en español; no pretende exactitud,
 * solo avisar de si son tres minutos o quince. */
function minutos(texto: string) {
  const palabras = texto
    .replace(/[#>*_`[\]()-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(palabras / 200));
}

function leer(archivo: string): Articulo {
  const crudo = readFileSync(join(CARPETA, archivo), "utf8");
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(crudo);
  if (!m) throw new Error(`${archivo}: falta la cabecera YAML`);
  const c = leerYaml(m[1]) as Record<string, unknown>;
  const cuerpo = m[2];

  const bloques: Articulo["bloques"] = [];
  const trozos = cuerpo.split(/^::producto\[([a-z0-9-]+)\][ \t]*$/m);
  trozos.forEach((trozo, i) => {
    if (i % 2 === 1) bloques.push({ tipo: "producto", slug: trozo });
    else if (trozo.trim()) bloques.push({ tipo: "prosa", html: markdown.parse(trozo) as string });
  });

  const v = c.verificacion as Articulo["verificacion"] | undefined;
  return {
    slug: archivo.replace(/\.md$/, ""),
    titulo: String(c.titulo),
    descripcion: String(c.descripcion),
    gancho: String(c.gancho),
    respuestaCorta: String(c.respuesta_corta),
    estado: c.estado === "publicado" ? "publicado" : "borrador",
    publicadoEn: String(c.publicado_en),
    revisadoEn: String(c.revisado_en),
    temas: (c.temas as string[]) ?? [],
    territorio: c.territorio ? String(c.territorio) : undefined,
    productos: (c.productos as string[]) ?? [],
    relacionados: (c.relacionados as string[]) ?? [],
    fuentes: (c.fuentes as Fuente[]) ?? [],
    verificacion: v ? { ...v, fecha: String(v.fecha) } : undefined,
    bloques,
    minutosLectura: minutos(cuerpo)
  };
}

/* Los borradores se ven en `next dev` y en ningún otro sitio.
 *
 * La skill necesita mirar el artículo pintado antes de aprobarlo, y para eso
 * basta el servidor local. En un build —producción y también las vistas previas
 * de Vercel, que son builds— un borrador no existe: ni se lista, ni se genera,
 * ni responde en su URL. Lo que no pasó la verificación final no llega a una
 * URL pública por ningún camino. */
const verBorradores = process.env.NODE_ENV === "development";

export const articulos = cache((): Articulo[] => {
  if (!existsSync(CARPETA)) return [];
  return readdirSync(CARPETA)
    .filter((a) => a.endsWith(".md"))
    .map(leer)
    .filter((a) => a.estado === "publicado" || verBorradores)
    .sort((a, b) => b.publicadoEn.localeCompare(a.publicadoEn));
});

export function articulo(slug: string): Articulo | null {
  return articulos().find((a) => a.slug === slug) ?? null;
}
