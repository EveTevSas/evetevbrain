import { pesos, publicado } from "@/lib/producto";

/* El CTA dentro de un artículo: el producto con su nombre, su marca y su precio.
 *
 * NOMBRA EL PRODUCTO, y es a propósito. El artículo habla del ingrediente y no
 * de la marca, pero el enlace a la compra sí dice qué es: un agente de compra
 * solo puede conectar un artículo con un producto si el nombre está, y un
 * lector tiene derecho a saber qué le ofrecemos antes de pulsar.
 *
 * Si el producto no está publicado —o la base no responde—, no se pinta nada.
 * Un CTA hacia una ficha que da 404, o hacia algo agotado sin decirlo, es peor
 * que no poner CTA. El artículo se sostiene sin él. */
export async function TarjetaProducto({ slug }: { slug: string }) {
  const p = await publicado(slug).catch(() => null);
  if (!p) return null;
  const hay = p.existencias > 0;

  return (
    <aside className="my-10 flex items-center gap-5 rounded-2xl border border-salvia bg-white p-4 sm:p-5">
      <a
        href={`/producto/${p.slug}`}
        className="block size-24 shrink-0 overflow-hidden rounded-xl bg-white sm:size-28"
      >
        {p.imagen && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={p.imagen} alt="" loading="lazy" className="size-full object-contain p-2" />
        )}
      </a>
      <div className="min-w-0 flex-1">
        {/* Caveat solo aquí: un acento de dos palabras, que es para lo que la
            deja el manual. El nombre y el botón van en la tipografía de texto. */}
        <p className="font-acento text-xl leading-none text-petroleo">En la tienda</p>
        <p className="mt-1 text-[0.7rem] uppercase tracking-wide text-oliva">{p.marca}</p>
        <p className="font-semibold leading-snug">
          {p.nombre}
          {p.contenido && <span className="font-normal text-oliva"> · {p.contenido}</span>}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-display text-lg font-bold tabular-nums">
            {pesos.format(p.precio_minor)}
          </span>
          {hay ? (
            <a
              href={`/producto/${p.slug}`}
              className="rounded-full bg-accion px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Ver en la tienda
            </a>
          ) : (
            <span className="text-sm text-alerta">Agotado por ahora</span>
          )}
        </div>
      </div>
    </aside>
  );
}
