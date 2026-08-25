/* El carrito.
 *
 * Muestra el costo total, envío incluido, antes de pedir un solo dato personal.
 * Es lo que el plan llama pago sin fricción y no es una preferencia estética:
 * descubrir el envío en el último paso es el motivo más citado de abandono, y
 * un agente que no encuentra el total descarta la tienda.
 */
import type { Metadata } from "next";

import { Pie } from "@/app/pie";
import { cambiar, quitar } from "@/lib/acciones-carrito";
import { detalle, ENVIO_MINOR } from "@/lib/carrito";
import { pesos } from "@/lib/producto";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carrito · Eve-Store",
  robots: { index: false, follow: true }
};

export default async function Carrito({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { items, subtotal, unidades } = await detalle();

  if (items.length === 0) {
    return (
      <>
        <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-6">
          <h1 className="font-display text-3xl font-bold">Tu carrito está vacío</h1>
          <p className="mt-3 text-sm text-pizarra">
            <a href="/" className="underline">
              Mira el catálogo
            </a>{" "}
            o{" "}
            <a href="/buscar" className="underline">
              busca algo concreto
            </a>
            .
          </p>
        </main>
        <Pie />
      </>
    );
  }

  const total = subtotal + ENVIO_MINOR;

  return (
    <>
      <main className="mx-auto max-w-4xl px-6 py-12">
        <a href="/" className="text-sm text-pizarra hover:underline">
          ← Seguir comprando
        </a>
        <h1 className="mt-4 font-display text-3xl font-bold">
          Tu carrito · {unidades} {unidades === 1 ? "unidad" : "unidades"}
        </h1>

        {error && (
          <p className="mt-5 rounded-lg bg-[#fdf3e3] px-4 py-3 text-sm text-alerta">
            No se pudo cerrar el pedido: {error}
          </p>
        )}

        <ul className="mt-8 flex flex-col divide-y divide-linea border-y border-linea">
          {items.map((i) => (
            <li key={i.slug} className="flex items-center gap-4 py-4">
              <div className="size-20 shrink-0 overflow-hidden rounded-lg border border-linea bg-white">
                {i.imagen && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={i.imagen} alt="" className="size-full object-contain p-2" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wide text-pizarra">{i.marca}</p>
                <a href={`/producto/${i.slug}`} className="font-semibold hover:underline">
                  {i.nombre}
                  {i.contenido && (
                    <span className="font-normal text-pizarra"> · {i.contenido}</span>
                  )}
                </a>
                <p className="text-sm tabular-nums text-pizarra">{pesos.format(i.precio_minor)}</p>
                {i.recortado && (
                  <p className="mt-1 text-xs text-alerta">
                    Ajustado a {i.cantidad}: es lo que queda en bodega.
                  </p>
                )}
              </div>

              {/* Un `select` en vez de botones de más y menos: menos toques, y
                  funciona igual sin JavaScript. El tope es el stock real. */}
              <form action={cambiar} className="shrink-0">
                <input type="hidden" name="slug" value={i.slug} />
                <select
                  name="cantidad"
                  defaultValue={i.cantidad}
                  className="rounded-lg border border-linea bg-white px-2 py-1.5 text-sm tabular-nums"
                >
                  {Array.from({ length: i.existencias }, (_, n) => n + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <button className="ml-2 rounded-lg border border-linea px-2.5 py-1.5 text-xs font-medium hover:bg-hielo">
                  Actualizar
                </button>
              </form>

              <p className="w-28 shrink-0 text-right font-display font-bold tabular-nums">
                {pesos.format(i.precio_minor * i.cantidad)}
              </p>

              <form action={quitar} className="shrink-0">
                <input type="hidden" name="slug" value={i.slug} />
                <button
                  aria-label={`Quitar ${i.nombre}`}
                  className="px-2 text-pizarra hover:text-noche"
                >
                  ×
                </button>
              </form>
            </li>
          ))}
        </ul>

        <div className="ml-auto mt-8 max-w-sm">
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-pizarra">Productos</dt>
              <dd className="tabular-nums">{pesos.format(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-pizarra">Envío</dt>
              <dd className="tabular-nums">{pesos.format(ENVIO_MINOR)}</dd>
            </div>
            <div className="flex justify-between border-t border-linea pt-2 font-display text-lg font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{pesos.format(total)}</dd>
            </div>
          </dl>

          <a
            href="/checkout"
            className="mt-5 block rounded-xl bg-coral px-6 py-3.5 text-center font-semibold text-white hover:opacity-90"
          >
            Ir a pagar
          </a>
          <p className="mt-2 text-center text-xs text-pizarra">
            Un solo paso más. No hace falta crear cuenta.
          </p>
        </div>
      </main>
      <Pie />
    </>
  );
}
