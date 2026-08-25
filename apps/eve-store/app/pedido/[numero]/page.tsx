/* La confirmación.
 *
 * Se llega por el número de pedido, sin sesión: quien lo tiene es quien acaba
 * de comprar. Por eso no muestra nada que no supiera ya —ni dirección completa
 * ni teléfono—: un número adivinado no debe revelar los datos de nadie.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";

import { Pie } from "@/app/pie";
import { db } from "@/db/connection";
import { pesos } from "@/lib/producto";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pedido confirmado · Eve-Store",
  robots: { index: false, follow: false }
};

type Fila = {
  numero: string;
  estado: string;
  total_minor: number;
  subtotal_minor: number;
  envio_minor: number;
  ciudad: string;
  lineas: { nombre: string; cantidad: number; precio_minor: number }[];
};

export default async function Pedido({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;

  const filas = await db().execute<Fila>(sql`
    select p.numero, p.estado::text as estado, p.total_minor::int as total_minor,
           p.subtotal_minor::int as subtotal_minor, p.envio_minor::int as envio_minor,
           p.envio_ciudad as ciudad,
           coalesce(jsonb_agg(jsonb_build_object(
             'nombre', l.nombre, 'cantidad', l.cantidad,
             'precio_minor', l.precio_minor::int)), '[]'::jsonb) as lineas
      from tienda.pedido p
      left join tienda.pedido_linea l on l.pedido_id = p.id
     where p.numero = ${numero}
     group by p.id`);

  const pedido = filas[0];
  if (!pedido) notFound();

  return (
    <>
      <main className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-exito">
          Pedido confirmado
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold">{pedido.numero}</h1>
        <p className="mt-3 text-sm leading-relaxed text-pizarra">
          Apartamos las unidades a tu nombre. Te escribimos hoy mismo para cobrarlo y coordinar la
          entrega en {pedido.ciudad}. Guarda este número: es con el que te vamos a identificar.
        </p>

        <div className="mt-8 rounded-xl border border-linea bg-white p-5">
          <ul className="flex flex-col gap-1.5 text-sm">
            {pedido.lineas.map((l, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span className="text-pizarra">
                  {l.cantidad} × {l.nombre}
                </span>
                <span className="shrink-0 tabular-nums">
                  {pesos.format(l.precio_minor * l.cantidad)}
                </span>
              </li>
            ))}
            <li className="flex justify-between border-t border-linea pt-2 text-pizarra">
              <span>Envío</span>
              <span className="tabular-nums">{pesos.format(pedido.envio_minor)}</span>
            </li>
            <li className="flex justify-between font-display text-lg font-bold">
              <span>Total</span>
              <span className="tabular-nums">{pesos.format(pedido.total_minor)}</span>
            </li>
          </ul>
        </div>

        <a href="/" className="mt-8 inline-block text-sm text-pizarra hover:underline">
          ← Seguir comprando
        </a>
      </main>
      <Pie />
    </>
  );
}
