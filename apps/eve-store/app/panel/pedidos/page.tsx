/* Los pedidos.
 *
 * Faltaba, y era el agujero más grave de la tienda: se podía comprar y nadie se
 * enteraba. La confirmación le promete al cliente que le vamos a escribir, y
 * sin esta pantalla esa promesa dependía de que alguien consultara la base a
 * mano.
 *
 * Ordena por pendientes primero y por fecha: lo que hay que atender está
 * arriba, sin filtros que configurar.
 */
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";

import { db } from "@/db/connection";
import { pesos } from "@/lib/producto";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pedidos · Eve-Store" };

type Fila = {
  id: number;
  numero: string;
  estado: string;
  creado_en: string;
  contacto_nombre: string;
  contacto_correo: string;
  contacto_telefono: string | null;
  envio_direccion: string;
  envio_ciudad: string;
  envio_notas: string | null;
  subtotal_minor: number;
  envio_minor: number;
  total_minor: number;
  lineas: { nombre: string; cantidad: number; precio_minor: number }[];
};

async function marcar(datos: FormData) {
  "use server";
  const id = Number(datos.get("id"));
  const estado = String(datos.get("estado"));
  if (!["pagado", "cancelado", "pendiente_de_pago"].includes(estado)) return;

  /* La regla vive en la base, no aquí.
   *
   * El primer intento fue un `with` de varias CTE modificadoras desde esta
   * acción, y **no funcionaba**: el pedido pasaba a cancelado y las unidades no
   * volvían al inventario. El SQL parecía correcto y solo se vio probándolo.
   * En una función se lee en orden, se razona y —lo que importa— cualquier otra
   * ruta que cambie un estado obtiene el mismo comportamiento. */
  await db().execute(sql`select tienda.cambiar_estado_pedido(${id}, ${estado})`);

  revalidatePath("/panel/pedidos");
  revalidatePath("/panel");
}

export default async function Pedidos() {
  const pedidos = await db().execute<Fila>(sql`
    select p.id, p.numero, p.estado::text as estado, p.creado_en::text as creado_en,
           p.contacto_nombre, p.contacto_correo, p.contacto_telefono,
           p.envio_direccion, p.envio_ciudad, p.envio_notas,
           p.subtotal_minor::int as subtotal_minor, p.envio_minor::int as envio_minor,
           p.total_minor::int as total_minor,
           coalesce(jsonb_agg(jsonb_build_object(
             'nombre', l.nombre, 'cantidad', l.cantidad,
             'precio_minor', l.precio_minor::int)) filter (where l.pedido_id is not null),
             '[]'::jsonb) as lineas
      from tienda.pedido p
      left join tienda.pedido_linea l on l.pedido_id = p.id
     group by p.id
     order by (p.estado = 'pendiente_de_pago') desc, p.creado_en desc
     limit 200`);

  const pendientes = pedidos.filter((p) => p.estado === "pendiente_de_pago");

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <a href="/panel" className="text-sm text-pizarra hover:underline">
        ← Cola de trabajo
      </a>
      <h1 className="mt-4 font-display text-3xl font-bold">Pedidos</h1>
      <p className="mt-2 text-sm text-pizarra">
        {pedidos.length === 0
          ? "Todavía no ha entrado ninguno."
          : `${pendientes.length} por cobrar de ${pedidos.length} en total.`}
      </p>

      <ul className="mt-8 flex flex-col gap-4">
        {pedidos.map((p) => (
          <li
            key={p.id}
            className={`rounded-xl border bg-white p-5 ${
              p.estado === "pendiente_de_pago" ? "border-alerta/40" : "border-linea"
            }`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="font-display text-lg font-bold">{p.numero}</h2>
              <p className="text-sm tabular-nums text-pizarra">
                {new Date(p.creado_en).toLocaleString("es-CO", {
                  dateStyle: "medium",
                  timeStyle: "short"
                })}
              </p>
            </div>

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="text-sm">
                <p className="font-medium">{p.contacto_nombre}</p>
                {/* Enlaces directos: cobrar un pedido empieza por escribir o
                    llamar, y hacerlo desde aquí ahorra copiar y pegar. */}
                <a href={`mailto:${p.contacto_correo}`} className="text-accent underline">
                  {p.contacto_correo}
                </a>
                {p.contacto_telefono && (
                  <p>
                    <a href={`tel:${p.contacto_telefono}`} className="underline">
                      {p.contacto_telefono}
                    </a>
                    {" · "}
                    <a
                      href={`https://wa.me/57${p.contacto_telefono.replace(/\D/g, "").slice(-10)}`}
                      className="underline"
                    >
                      WhatsApp
                    </a>
                  </p>
                )}
              </div>
              <div className="text-sm text-pizarra">
                <p>{p.envio_direccion}</p>
                <p>{p.envio_ciudad}</p>
                {p.envio_notas && <p className="italic">{p.envio_notas}</p>}
              </div>
            </div>

            <ul className="mt-4 flex flex-col gap-1 border-t border-linea pt-3 text-sm">
              {p.lineas.map((l, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span className="text-pizarra">
                    {l.cantidad} × {l.nombre}
                  </span>
                  <span className="tabular-nums">{pesos.format(l.precio_minor * l.cantidad)}</span>
                </li>
              ))}
              <li className="flex justify-between text-pizarra">
                <span>Envío</span>
                <span className="tabular-nums">{pesos.format(p.envio_minor)}</span>
              </li>
              <li className="flex justify-between font-display font-bold">
                <span>Total</span>
                <span className="tabular-nums">{pesos.format(p.total_minor)}</span>
              </li>
            </ul>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-linea pt-3">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  p.estado === "pagado"
                    ? "bg-[#e8f6ec] text-exito"
                    : p.estado === "cancelado"
                      ? "bg-hielo text-pizarra"
                      : "bg-[#fdf3e3] text-alerta"
                }`}
              >
                {p.estado.replace(/_/g, " ")}
              </span>

              {p.estado !== "pagado" && (
                <form action={marcar}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="estado" value="pagado" />
                  <button className="rounded-md border border-linea px-2.5 py-1 text-xs font-medium hover:bg-hielo">
                    Marcar cobrado
                  </button>
                </form>
              )}
              {p.estado !== "cancelado" && (
                <form action={marcar}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="estado" value="cancelado" />
                  <button className="rounded-md border border-linea px-2.5 py-1 text-xs font-medium hover:bg-hielo">
                    Cancelar y devolver al inventario
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
