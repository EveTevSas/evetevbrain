/* La búsqueda: la función más usada de una tienda y la peor atendida.
 *
 * Es un formulario GET a propósito. Así la consulta vive en la URL —se puede
 * compartir, marcar y volver atrás— y la página funciona sin JavaScript, que es
 * la condición para que un rastreador vea los resultados.
 */
import type { Metadata } from "next";

import { buscar, pesos } from "@/lib/producto";

export const dynamic = "force-dynamic";

/* Las páginas de resultados no se indexan. Es la regla clásica y sigue
   valiendo: generan infinitas URL con contenido casi idéntico y compiten con
   las fichas, que son las que queremos que se citen. */
export const metadata: Metadata = {
  title: "Buscar · Eve-Store",
  robots: { index: false, follow: true }
};

export default async function Buscar({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const resultados = q.trim() ? await buscar(q) : [];

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <a href="/" className="text-sm text-pizarra hover:underline">
        ← Todos los productos
      </a>

      <form action="/buscar" method="get" className="mt-6 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="aceite de coco, piel grasa, vegano…"
          aria-label="Buscar productos"
          className="w-full rounded-xl border border-linea bg-white px-4 py-3"
        />
        <button className="rounded-xl bg-noche px-5 py-3 font-semibold text-white">Buscar</button>
      </form>

      {q.trim() && (
        <p className="mt-6 text-sm text-pizarra">
          {resultados.length === 0
            ? `Nada para «${q}».`
            : `${resultados.length} resultado${resultados.length === 1 ? "" : "s"} para «${q}».`}
        </p>
      )}

      {resultados.length === 0 && q.trim() && (
        <p className="mt-2 text-sm text-pizarra">
          Prueba con menos palabras, o mira{" "}
          <a href="/" className="underline">
            el catálogo completo
          </a>
          .
        </p>
      )}

      <ul className="mt-6 flex flex-col divide-y divide-linea">
        {resultados.map((p) => (
          <li key={p.slug}>
            <a href={`/producto/${p.slug}`} className="flex items-center gap-4 py-4 hover:bg-white">
              <div className="size-16 shrink-0 overflow-hidden rounded-lg border border-linea bg-white">
                {p.imagen && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={p.imagen} alt="" className="size-full object-contain p-1.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wide text-pizarra">{p.marca}</p>
                <p className="font-semibold">
                  {p.nombre}
                  {p.contenido && (
                    <span className="font-normal text-pizarra"> · {p.contenido}</span>
                  )}
                </p>
              </div>
              <p className="shrink-0 font-display font-bold tabular-nums">
                {pesos.format(p.precio_minor)}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
