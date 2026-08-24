import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db/connection";

/** Lo que la tienda pública necesita de un producto. */
export type Publico = {
  slug: string;
  nombre: string;
  marca: string;
  gtin: string | null;
  precio_minor: number;
  moneda: string;
  contenido: string | null;
  imagen: string | null;
  descripcion: string | null;
  existencias: number;
  atributos: Record<string, string>;
  actualizado_en: string;
};

/* Una sola condición, en un solo sitio: la tienda muestra lo publicado.
 *
 * Se centraliza aquí para que ninguna página se la pueda saltar por descuido.
 * Si mañana hay una página de categoría, una búsqueda o un feed, todas pasan
 * por estas funciones y ninguna puede enseñar un producto bloqueado. */
export async function publicados(): Promise<Publico[]> {
  return db().execute<Publico>(sql`
    select slug, nombre, marca, gtin, precio_minor::int as precio_minor, moneda,
           contenido, imagen, descripcion, existencias, atributos, actualizado_en
      from tienda.producto
     where publicado
     order by existencias = 0, marca, nombre`);
}

export async function publicado(slug: string): Promise<Publico | null> {
  const filas = await db().execute<Publico>(sql`
    select slug, nombre, marca, gtin, precio_minor::int as precio_minor, moneda,
           contenido, imagen, descripcion, existencias, atributos, actualizado_en
      from tienda.producto
     where publicado and slug = ${slug}`);
  return filas[0] ?? null;
}

export const pesos = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0
});

/**
 * El JSON-LD de un producto.
 *
 * Es el canal de datos de la tienda, no un adorno de parseo: los agentes de
 * compra no leen la portada, comparan fichas estructuradas, y ante una consulta
 * en lenguaje natural gana el producto con la ficha más completa.
 *
 * Tres detalles que se equivocan a menudo y que aquí van a propósito:
 *
 *   · `price` es una cadena NUMÉRICA sin formato —"52000", nunca "$52.000"—.
 *   · `priceCurrency` va aparte, en ISO 4217.
 *   · `availability` es una URL de schema.org, no el texto «disponible».
 *
 * Lo que NO se inventa: si falta el GTIN, el campo no aparece. Un identificador
 * falso es peor que ninguno, porque cruza este producto con otro distinto.
 */
export function jsonLd(p: Publico, base: string) {
  const url = `${base}/producto/${p.slug}`;
  const oferta: Record<string, unknown> = {
    "@type": "Offer",
    url,
    price: String(p.precio_minor),
    priceCurrency: p.moneda,
    availability:
      p.existencias > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@type": "Organization", name: "Evetev" }
  };

  const producto: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#producto`,
    name: p.contenido ? `${p.nombre} ${p.contenido}` : p.nombre,
    description: p.descripcion,
    brand: { "@type": "Brand", name: p.marca },
    offers: oferta
  };

  if (p.gtin) producto.gtin = p.gtin;
  if (p.imagen) producto.image = [p.imagen];
  if (p.contenido) producto.size = p.contenido;

  // Los atributos del origen son justo lo que un agente compara: tipo de piel,
  // beneficios, zona de aplicación, si es vegano. Van como propiedades
  // adicionales y no inventadas.
  const extra = Object.entries(p.atributos ?? {});
  if (extra.length > 0) {
    producto.additionalProperty = extra.map(([nombre, valor]) => ({
      "@type": "PropertyValue",
      name: nombre.replace(/_/g, " "),
      value: valor
    }));
  }

  return producto;
}
