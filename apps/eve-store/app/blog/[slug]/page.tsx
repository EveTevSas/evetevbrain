/* Un artículo de Eve-Orígenes.
 *
 * Todo sale renderizado desde el servidor —texto, notas, referencias— porque es
 * lo único que leen los rastreadores de IA. El propio plan de la tienda midió
 * que el marcado estructurado en páginas de contenido mueve las citas lo mismo
 * que nada; lo que pesa es el acceso y la forma. Por eso aquí el esfuerzo va en
 * la forma: una respuesta corta arriba, apartados con nombre, y cada afirmación
 * con su nota junto a la frase. Es lo que se extrae y se cita. No hay JSON-LD a
 * propósito.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Cabecera } from "@/app/cabecera";
import { Pie } from "@/app/pie";
import { TarjetaProducto } from "@/app/tarjeta-producto";
import { articulo, articulos, type Fuente } from "@/lib/articulos";
import { urlBase } from "@/lib/url";

export const revalidate = 60;

export async function generateStaticParams() {
  return articulos().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const a = articulo((await params).slug);
  if (!a) return { title: "Artículo no encontrado" };
  return {
    title: `${a.titulo} · Eve-Orígenes`,
    description: a.descripcion,
    alternates: { canonical: `${urlBase()}/blog/${a.slug}` },
    robots: a.estado === "borrador" ? { index: false, follow: false } : undefined
  };
}

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${iso}T00:00:00Z`));

const TIPO: Record<Fuente["tipo"], string> = {
  revision: "Revisión científica",
  ensayo: "Estudio",
  institucion: "Institución",
  periodismo: "Periodismo",
  experto: "Experto"
};

export default async function Articulo({ params }: { params: Promise<{ slug: string }> }) {
  const a = articulo((await params).slug);
  if (!a) notFound();
  const relacionados = a.relacionados.map(articulo).filter((r) => r !== null);

  return (
    <>
      <Cabecera />

      {/* La franqueza, arriba y en todas las entradas.
          Un artículo que habla de ingredientes y enlaza a nuestra tienda es, a
          efectos prácticos, publicidad; la guía de la SIC sobre publicidad pide
          que el consumidor pueda identificarla como tal. Decirlo en la primera
          línea no le quita credibilidad al artículo: se la da. Sobre arena, el
          texto va en petróleo (5,7:1); el blanco del ejemplo del manual no se
          lee. */}
      <p className="bg-arena px-6 py-3 text-center text-sm text-petroleo">
        Eve-Orígenes es de Evetev S.A.S., que vende algunos de los productos que se mencionan aquí.
        Lo que contamos sale de las fuentes citadas al final.{" "}
        <a href="/politica-editorial" className="font-semibold underline">
          Cómo escribimos
        </a>
      </p>

      <article className="mx-auto max-w-3xl px-6 py-12">
        <nav aria-label="Migas de pan" className="text-sm text-oliva">
          <a href="/blog" className="hover:underline">
            Blog
          </a>
          {a.temas[0] && <span aria-hidden="true"> / </span>}
          {a.temas[0] && <span>{a.temas[0]}</span>}
        </nav>

        {a.estado === "borrador" && (
          <p className="mt-4 rounded-lg bg-durazno px-4 py-2 text-sm text-petroleo">
            Borrador sin publicar: solo se ve en el servidor local.
          </p>
        )}

        <h1 className="mt-4 font-display text-4xl font-bold leading-[1.1] text-oliva sm:text-5xl">
          {a.titulo}
        </h1>
        <p className="mt-5 text-lg leading-relaxed">{a.gancho}</p>

        <p className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-oliva">
          <span>Publicado el {fecha(a.publicadoEn)}</span>
          {a.revisadoEn !== a.publicadoEn && <span>Revisado el {fecha(a.revisadoEn)}</span>}
          <span>{a.minutosLectura} min de lectura</span>
          {a.verificacion?.estado === "aprobado" && (
            <span>
              {a.verificacion.afirmaciones} afirmaciones contrastadas con {a.fuentes.length} fuentes
            </span>
          )}
        </p>

        {/* La respuesta corta: lo que un lector con prisa necesita, y la frase
            que un asistente de IA puede citar sin tener que resumir. Petróleo
            sobre salvia da 4,9:1. */}
        <aside className="mt-8 rounded-2xl bg-salvia px-6 py-5 text-petroleo">
          <p className="text-xs font-semibold uppercase tracking-widest">En corto</p>
          <p className="mt-2 text-lg leading-relaxed">{a.respuestaCorta}</p>
        </aside>

        <div className="mt-10">
          {a.bloques.map((b, i) =>
            b.tipo === "prosa" ? (
              <div key={i} className="prosa" dangerouslySetInnerHTML={{ __html: b.html }} />
            ) : (
              <TarjetaProducto key={i} slug={b.slug} />
            )
          )}
        </div>

        <p className="mt-10 text-sm leading-relaxed text-oliva">
          Este artículo es informativo. No sustituye la consulta con un profesional de la salud, y
          los productos cosméticos no tratan enfermedades.
        </p>

        <section aria-labelledby="referencias" className="mt-12 border-t border-salvia pt-8">
          <h2 id="referencias" className="font-display text-2xl font-bold text-oliva">
            Referencias
          </h2>
          <ol className="mt-5 flex flex-col gap-4 text-sm leading-relaxed">
            {a.fuentes.map((f) => (
              <li key={f.id} id={`fuente-${f.id}`} className="scroll-mt-40">
                <span className="font-semibold">[{f.id}]</span> {f.autores ? `${f.autores}. ` : ""}
                <cite className="not-italic">{f.titulo}</cite>. {f.editor}, {f.anio}.{" "}
                <span className="text-oliva">{TIPO[f.tipo]}.</span>{" "}
                <a href={f.url} className="break-words text-petroleo underline" rel="noopener">
                  {f.doi ? `doi:${f.doi}` : new URL(f.url).hostname}
                </a>
              </li>
            ))}
          </ol>
        </section>

        {relacionados.length > 0 && (
          <section aria-labelledby="relacionados" className="mt-12 border-t border-salvia pt-8">
            <h2 id="relacionados" className="font-display text-2xl font-bold text-oliva">
              Sigue leyendo
            </h2>
            <ul className="mt-5 flex flex-col gap-3">
              {relacionados.map((r) => (
                <li key={r.slug}>
                  <a
                    href={`/blog/${r.slug}`}
                    className="font-semibold text-petroleo hover:underline"
                  >
                    {r.titulo}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
      <Pie />
    </>
  );
}
