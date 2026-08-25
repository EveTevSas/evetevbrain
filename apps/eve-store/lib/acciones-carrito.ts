"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { guardar, lineas } from "@/lib/carrito";

/* Las tres acciones del carrito, todas de servidor.
 *
 * Son formularios normales, así que el carrito funciona sin JavaScript. No es
 * purismo: es que la única forma de garantizar que algo funciona sin JS es que
 * no lo necesite. */

export async function anadir(datos: FormData) {
  const slug = String(datos.get("slug") ?? "");
  if (!slug) return;
  const actuales = await lineas();
  const ya = actuales.find((l) => l.slug === slug);
  await guardar(
    ya
      ? actuales.map((l) => (l.slug === slug ? { ...l, cantidad: l.cantidad + 1 } : l))
      : [...actuales, { slug, cantidad: 1 }]
  );
  revalidatePath("/carrito");
  redirect("/carrito");
}

export async function cambiar(datos: FormData) {
  const slug = String(datos.get("slug") ?? "");
  const cantidad = Number(datos.get("cantidad"));
  const actuales = await lineas();
  await guardar(
    cantidad > 0
      ? actuales.map((l) => (l.slug === slug ? { ...l, cantidad } : l))
      : actuales.filter((l) => l.slug !== slug)
  );
  revalidatePath("/carrito");
}

export async function quitar(datos: FormData) {
  const slug = String(datos.get("slug") ?? "");
  await guardar((await lineas()).filter((l) => l.slug !== slug));
  revalidatePath("/carrito");
}
