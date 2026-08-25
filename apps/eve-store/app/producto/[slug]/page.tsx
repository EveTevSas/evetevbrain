/* La ficha pública. Es la página que decide si un agente nos recomienda.
 *
 * Todo el contenido llega renderizado desde el servidor —precio, existencias,
 * descripción y el JSON-LD—, así que un rastreador que no ejecute JavaScript,
 * que son todos, lo ve completo en la primera respuesta.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Cabecera } from "@/app/cabecera";
import { Pie } from "@/app/pie";
import { Rejilla } from "@/app/rejilla";
import { anadir } from "@/lib/acciones-carrito";
import { hermanos, jsonLd, pesos, publicado, publicados, slugDeMarca } from "@/lib/producto";
import { urlBase } from "@/lib/url";

export const revalidate = 60;

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const p = await publicado((await params).slug);
  if (!p) return { title: "Producto no encontrado" };

  const nombre = p.contenido ? `${p.nombre} ${p.contenido}` : p.nombre;
  return {
    title: `${nombre} · ${p.marca}`,
    // La descripción del meta sale de la del producto, no de una plantilla:
    // duplicarla en veinticinco fichas la vuelve ruido.
    description: p.descripcion?.slice(0, 155) ?? undefined,
    alternates: { canonical: `${urlBase()}/producto/${p.slug}` }
  };
}

/** Prerenderiza las fichas publicadas: menos espera y menos carga en la base. */
export async function generateStaticParams() {
  return (await publicados()).map((p) => ({ slug: p.slug }));
}

/* La descripción llega con su estructura y hay que respetarla.
 *
 * Veintitrés de las veinticuatro descripciones traen saltos de línea desde la
 * base —títulos, listas, apartados— y la ficha las metía en un único `<p>`,
 * donde HTML colapsa todo el espacio en blanco. El resultado era un muro de
 * texto: «…sin conservantes. ¿Por qué elegir…? 100% Puro y Natural: Sin
 * mezclas…», todo seguido. La estructura estaba ahí desde el principio y la
 * estábamos tirando al pintar.
 *
 * Importa por dos motivos a la vez. Para quien lee, un muro no se lee. Y para
 * las citas de IA, el contenido escaneable —párrafos cortos, apartados
 * nombrados, cifras aisladas— es justo lo que se extrae y se cita; un bloque
 * indiferenciado obliga al modelo a resumir en vez de citar.
 *
 * Se parte por líneas en blanco, que es donde el autor separó ideas, y dentro
 * de cada párrafo se conservan los saltos sueltos con `whitespace-pre-line`.
 * No se inventa estructura que el texto no tenga: si no hay líneas en blanco,
 * queda un solo párrafo y nada se rompe. */
function parrafos(texto: string): string[] {
  return (
    texto
      /* Un punto pegado a la siguiente frase también separaba ideas.
       *
       * El volcado de Mercado Libre perdió algunos saltos y dejó cosas como
       * «…(piel y cabello).Presentación Premium:». Donde no hay espacio tras el
       * punto no hay prosa posible: era un salto.
       *
       * La condición de que antes del punto haya minúscula, cifra o paréntesis
       * es la que salva las siglas — en «S.A.S.» lo que precede al punto es una
       * mayúscula, así que no se toca, y no acabamos partiendo la razón social
       * de la empresa en tres párrafos. */
      .replace(/([a-záéíóúñ0-9)])\.([A-ZÁÉÍÓÚÑ¿¡])/g, "$1.\n\n$2")
      .split(/\n\s*\n/)
      .map((t) => t.trim())
      .filter(Boolean)
  );
}

export default async function Ficha({ params }: { params: Promise<{ slug: string }> }) {
  const p = await publicado((await params).slug);
  if (!p) notFound();

  const hay = p.existencias > 0;
  const atributos = Object.entries(p.atributos ?? {});

  /* Sin esto, dos de las veinticuatro fichas son callejones sin salida: Allen
   * Nutrition e Ilovepinch tienen un solo producto cada una, y quien entra por
   * una búsqueda no encuentra ningún sitio al que seguir. `hermanos` pone
   * delante los de la misma marca y completa con el resto del catálogo. */
  const vecinos = await hermanos(p.slug, p.marca);
  const mismaMarca = vecinos.length > 0 && vecinos.every((v) => v.marca === p.marca);

  return (
    <>
      <Cabecera />
      <main className="mx-auto max-w-5xl px-6 py-12">
        {/* El JSON-LD va en el HTML servido, no inyectado por script: es el canal
          de datos que consultan los agentes de compra. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(p, urlBase())) }}
        />

        <a href="/" className="text-sm text-pizarra hover:underline">
          ← Todos los productos
        </a>

        <div className="mt-6 grid gap-10 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-linea bg-white">
            {p.imagen && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={p.imagen} alt={p.nombre} className="size-full object-contain p-8" />
            )}
          </div>

          <div>
            {/* La marca lleva a su página. Enlazar hacia dentro no es adorno:
                es cómo se llega al resto del catálogo desde una ficha a la que
                se entró por una búsqueda, y cómo un rastreador descubre que
                hay más. */}
            <p className="text-xs font-semibold uppercase tracking-widest text-pizarra">
              <a href={`/marca/${slugDeMarca(p.marca)}`} className="hover:underline">
                {p.marca}
              </a>
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold leading-tight">
              {p.nombre}
              {p.contenido && <span className="font-normal text-pizarra"> · {p.contenido}</span>}
            </h1>

            <p className="mt-5 font-display text-3xl font-bold tabular-nums">
              {pesos.format(p.precio_minor)}
            </p>

            {/* Existencias reales, con el número. «Consultar disponibilidad» es
              lo que obliga a una persona a escribir para saber si puede
              comprar, y a un agente a descartarnos. */}
            <p className={`mt-1 text-sm ${hay ? "text-exito" : "text-alerta"}`}>
              {hay ? `${p.existencias} disponibles · envío desde Bogotá` : "Agotado"}
            </p>

            <form action={anadir}>
              <input type="hidden" name="slug" value={p.slug} />
              <button
                disabled={!hay}
                className="mt-6 w-full rounded-xl bg-coral px-6 py-3.5 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-linea disabled:text-pizarra"
              >
                {hay ? "Añadir al carrito" : "Sin existencias"}
              </button>
            </form>

            {p.descripcion && (
              <div className="mt-8 flex flex-col gap-4 text-sm leading-relaxed text-ink">
                {parrafos(p.descripcion).map((parrafo, i) => (
                  <p key={i} className="whitespace-pre-line">
                    {parrafo}
                  </p>
                ))}
              </div>
            )}

            {atributos.length > 0 && (
              <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-linea pt-6 text-sm">
                {atributos.map(([k, v]) => (
                  <div key={k} className="col-span-2 grid grid-cols-subgrid">
                    <dt className="text-pizarra">{k.replace(/_/g, " ")}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
                {p.gtin && (
                  <div className="col-span-2 grid grid-cols-subgrid">
                    <dt className="text-pizarra">código</dt>
                    <dd className="tabular-nums">{p.gtin}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </div>
        {vecinos.length > 0 && (
          <section className="mt-16 border-t border-linea pt-10">
            <h2 className="font-display text-2xl font-bold">
              {mismaMarca ? `Más de ${p.marca}` : "Otros productos"}
            </h2>
            <Rejilla productos={vecinos} nivel={3} />
          </section>
        )}
      </main>
      <Pie />
    </>
  );
}
