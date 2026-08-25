/* La ficha pública. Es la página que decide si un agente nos recomienda.
 *
 * Todo el contenido llega renderizado desde el servidor —precio, existencias,
 * descripción y el JSON-LD—, así que un rastreador que no ejecute JavaScript,
 * que son todos, lo ve completo en la primera respuesta.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { jsonLd, pesos, publicado, publicados } from "@/lib/producto";
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

export default async function Ficha({ params }: { params: Promise<{ slug: string }> }) {
  const p = await publicado((await params).slug);
  if (!p) notFound();

  const hay = p.existencias > 0;
  const atributos = Object.entries(p.atributos ?? {});

  return (
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
          <p className="text-xs font-semibold uppercase tracking-widest text-pizarra">{p.marca}</p>
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

          <button
            disabled={!hay}
            className="mt-6 w-full rounded-xl bg-coral px-6 py-3.5 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-linea disabled:text-pizarra"
          >
            {hay ? "Añadir al carrito" : "Sin existencias"}
          </button>
          <p className="mt-2 text-xs text-pizarra">
            El carrito llega en la siguiente fase; hoy el botón no hace nada todavía.
          </p>

          {p.descripcion && (
            <p className="mt-8 text-sm leading-relaxed text-ink">{p.descripcion}</p>
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
    </main>
  );
}
