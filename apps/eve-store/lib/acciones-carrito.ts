"use server";

import { revalidatePath } from "next/cache";

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
  /* Ya no lleva al carrito.
   *
   * Llevaba, y con un solo botón en la ficha tenía sentido. Deja de tenerlo en
   * cuanto se puede añadir desde la rejilla: sacar a alguien del catálogo cada
   * vez que echa algo al carrito le corta justo lo que estaba haciendo, que es
   * mirar productos. Ahora se queda donde estaba y la confirmación la da la
   * interfaz — el contador de la cabecera y un aviso efímero.
   *
   * Sin JavaScript esto sigue siendo un envío de formulario normal: la página
   * se recarga, la cookie ya está puesta y el contador aparece actualizado. Se
   * pierde la animación, no la compra. */
  revalidatePath("/carrito");
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
