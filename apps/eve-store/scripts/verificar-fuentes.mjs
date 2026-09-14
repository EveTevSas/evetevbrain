#!/usr/bin/env node
/* Abre cada fuente de un artículo y busca en ella la cita literal.
 *
 *   pnpm --filter @evetev/eve-store blog:fuentes <slug>
 *
 * Es el freno contra la fuente inventada, que es el error más grave que puede
 * cometer un artículo escrito por IA y el más fácil de no ver: un título
 * plausible, una revista real, un año creíble y un DOI con buena pinta que no
 * lleva a ningún sitio —o lleva a otro estudio—. Leyendo no se nota. Abriendo
 * la página y buscando la frase, sí.
 *
 * Cada fuente sale en uno de estos estados:
 *
 *   ✓ encontrada       la página responde y contiene la cita literal
 *   ✗ no encontrada    la página responde y la cita NO está (o solo en parte)
 *   ✗ rota             404, 410, 5xx o la URL no resuelve
 *   ? no comprobable   403, 429, PDF o muro de pago: el script no puede leerla
 *
 * Los ✗ rompen. Los ? no rompen, pero la skill no publica mientras quede uno
 * sin que el verificador independiente lo haya abierto por su cuenta y
 * confirmado la cita. Un ? no es un aprobado: es un «esto lo tiene que mirar
 * alguien».
 *
 * No corre en CI a propósito. Depende de webs de terceros que cambian, bloquean
 * robots o se caen un rato, y un CI que se pone en rojo por culpa de PubMed
 * enseña a ignorar el rojo. Corre en la skill, antes de publicar, y conviene
 * repetirlo de vez en cuando sobre lo publicado: los enlaces se pudren.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parse as leerYaml } from "yaml";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2];
if (!slug) {
  console.error("Uso: blog:fuentes <slug>");
  process.exit(1);
}

const crudo = readFileSync(join(raiz, "contenido", "articulos", `${slug}.md`), "utf8");
const cabecera = leerYaml(/^---\n([\s\S]*?)\n---/.exec(crudo)?.[1] ?? "");
const fuentes = cabecera?.fuentes ?? [];

/* Texto comparable: sin etiquetas, sin entidades, sin tildes, con las comillas
   y guiones tipográficos reducidos a los simples y los espacios colapsados. Una
   cita no deja de ser literal porque la página use « » y el artículo " ". */
