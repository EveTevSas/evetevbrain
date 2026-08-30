/* El pago, en un solo paso.
 *
 * Sin registro, sin pedir nada dos veces y con el total a la vista desde el
 * carrito. El plan pide contar los pasos y publicarlos: son **dos** —carrito y
 * este— y aquí se piden **seis datos**, todos necesarios para entregar el
 * pedido. Cada campo que se añada a esta pantalla se paga en pedidos que no se
 * terminan.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";

import { Cabecera } from "@/app/cabecera";
import { Pie } from "@/app/pie";
import { detalle, ENVIO_MINOR, guardar } from "@/lib/carrito";
import { db } from "@/db/connection";
import { proveedor } from "@/lib/pagos";
import { pesos } from "@/lib/producto";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pagar · Eve-Store",
  robots: { index: false, follow: false }
};

/** `EV-` y seis cifras del reloj. Legible por teléfono, y no revela cuántos pedidos hay. */
function numeroDePedido() {
  return `EV-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

async function confirmar(datos: FormData) {
  "use server";

  const { items } = await detalle();
  if (items.length === 0) redirect("/carrito");

  const campos = {
    nombre: String(datos.get("nombre") ?? "").trim(),
    correo: String(datos.get("correo") ?? "").trim(),
    telefono: String(datos.get("telefono") ?? "").trim(),
    direccion: String(datos.get("direccion") ?? "").trim(),
    ciudad: String(datos.get("ciudad") ?? "").trim(),
    notas: String(datos.get("notas") ?? "").trim()
  };
  if (!campos.nombre || !campos.correo || !campos.direccion || !campos.ciudad) {
    redirect("/checkout?error=faltan");
  }

  const numero = numeroDePedido();
  let total = 0;

  try {
    /* Todo el pedido lo crea la base en una sola llamada: comprueba
     * existencias, las descuenta, copia los precios y calcula el total. Aquí no
     * se suma nada, y no es pereza — que la aplicación calculara el total
     * abriría la puerta a que difiriera del que se cobra. */
    const filas = await db().execute<{ total_minor: number }>(sql`
      with nuevo as (
        select tienda.crear_pedido(
          ${numero}, ${campos.nombre}, ${campos.correo}, ${campos.telefono},
          ${campos.direccion}, ${campos.ciudad}, ${campos.notas}, ${ENVIO_MINOR},
          ${sql.raw(`'${JSON.stringify(items.map((i) => ({ slug: i.slug, cantidad: i.cantidad })))}'::jsonb`)}
        ) as id
      )
      select p.total_minor::int as total_minor from tienda.pedido p, nuevo where p.id = nuevo.id`);
    total = filas[0]?.total_minor ?? 0;
  } catch (e) {
    /* El motivo viene de la base y está escrito para una persona —«Solo quedan
     * 1 de …»—, así que se enseña tal cual en vez de sustituirlo por un
     * genérico. Que dos personas compren la última unidad a la vez es normal;
     * enterarse sin saber por qué, no. */
    const motivo = e instanceof Error ? e.message.replace(/^[^:]*:\s*/, "") : "";
    redirect(`/carrito?error=${encodeURIComponent(motivo.slice(0, 140))}`);
  }

  // El carrito se vacía solo después de que el pedido exista de verdad.
  await guardar([]);

  const pago = await proveedor().iniciar({
    montoMinor: total,
    moneda: "COP",
    referencia: numero,
    correo: campos.correo
  });
  if (pago.tipo === "redirigir") redirect(pago.url);

  redirect(`/pedido/${numero}`);
}

export default async function Checkout({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { items, subtotal } = await detalle();
  if (items.length === 0) redirect("/carrito");

  const total = subtotal + ENVIO_MINOR;
  const entrada = "w-full rounded-lg border border-linea bg-white px-3 py-2.5";

  return (
    <>
      <Cabecera minima />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <a href="/carrito" className="text-sm text-pizarra hover:underline">
          ← Volver al carrito
        </a>
        <h1 className="mt-4 font-display text-3xl font-bold">Últimos datos</h1>
        <p className="mt-2 text-sm text-pizarra">
          Paso 2 de 2. Sin cuenta y sin contraseñas: solo lo necesario para llevarte el pedido.
        </p>

        {error === "faltan" && (
          <p className="mt-5 rounded-lg bg-[#fdeaea] px-4 py-3 text-sm text-[#b91c1c]">
            Faltan el nombre, el correo, la dirección o la ciudad.
          </p>
        )}

        <div className="mt-8 rounded-xl border border-linea bg-white p-5">
          <h2 className="font-semibold">Tu pedido</h2>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {items.map((i) => (
              <li key={i.slug} className="flex justify-between gap-4">
                <span className="text-pizarra">
                  {i.cantidad} × {i.nombre}
                  {i.contenido && ` · ${i.contenido}`}
                </span>
                <span className="shrink-0 tabular-nums">
                  {pesos.format(i.precio_minor * i.cantidad)}
                </span>
              </li>
            ))}
            <li className="flex justify-between border-t border-linea pt-2 text-pizarra">
              <span>Envío</span>
              <span className="tabular-nums">{pesos.format(ENVIO_MINOR)}</span>
            </li>
            <li className="flex justify-between font-display text-lg font-bold">
              <span>Total</span>
              <span className="tabular-nums">{pesos.format(total)}</span>
            </li>
          </ul>
        </div>

        <form action={confirmar} className="mt-8 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Nombre y apellido</span>
              <input name="nombre" required autoComplete="name" className={entrada} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Correo</span>
              <input name="correo" type="email" required autoComplete="email" className={entrada} />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              Teléfono <span className="font-normal text-pizarra">— opcional</span>
            </span>
            <input name="telefono" type="tel" autoComplete="tel" className={entrada} />
          </label>

          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Dirección</span>
              <input
                name="direccion"
                required
                autoComplete="street-address"
                className={entrada}
                placeholder="Calle 00 # 00-00, apto 000"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Ciudad</span>
              <input
                name="ciudad"
                required
                autoComplete="address-level2"
                className={entrada}
                defaultValue="Bogotá"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              Indicaciones para la entrega{" "}
              <span className="font-normal text-pizarra">— opcional</span>
            </span>
            <input name="notas" className={entrada} placeholder="Portería, horario…" />
          </label>

          <button className="mt-2 rounded-xl bg-coral px-6 py-3.5 font-semibold text-white hover:opacity-90">
            Confirmar pedido · {pesos.format(total)}
          </button>
          <p className="text-center text-xs text-pizarra">
            El pago todavía no es en línea: registramos el pedido, apartamos las unidades y te
            escribimos para cobrarlo.
          </p>
        </form>
      </main>
      <Pie />
    </>
  );
}
