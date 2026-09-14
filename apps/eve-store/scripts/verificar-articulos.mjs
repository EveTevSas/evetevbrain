#!/usr/bin/env node
/* Verificador mecánico de los artículos de Eve-Orígenes.
 *
 *   pnpm --filter @evetev/eve-store blog:verificar            → todos
 *   pnpm --filter @evetev/eve-store blog:verificar <slug>     → uno
 *
 * Convierte en comprobación todo lo de la guía de redacción que se puede
 * comprobar sin leer con criterio: extensión, estructura, número y tipo de
 * fuentes, que cada cita apunte a una fuente y cada fuente se cite, que los
 * enlaces internos existan, que no haya CTA hacia suplementos, y dos listas de
 * frases —las que delatan escritura de IA y las que convierten un cosmético en
 * un medicamento—. Corre en CI: un artículo que no pasa no llega a `main`.
 *
 * LO QUE NO HACE, y conviene no olvidarlo: no sabe si lo que dice el artículo
 * es verdad. Eso lo hacen `verificar-fuentes.mjs` —que abre cada fuente y busca
 * la cita literal— y la verificación final de la skill `articulo-eve-origenes`,
 * un revisor independiente que contrasta cada afirmación. Este script es el
 * suelo, no el techo: pasarlo no demuestra que un artículo sea correcto, y no
 * pasarlo sí demuestra que no se puede publicar.
 *
 * Errores (✗) rompen. Avisos (·) no rompen, pero el verificador final tiene que
 * mirarlos uno a uno.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parse as leerYaml } from "yaml";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const CARPETA = join(raiz, "contenido", "articulos");

// ── Reglas de la guía ────────────────────────────────────────────────────────
const PALABRAS_TITULO = [4, 15];
const PALABRAS_CUERPO = [1000, 2000];
const MIN_FUENTES = 3;
/* De esas, cuántas tienen que ser de carácter científico o institucional. La
   guía pone en el mismo saco artículos científicos, periodismo y opinión de
   expertos; no pesan igual, y la jerarquía acordada lo refleja. */
const MIN_FUENTES_FUERTES = 2;
const TIPOS_FUERTES = new Set(["revision", "ensayo", "institucion"]);
const TIPOS = new Set([...TIPOS_FUERTES, "periodismo", "experto"]);
const MAX_CTA_EN_CUERPO = 3;

/* Sin CTA hacia suplementos dietarios. El Decreto 3249 de 2006 exige que su
   publicidad la apruebe antes el INVIMA, y un artículo que enlaza a la compra
   puede contar como publicidad. Hasta que eso lo revise un abogado, no hay
   enlace de compra a ninguno. Se identifica por marca porque el catálogo no
   guarda la categoría del producto, y por producto cuando la marca vende de
   todo: el Aceite de Linaza de Bio Essens tiene registro SD (suplemento
   dietario), aunque sus otros aceites son alimentos o cosméticos. */
const MARCAS_SUPLEMENTOS = new Set(["Allen Nutrition"]);
const PRODUCTOS_SUPLEMENTOS = new Set(["bio-essens-aceite-de-linaza-250-ml"]);
const esSuplemento = (slug, productos) =>
  PRODUCTOS_SUPLEMENTOS.has(slug) || MARCAS_SUPLEMENTOS.has(productos.get(slug));

/* Frases que delatan escritura de IA. Adaptadas al español de la guía de
   Wikipedia «Signs of AI writing», que es la que pide la guía de redacción. Solo
   van aquí las que casi nunca escribe una persona; las ambiguas son avisos. */