function normalizar(t) {
  return (
    t
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&#160;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
      /* Las entidades con nombre se traducen, no se borran. La primera versión
       las cambiaba por un espacio y la página de la OMS —que escribe
       «radiaci&oacute;n»— quedaba como «radiaci n»: una cita literal salía como
       «no literal». Las letras con tilde se reducen a la letra base, porque
       unas líneas más abajo se quitan las tildes de todos modos. */
      .replace(/&([a-zA-Z])(acute|grave|circ|tilde|uml|cedil|ring|slash);/g, "$1")
      .replace(/&(laquo|raquo|ldquo|rdquo|bdquo|quot);/g, '"')
      .replace(/&(lsquo|rsquo|apos);/g, "'")
      .replace(/&(ndash|mdash|minus);/g, "-")
      .replace(/&iquest;/g, "¿")
      .replace(/&iexcl;/g, "¡")
      .replace(/&hellip;/g, "...")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&[a-zA-Z]+;/g, " ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[“”«»„"]/g, '"')
      .replace(/[‘’´`]/g, "'")
      .replace(/[\u2010-\u2015\u2212]/g, "-")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .trim()
  );
}

/* Cuánto de la cita aparece, por trozos de seis palabras. Sirve para distinguir
   «la frase no está» de «la frase está con una coma distinta»: lo segundo sigue
   siendo un fallo —la cita tiene que ser literal—, pero el mensaje dice qué
   arreglar. */
function cobertura(cita, pagina) {
  const p = cita.split(" ");
  if (p.length < 6) return pagina.includes(cita) ? 1 : 0;
  let hay = 0;
  const trozos = p.length - 5;
  for (let i = 0; i < trozos; i++) if (pagina.includes(p.slice(i, i + 6).join(" "))) hay++;
  return hay / trozos;
}

/* Las fuentes científicas se leen por su API oficial, no por su web.
 *
 * PubMed dejó de servir sus páginas a programas: responde 203 con una
 * comprobación de cookies y el texto vacío. Pedirla «como navegador» no lo
 * arregla, y no hay que arreglarlo así. NCBI publica E-utilities precisamente
 * para esto, y Europe PMC da el texto completo de los artículos abiertos. Por
 * esas vías el script lee el resumen o el texto completo, y además los datos
 * bibliográficos — que es lo que permite comprobar el TÍTULO, el AÑO y el DOI.
 *
 * Eso no es un extra. Una fuente inventada por una IA rara vez tiene la URL
 * mal: tiene un título plausible pegado a un PMID real. Se comprobó escribiendo
 * este mismo script: el artículo de prueba citaba el PMID 15724344 con un
 * título redactado de memoria, «Novel approaches to the treatment of mild to
 * moderate xerosis», y el estudio real se titula «A randomized double-blind
 * controlled trial comparing extra virgin coconut oil with mineral oil as a
 * moisturizer for mild to moderate xerosis». Revista y año correctos; título
 * falso. */
const NAVEGADOR = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
  "accept-language": "es,en;q=0.8"
};
const pedir = (url, opciones = {}) =>
  fetch(url, { redirect: "follow", signal: AbortSignal.timeout(25_000), ...opciones });

/* NCBI admite tres peticiones por segundo sin clave, y al pasarse NO devuelve
   un error HTTP: responde 200 con `{"error":"API rate limit exceeded"}` en el
   cuerpo. La primera versión lanzaba las peticiones seguidas y tomaba ese
   mensaje por el resumen del artículo, así que informaba «la cita no está en
   la fuente» o «el PMID no existe» de estudios que existían y la contenían. Se
   espacian las llamadas y se reintenta si el cuerpo trae ese error. */
let ultimaNcbi = 0;
async function ncbi(url) {
  for (let intento = 1; intento <= 4; intento++) {
    const espera = ultimaNcbi + 400 - Date.now();
    if (espera > 0) await new Promise((r) => setTimeout(r, espera));
    ultimaNcbi = Date.now();
    const texto = await (await pedir(url)).text();
    if (!texto.includes("API rate limit exceeded")) return texto;
    await new Promise((r) => setTimeout(r, 1000 * intento));
  }
  throw new Error("NCBI sigue limitando las peticiones; vuelve a intentarlo en un minuto");
}

async function desdePubmed(pmid) {
  const base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
  const resumen = JSON.parse(await ncbi(`${base}/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`))
    .result?.[pmid];
  if (!resumen || resumen.error) return null;
  const texto = await ncbi(
    `${base}/efetch.fcgi?db=pubmed&id=${pmid}&rettype=abstract&retmode=text`
  );
  return {
    via: "PubMed (E-utilities)",
    titulo: resumen.title,
    anio: parseInt(resumen.pubdate, 10),
    doi: resumen.articleids?.find((a) => a.idtype === "doi")?.value,
    texto
  };
}

async function desdePmc(pmcid) {
  const xml = await (
    await pedir(`https://www.ebi.ac.uk/europepmc/webservices/rest/${pmcid}/fullTextXML`)
  ).text();
  if (!xml.includes("<article")) return null;
  const titulo = /<article-title[^>]*>([\s\S]*?)<\/article-title>/.exec(xml)?.[1];
  const anio = /<pub-date[^>]*>[\s\S]*?<year>(\d{4})<\/year>/.exec(xml)?.[1];
  const doi = /<article-id pub-id-type="doi">([^<]+)<\/article-id>/.exec(xml)?.[1];
  return {
    via: "Europe PMC (texto completo)",
    titulo,
    anio: anio && Number(anio),
    doi,
    texto: xml
  };
}

