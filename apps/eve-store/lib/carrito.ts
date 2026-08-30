import "server-only";

import { cookies } from "next/headers";
import { inArray } from "drizzle-orm";

import { db } from "@/db/connection";
import { producto } from "@/db/schema";

/* El carrito vive en una cookie, y lleva SOLO qué y cuántos.
 *
 * Nunca precios. Una cookie la edita cualquiera con las herramientas del
 * navegador, así que todo lo que viaje en ella es una intención, no un dato: el
 * precio se relee de la base al pintar el carrito y otra vez al crear el
 * pedido. Un carrito que transporta importes es un carrito que se puede
 * regatear desde la consola.
 *
 * En cookie y no en la base porque un carrito anónimo no merece una fila: se
 * abandonan casi todos, caducan solos y no hay nada que limpiar. Y al ser
 * legible desde el servidor, el checkout no depende de que el navegador ejecute
 * nada.
 */
const NOMBRE = "carrito";
/* La cookie acompañante: lleva SÓLO cuántas unidades hay.
 *
 * Existe para que la cabecera pueda enseñar el número sin leer cookies desde el
 * servidor — leerlas volvería dinámicas la portada y las fichas, que se sirven
 * con ISR, y perderíamos la caché a cambio de una cifra. Ésta sí es legible
 * desde el navegador, y no pasa nada: quien la manipule sólo consigue ver un
 * número equivocado. El carrito de verdad sigue siendo `carrito`, httpOnly, y
 * los precios se releen de la base en cada pantalla. */
const CUENTA = "carrito_n";
const DIAS = 30;

export type Linea = { slug: string; cantidad: number };

function leerCookie(valor: string | undefined): Linea[] {
  if (!valor) return [];
  try {
    const bruto: unknown = JSON.parse(decodeURIComponent(valor));
    if (!Array.isArray(bruto)) return [];
    return bruto
      .map((x) => ({
        slug: String((x as Linea)?.slug ?? ""),
        // Tope por línea: una cookie manipulada no debe poder pedir mil
        // unidades. El límite real lo pone el stock, esto solo evita absurdos.
        cantidad: Math.min(Math.max(Math.trunc(Number((x as Linea)?.cantidad ?? 0)), 0), 99)
      }))
      .filter((x) => x.slug && x.cantidad > 0);
  } catch {
    // Cookie corrupta o manipulada: se ignora en vez de reventar la página.
    return [];
  }
}

export async function lineas(): Promise<Linea[]> {
  return leerCookie((await cookies()).get(NOMBRE)?.value);
}

export async function guardar(nuevas: Linea[]) {
  const tarro = await cookies();
  if (nuevas.length === 0) {
    tarro.delete(NOMBRE);
    tarro.delete(CUENTA);
    return;
  }
  const comunes = { maxAge: 60 * 60 * 24 * DIAS, sameSite: "lax" as const, path: "/" };
  tarro.set(NOMBRE, encodeURIComponent(JSON.stringify(nuevas)), {
    ...comunes,
    // No lleva nada sensible, pero tampoco hay motivo para que el JavaScript
    // de la página lo lea: el carrito se maneja entero desde el servidor.
    httpOnly: true
  });
  // Ésta sí la lee el navegador: es el número de la cabecera y nada más.
  tarro.set(CUENTA, String(nuevas.reduce((t, l) => t + l.cantidad, 0)), {
    ...comunes,
    httpOnly: false
  });
}

/** El carrito con los datos frescos de la base. Descarta lo que ya no se vende. */
export async function detalle() {
  const guardadas = await lineas();
  if (guardadas.length === 0) return { items: [], subtotal: 0, unidades: 0 };

  const filas = await db()
    .select()
    .from(producto)
    .where(
      inArray(
        producto.slug,
        guardadas.map((l) => l.slug)
      )
    );

  const items = guardadas
    .map((l) => {
      const p = filas.find((f) => f.slug === l.slug);
      // Si dejó de publicarse o se agotó mientras el carrito dormía, no se
      // muestra: es preferible que desaparezca a que alguien llegue al pago con
      // algo que no puede comprar.
      if (!p || !p.publicado) return null;
      const cantidad = Math.min(l.cantidad, p.existencias);
      if (cantidad < 1) return null;
      return {
        slug: p.slug,
        nombre: p.nombre,
        contenido: p.contenido,
        marca: p.marca,
        imagen: p.imagen,
        precio_minor: Number(p.precioMinor),
        existencias: p.existencias,
        cantidad,
        // Se avisa cuando la cantidad se recortó por falta de stock, en vez de
        // cambiarla en silencio.
        recortado: cantidad < l.cantidad
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return {
    items,
    subtotal: items.reduce((t, i) => t + i.precio_minor * i.cantidad, 0),
    unidades: items.reduce((t, i) => t + i.cantidad, 0)
  };
}

/* Envío plano mientras no haya tarifas reales.
 *
 * Es una cifra provisional y conviene que se note: el plan exige que el costo
 * total, envío incluido, se vea antes del último paso, y para eso hace falta un
 * número aunque todavía no sea el definitivo. Cuando haya transportadora, esto
 * pasa a consultarse por ciudad. */
export const ENVIO_MINOR = 12_000;