const IA_ERROR = [
  [/\ben conclusi[oó]n\b/i, "«en conclusión»"],
  [/\ben definitiva\b/i, "«en definitiva»"],
  [/\bcabe (destacar|resaltar|mencionar|se[nñ]alar)\b/i, "«cabe destacar»"],
  [
    /\bes importante (destacar|se[nñ]alar|resaltar|mencionar|tener en cuenta)\b/i,
    "«es importante destacar»"
  ],
  [/\bvale la pena (mencionar|destacar|resaltar)\b/i, "«vale la pena mencionar»"],
  [/\ben (el mundo|la era|la sociedad) (actual|de hoy|moderna|digital)\b/i, "«en el mundo actual»"],
  [/\b(sum[eé]rgete|ad[eé]ntrate|emb[aá]rcate)\b/i, "invitación grandilocuente («sumérgete»)"],
  [/\bun (viaje|recorrido) (hacia|por el mundo)\b/i, "«un viaje hacia…»"],
  [/\btapiz\b/i, "«tapiz»"],
  [/\bun (verdadero )?testimonio de\b/i, "«un testimonio de»"],
  [
    /\b(juega|desempe[nñ]a) un papel (crucial|fundamental|clave|vital|esencial)\b/i,
    "«juega un papel crucial»"
  ],
  [/\bsin lugar a dudas\b/i, "«sin lugar a dudas»"],
  [/\bno dudes en\b/i, "«no dudes en»"],
  [
    /\b(espero|esperamos) que (te|este|esta|les)\b/i,
    "cierre de asistente («esperamos que te sirva»)"
  ],
  [/\bdescubre (c[oó]mo|todo|los secretos)\b/i, "«descubre cómo»"],
  [/\b(desbloquea|potencia tu|al siguiente nivel|revoluciona(rio)?)\b/i, "lenguaje de anuncio"],
  [/\bcomo (modelo de lenguaje|inteligencia artificial|IA),/i, "descargo de IA"],
  [/(oaicite|contentreference|turn\d+search|\[cite:|【|†)/i, "resto de marcado de un chatbot"],
  [/\p{Extended_Pictographic}/u, "emoji"]
];

/* Afirmaciones que convierten un cosmético o un alimento en un medicamento. La
   Decisión 833 de la CAN prohíbe atribuir a un cosmético propiedades curativas o
   terapéuticas, y el Decreto 3249 lo mismo a un suplemento. Son error aunque la
   frase sea una negación («no cura…»): se reescribe sin el verbo, que es lo que
   se lee y lo que se cita fuera de contexto. */
const SALUD_ERROR = [
  [/\bcur(a|an|ar|ar[aá]|ar[aá]n|e|en|ativ[oa]s?)\b/i, "«cura / curativo»"],
  /* Todas las formas del verbo, no solo la tercera persona. La primera versión
     reconocía «previene» y «mejora», y calibrándola contra las fichas reales se
     le escapó «ayudando a prevenir infecciones y mejorando el sistema
     inmunológico»: la afirmación de salud más clara de toda la tienda. */
  [
    /\belimin\w*\s+(el|la|los|las)?\s*(acn[eé]|dermatitis|psoriasis|eccema|infecci|hongos?|bacterias|celulitis|estr[ií]as|arrugas|manchas)/i,
    "promete eliminar una afección"
  ],
  [
    /\bprev(ien|en)\w*\s+(el|la|los|las)?\s*(c[aá]ncer|enfermedad|infecci|envejecimiento)/i,
    "promete prevenir una enfermedad"
  ],
  [
    /\bprevenci[oó]n\s+de\s+(la |las |el |los )?(c[aá]ncer|enfermedad|infecci)/i,
    "promete prevenir una enfermedad"
  ],
  [
    /\b(fortalec|refuerz|refuerc|mejor|estimul|potenci|aument|forta)\w*\s+(el|tu|su|nuestro)?\s*sistema\s+inmun/i,
    "«fortalece el sistema inmune»"
  ],
  [
    /\b(adelgaza\w*|quema(r)? grasa|p[eé]rdida de peso|bajar de peso|perder peso)\b/i,
    "promesa de pérdida de peso"
  ],
  [/\bpropiedades\s+(medicinales|curativas|terap[eé]uticas)\b/i, "«propiedades medicinales»"],
  [/\btratamiento\s+(para|contra)\b/i, "«tratamiento para…»"]
];
const SALUD_AVISO = [
  [/\btrata(r|n|miento)?\b/i, "«trata / tratamiento»: ¿es un estudio citado o una promesa?"],
  [/\benfermedad(es)?\b/i, "«enfermedad»: ¿se habla de la investigación o del producto?"],
  [/\bterap[eé]utic/i, "«terapéutico»"],
  /* Pueden ser el resultado honesto de un estudio de laboratorio, así que no
     rompen; pero dichas de un producto son una afirmación de salud. */
  [
    /\banti(bacterian|microbian|vir|mic[oó]tic|f[uú]ngic|inflamatori|oxidant)\w*/i,
    "«antibacteriano / antiinflamatorio…»: ¿de un estudio, o prometido del producto?"
  ]
];

// ── Utilidades ───────────────────────────────────────────────────────────────
const contarPalabras = (t) => t.split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p)).length;

/* El texto que lee una persona: sin sintaxis de Markdown, sin URL de enlaces,
   sin llamadas de nota ni tarjetas de producto. Es lo que cuentan las 1000–2000
   palabras. */
function prosa(md) {
  return md
    .replace(/^::producto\[[^\]]*\].*$/gm, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[(\d+)\](?!\()/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>|]/g, " ");
}