async function desdeCrossref(doi) {
  const r = await pedir(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
  if (!r.ok) return null;
  const m = (await r.json()).message;
  return {
    via: "Crossref",
    titulo: m.title?.[0],
    anio: m.issued?.["date-parts"]?.[0]?.[0],
    doi: m.DOI
  };
}

/* Mismo título con otra puntuación o mayúsculas es el mismo título; con otras
   palabras, no. Se exige que casi todas las palabras coincidan. */
function mismoTitulo(a, b) {
  const pal = (t) =>
    new Set(
      normalizar(t)
        .replace(/[^\p{L}\p{N} ]/gu, " ")
        .split(" ")
        .filter((w) => w.length > 2)
    );
  const x = pal(a);
  const y = pal(b);
  if (!x.size || !y.size) return false;
  const comunes = [...x].filter((w) => y.has(w)).length;
  return comunes / Math.max(x.size, y.size) >= 0.85;
}

async function comprobar(f) {
  const problemas = [];
  const cita = normalizar(String(f.cita));
  try {
    const pmid = /pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/.exec(f.url)?.[1];
    const pmcid = /\/(PMC\d+)/i.exec(f.url)?.[1]?.toUpperCase();
    const ficha = pmid ? await desdePubmed(pmid) : pmcid ? await desdePmc(pmcid) : null;
    const meta = ficha ?? (f.doi ? await desdeCrossref(f.doi) : null);

    if ((pmid || pmcid) && !ficha)
      return {
        estado: "✗",
        detalle: `rota: ${pmid ? `PMID ${pmid}` : pmcid} no existe o no se puede leer`
      };

    if (meta) {
      if (meta.titulo && !mismoTitulo(f.titulo, meta.titulo))
        problemas.push(
          `el título no es el de la fuente. Real: «${meta.titulo.replace(/<[^>]+>/g, "").trim()}»`
        );
      if (meta.anio && Number(f.anio) !== Number(meta.anio))
        problemas.push(`el año no coincide: la fuente es de ${meta.anio}`);
      if (f.doi && meta.doi && f.doi.toLowerCase() !== meta.doi.toLowerCase())
        problemas.push(`el DOI no coincide: la fuente tiene ${meta.doi}`);
    }

    let texto = ficha?.texto;
    let via = ficha?.via;
    if (!texto) {
      const r = await pedir(f.url, { headers: NAVEGADOR });
      const tipo = r.headers.get("content-type") ?? "";
      if (r.status >= 400 && ![401, 402, 403, 429].includes(r.status))
        return { estado: "✗", detalle: `rota: HTTP ${r.status}` };
      if ([401, 402, 403, 429].includes(r.status) || tipo.includes("pdf")) {
        if (problemas.length) return { estado: "✗", detalle: problemas.join(" · ") };
        return {
          estado: "?",
          detalle: tipo.includes("pdf") ? "PDF: el script no lo lee" : `HTTP ${r.status}`,
          via: meta?.via
        };
      }
      texto = await r.text();
      via = "página web";
      if (normalizar(texto).length < 3000 && !problemas.length)
        return {
          estado: "?",
          detalle: `página casi vacía (HTTP ${r.status}): muro, JavaScript o comprobación de robots`
        };
    }

    const pagina = normalizar(texto);
    if (!pagina.includes(cita)) {
      const c = cobertura(cita, pagina);
      problemas.push(
        c >= 0.5
          ? `cita no literal: aparece el ${Math.round(c * 100)} % — cópiala exacta`
          : `la cita no está en la fuente (${Math.round(c * 100)} %)`
      );
    }
    if (problemas.length)
      return { estado: "✗", detalle: `${problemas.join(" · ")}  [leída por ${via}]` };
    /* El mensaje dice exactamente lo que se comprobó. En una página web sin
       ficha bibliográfica solo se busca la cita; decir «título comprobado» ahí
       sería un ✓ que afirma más de lo que midió. */
    const extra = meta?.titulo
      ? `, título${meta.anio ? " y año" : ""} comprobados`
      : " (en una página web el título no se puede comprobar)";
    return { estado: "✓", detalle: `cita literal${extra}  [${via}]` };
  } catch (x) {
    return {
      estado: "✗",
      detalle: `rota: ${x.name === "TimeoutError" ? "no respondió en 25 s" : x.message}`
    };
  }
}

/* Por fuente, no por problema: una fuente con la página bien y el DOI roto
   cuenta una vez, como fuente con error. */
const conError = new Set();
const sinComprobar = new Set();
console.log(`\nFuentes de ${slug}\n`);
for (const f of fuentes) {
  const { estado, detalle } = await comprobar(f);
  if (estado === "✗") conError.add(f.id);
  if (estado === "?") sinComprobar.add(f.id);
  console.log(`  ${estado} [${f.id}] ${detalle}\n        ${f.url}`);
}
const bien = fuentes.length - conError.size - sinComprobar.size;
console.log(
  `\n${bien} encontradas · ${conError.size} con error · ${sinComprobar.size} sin poder comprobar` +
    (sinComprobar.size
      ? `\nSin comprobar: [${[...sinComprobar].join("], [")}]. Las tiene que abrir y confirmar el verificador independiente antes de publicar.`
      : "")
);
process.exit(conError.size ? 1 : 0);