function catalogo() {
  /* Contra el volcado del repo, siempre, porque es lo único que existe en CI.
     Un producto creado desde el panel después del volcado daría un falso «no
     existe» — la dirección segura del error: bloquea, no deja pasar. Que el
     producto esté además PUBLICADO lo comprueba la skill contra la tienda en
     marcha antes de publicar; la ficha tampoco pinta la tarjeta si no lo está. */
  const json = JSON.parse(readFileSync(join(raiz, "catalogo", "catalogo.json"), "utf8"));
  return new Map(json.productos.map((p) => [p.slug, p.marca]));
}

// ── Verificación de un artículo ─────────────────────────────────────────────
function verificar(archivo, todos, productos) {
  const errores = [];
  const avisos = [];
  const e = (m) => errores.push(m);
  const a = (m) => avisos.push(m);
  const slug = archivo.replace(/\.md$/, "");

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) e(`nombre de archivo no válido como URL: ${archivo}`);

  const crudo = readFileSync(join(CARPETA, archivo), "utf8");
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(crudo);
  if (!m) return { errores: ["falta la cabecera YAML entre dos líneas ---"], avisos };

  let c;
  try {
    c = leerYaml(m[1]);
  } catch (x) {
    return { errores: [`cabecera YAML ilegible: ${x.message.split("\n")[0]}`], avisos };
  }
  const cuerpo = m[2];
  const texto = prosa(cuerpo);

  // Campos
  for (const campo of [
    "titulo",
    "descripcion",
    "gancho",
    "respuesta_corta",
    "estado",
    "publicado_en",
    "revisado_en",
    "temas",
    "fuentes"
  ]) {
    if (c[campo] === undefined || c[campo] === null || c[campo] === "")
      e(`falta «${campo}» en la cabecera`);
  }
  if (!["borrador", "publicado"].includes(c.estado))
    e(`«estado» tiene que ser borrador o publicado`);

  // Título, descripción, gancho, respuesta corta
  const pt = contarPalabras(String(c.titulo ?? ""));
  if (pt < PALABRAS_TITULO[0] || pt > PALABRAS_TITULO[1])
    e(`el título tiene ${pt} palabras (entre ${PALABRAS_TITULO.join(" y ")})`);
  const ld = String(c.descripcion ?? "").length;
  if (ld < 50 || ld > 160) e(`la descripción tiene ${ld} caracteres (entre 50 y 160)`);
  const pg = contarPalabras(String(c.gancho ?? ""));
  if (pg > 60)
    e(`el gancho tiene ${pg} palabras: la guía pide una frase o un párrafo pequeño (≤ 60)`);
  const pr = contarPalabras(String(c.respuesta_corta ?? ""));
  if (pr < 15 || pr > 80) e(`la respuesta corta tiene ${pr} palabras (entre 15 y 80)`);

  // Fechas
  const fecha = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v));
  if (!fecha(c.publicado_en) || !fecha(c.revisado_en)) e("las fechas van como AAAA-MM-DD");
  else if (String(c.revisado_en) < String(c.publicado_en))
    e("«revisado_en» es anterior a «publicado_en»");

  // Extensión
  const pc = contarPalabras(texto);
  if (pc < PALABRAS_CUERPO[0] || pc > PALABRAS_CUERPO[1])
    e(`el cuerpo tiene ${pc} palabras (entre ${PALABRAS_CUERPO.join(" y ")})`);

  // Estructura
  if (/<\/?[a-zA-Z][^>]*>/.test(cuerpo)) e("hay HTML en el cuerpo: solo Markdown");
  if (/^#\s/m.test(cuerpo)) e("hay un título de nivel 1 en el cuerpo: el título va en la cabecera");
  const titulos = [...cuerpo.matchAll(/^(#{2,6})\s+(.+)$/gm)].map((x) => ({
    nivel: x[1].length,
    texto: x[2].trim()
  }));
  const secciones = titulos.filter((t) => t.nivel === 2);
  if (secciones.length < 3)
    e(
      `solo hay ${secciones.length} apartados de nivel 2: la guía pide introducción, desarrollo y conclusiones`
    );
  const ultimo = secciones.at(-1)?.texto ?? "";
  if (!/conclusi|en resumen|resumen|lo esencial|en pocas palabras/i.test(ultimo))
    e(`el último apartado («${ultimo}») tiene que ser las conclusiones o el resumen`);
  if (titulos.some((t) => /^referencias|^fuentes|^bibliograf/i.test(t.texto)))
    e("hay un apartado de referencias en el cuerpo: se genera solo desde la cabecera");
  for (let i = 1; i < titulos.length; i++)
    if (titulos[i].nivel > titulos[i - 1].nivel + 1)
      e(`se salta un nivel de título antes de «${titulos[i].texto}»`);
  for (const t of titulos) {
    const pal = t.texto
      .split(/\s+/)
      .slice(1)
      .filter((w) => /^\p{L}/u.test(w) && w.length > 3);
    if (pal.length >= 3 && pal.filter((w) => /^\p{Lu}/u.test(w)).length / pal.length > 0.5)
      a(`«${t.texto}» parece Title Case: en español, solo la primera mayúscula`);
  }
  if (/^---\s*$/m.test(cuerpo)) a("hay líneas horizontales (---) separando apartados");

  // Fuentes
  const fuentes = Array.isArray(c.fuentes) ? c.fuentes : [];
  if (fuentes.length < MIN_FUENTES) e(`fuentes: ${fuentes.length} (mínimo ${MIN_FUENTES})`);
  const fuertes = fuentes.filter((f) => TIPOS_FUERTES.has(f?.tipo)).length;
  if (fuertes < MIN_FUENTES_FUERTES)
    e(`fuentes científicas o institucionales: ${fuertes} (mínimo ${MIN_FUENTES_FUERTES})`);
  const ids = new Set();
  fuentes.forEach((f, i) => {
    const n = `fuente ${f?.id ?? i + 1}`;
    if (f?.id !== i + 1) e(`${n}: los id van seguidos desde 1 (se esperaba ${i + 1})`);
    ids.add(f?.id);
    if (!TIPOS.has(f?.tipo)) e(`${n}: «tipo» tiene que ser uno de ${[...TIPOS].join(", ")}`);
    for (const campo of ["titulo", "editor", "url", "cita", "respalda"])
      if (!f?.[campo]) e(`${n}: falta «${campo}»`);
    if (f?.url && !/^https:\/\/\S+$/.test(f.url)) e(`${n}: la URL tiene que ser https`);
    if (f?.url && /[?&]utm_/.test(f.url))
      e(`${n}: la URL lleva parámetros utm_ (de rastreo, no de la fuente)`);
    if (f?.cita && String(f.cita).length < 20)
      e(`${n}: la cita literal es demasiado corta para poder encontrarla`);
    if (!Number.isInteger(f?.anio) || f.anio < 1900 || f.anio > new Date().getFullYear())
      e(`${n}: año no válido`);
    if (f?.doi && !/^10\.\d{4,9}\/\S+$/.test(f.doi)) e(`${n}: DOI con formato no válido`);
  });
  const citadas = new Set([...cuerpo.matchAll(/\[(\d+)\](?!\()/g)].map((x) => Number(x[1])));
  for (const n of citadas) if (!ids.has(n)) e(`el cuerpo cita [${n}] y no hay fuente con ese id`);
  for (const f of fuentes)
    if (f?.id && !citadas.has(f.id)) e(`la fuente ${f.id} no se cita en el cuerpo`);

  // Enlaces internos
  for (const [, ruta] of cuerpo.matchAll(/\]\((\/[^)\s#]*)/g)) {
    const [, zona, id] = ruta.split("/");
    if (zona === "blog") {
      const destino = todos.get(id);
      if (!destino) e(`enlace a un artículo que no existe: ${ruta}`);
      else if (c.estado === "publicado" && destino !== "publicado")
        e(`enlace a un artículo en borrador: ${ruta}`);
    } else if (zona === "producto") {
      if (!productos.has(id)) e(`enlace a un producto que no existe: ${ruta}`);
      else if (esSuplemento(id, productos))
        e(`enlace de compra a un suplemento: ${ruta} (Decreto 3249)`);
    } else if (zona === "marca") {
      if (
        ![...productos.values()].some(
          (mc) =>
            mc
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-") === id
        )
      )
        e(`enlace a una marca que no existe: ${ruta}`);
    }
  }

  // Productos y CTA
  const prods = Array.isArray(c.productos) ? c.productos : [];
  for (const p of prods) {
    if (!productos.has(p)) e(`producto de la cabecera que no existe: ${p}`);
    else if (esSuplemento(p, productos)) e(`CTA hacia un suplemento: ${p} (Decreto 3249)`);
  }
  const ctas = [...cuerpo.matchAll(/^::producto\[([^\]]*)\]\s*$/gm)].map((x) => x[1]);
  for (const p of ctas)
    if (!prods.includes(p)) e(`::producto[${p}] no está en «productos» de la cabecera`);
  if (prods.length && !ctas.length)
    e("hay productos en la cabecera pero ningún ::producto en el cuerpo");
  if (ctas.length > MAX_CTA_EN_CUERPO)
    e(`hay ${ctas.length} tarjetas de producto en el cuerpo (máximo ${MAX_CTA_EN_CUERPO})`);
  for (const r of Array.isArray(c.relacionados) ? c.relacionados : [])
    if (!todos.has(r)) e(`artículo relacionado que no existe: ${r}`);

  // Escritura de IA
  const lineasProsa = cuerpo
    .split("\n")
    .filter((l) => !/^(#{1,6}\s|::producto)/.test(l))
    .join("\n");
  const revisable = [c.titulo, c.gancho, c.respuesta_corta, c.descripcion, lineasProsa].join("\n");
  for (const [re, nombre] of IA_ERROR) if (re.test(revisable)) e(`escritura de IA: ${nombre}`);
  const noSolo = (
    revisable.match(/\bno (solo|s[oó]lo)\b[^.]{1,80}\bsino (tambi[eé]n|que)\b/gi) ?? []
  ).length;
  if (noSolo >= 2) e(`escritura de IA: ${noSolo} «no solo… sino también»`);
  else if (noSolo === 1) a("un «no solo… sino también»: ¿hace falta?");
  const rayas = (texto.match(/—/g) ?? []).length;
  if (pc && (rayas * 1000) / pc > 8) a(`${rayas} rayas (—) en ${pc} palabras: demasiadas`);
  const negritas = (cuerpo.match(/\*\*[^*]+\*\*/g) ?? []).length;
  if (negritas > 6) a(`${negritas} negritas: se pierde el énfasis`);
  const enfasis = (texto.match(/\b(crucial|fundamental|clave|esencial|vital)\b/gi) ?? []).length;
  if (enfasis > 3) a(`${enfasis} veces «crucial / fundamental / clave / esencial / vital»`);

  // Salud
  for (const [re, nombre] of SALUD_ERROR) {
    const hit = revisable.match(new RegExp(`[^.\\n]{0,60}${re.source}[^.\\n]{0,40}`, re.flags));
    if (hit) e(`afirmación de salud: ${nombre} — «…${hit[0].trim()}…»`);
  }
  for (const [re, nombre] of SALUD_AVISO) if (re.test(texto)) a(`revisar: ${nombre}`);

  // Publicación
  if (c.estado === "publicado") {
    const v = c.verificacion;
    if (!v) e("está publicado sin bloque «verificacion»");
    else {
      if (v.estado !== "aprobado") e(`está publicado con la verificación en «${v.estado}»`);
      if (!fecha(v.fecha) || String(v.fecha) < String(c.revisado_en))
        e("la verificación es anterior a la última revisión del texto");
      if (!(v.afirmaciones >= 1)) e("la verificación no dice cuántas afirmaciones comprobó");
      // Todas las abre blog:fuentes; el revisor abre las de cifras y efectos.
      if (!(v.fuentes_abiertas >= 1 && v.fuentes_abiertas <= fuentes.length))
        e(
          `la verificación dice haber abierto ${v.fuentes_abiertas ?? 0} de ${fuentes.length} fuentes`
        );
    }
  }

  return { errores, avisos, palabras: pc, estado: c.estado };
}

// ── Principal ────────────────────────────────────────────────────────────────
if (!existsSync(CARPETA)) {
  console.log("No hay carpeta contenido/articulos: nada que verificar.");
  process.exit(0);
}
const archivos = readdirSync(CARPETA).filter((f) => f.endsWith(".md"));
const todos = new Map(
  archivos.map((f) => {
    const est = /^estado:\s*(\S+)/m.exec(readFileSync(join(CARPETA, f), "utf8"))?.[1];
    return [f.replace(/\.md$/, ""), est];
  })
);
const productos = catalogo();
const pedido = process.argv[2];
const objetivo = pedido ? archivos.filter((f) => f === `${pedido}.md`) : archivos;
if (pedido && !objetivo.length) {
  console.error(`No existe contenido/articulos/${pedido}.md`);
  process.exit(1);
}

let fallos = 0;
for (const f of objetivo) {
  const { errores, avisos, palabras, estado } = verificar(f, todos, productos);
  console.log(
    `\n${errores.length ? "✗" : "✓"} ${f}  (${estado ?? "?"}, ${palabras ?? "?"} palabras)`
  );
  for (const x of errores) console.log(`    ✗ ${x}`);
  for (const x of avisos) console.log(`    · ${x}`);
  if (errores.length) fallos++;
}
console.log(`\n${objetivo.length - fallos} de ${objetivo.length} artículo(s) sin errores.`);
process.exit(fallos ? 1 : 0);
