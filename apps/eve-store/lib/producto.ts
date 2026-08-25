import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db/connection";

/* Ninguna consulta de la tienda puede colgar la página.
 *
 * Sin esto, un socket muerto —el que deja Vercel al congelar una instancia—
 * hace que `postgres.js` espere para siempre y Vercel mate la petición a los
 * 300 segundos. El visitante ve una pestaña cargando sin fin y ningún error en
 * ninguna parte, que es exactamente lo que pasó.
 *
 * Con plazo, el fallo se convierte en un error normal: en las páginas con ISR,
 * Next sirve la copia anterior y nadie se entera. */
/* Quince segundos, no ocho. El plazo existe para que un socket muerto no
 * cuelgue la petición 300 segundos, no para exigir latencia — y la primera
 * conexión desde el contenedor de compilación de Vercel arranca en frío y se
 * pasó de ocho, tumbando el build entero. Un plazo demasiado corto no protege
 * mejor: solo rompe cosas que funcionaban. */
/* Quince segundos para una petición de verdad; sesenta al compilar.
 *
 * El plazo existe para que una petición de un usuario no se quede colgada
 * esperando en un socket que Vercel congeló — sin él, la espera duraba los 300
 * segundos que tarda la plataforma en matarla. Ahí quince segundos ya son una
 * eternidad.
 *
 * Al compilar no hay nadie esperando, y aplicar el mismo número fue un error de
 * encuadre que tumbó un despliegue: Next prerenderiza muchas páginas a la vez
 * contra un pool pequeño, las consultas hacen cola, y desde Vercel —con más
 * latencia hasta Supabase que desde un portátil— la cola se comía el plazo. El
 * build local pasaba y el de producción no. */
const PLAZO_MS = process.env.NEXT_PHASE === "phase-production-build" ? 60_000 : 15_000;

async function conPlazo<T>(promesa: Promise<T>, ms = PLAZO_MS): Promise<T> {
  let reloj: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      promesa,
      new Promise<never>((_, rechazar) => {
        reloj = setTimeout(() => rechazar(new Error(`La consulta superó ${ms} ms`)), ms);
      })
    ]);
  } finally {
    clearTimeout(reloj!);
  }
}

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
  return conPlazo(
    db().execute<Publico>(sql`
    select slug, nombre, marca, gtin, precio_minor::int as precio_minor, moneda,
           contenido, imagen, descripcion, existencias, atributos, actualizado_en
      from tienda.producto
     where publicado
     order by existencias = 0, marca, nombre`)
  );
}

/* Lo mínimo para pintar una tarjeta.
 *
 * Las rejillas de marca y de relacionados no necesitan la descripción, y esa
 * columna es con diferencia la más pesada de la tabla: pedirla veinticuatro
 * veces al compilar, para no enseñarla, es más de un megabyte de texto movido
 * en balde. */
export type Tarjeta = Pick<
  Publico,
  "slug" | "nombre" | "marca" | "contenido" | "imagen" | "precio_minor" | "existencias"
>;

const COLUMNAS_TARJETA = sql`slug, nombre, marca, contenido, imagen,
         precio_minor::int as precio_minor, existencias`;

/** Las marcas con algo publicado, de más surtida a menos. */
export async function marcas(): Promise<{ marca: string; cuantos: number }[]> {
  return conPlazo(
    db().execute<{ marca: string; cuantos: number }>(sql`
      select marca, count(*)::int as cuantos
        from tienda.producto
       where publicado
       group by marca
       order by count(*) desc, marca`)
  );
}

/* La marca en la URL.
 *
 * Se compara siempre en un solo sentido —de nombre a slug— y nunca al revés:
 * deshacer un slug obliga a adivinar dónde iban los espacios y los acentos, y
 * «bio-essens» tanto podría ser «Bio Essens» como «Bio-Essens». Al resolver una
 * ruta se recorren las marcas que existen y se busca la que produce ese slug,
 * que no puede equivocarse. */
export function slugDeMarca(marca: string): string {
  return marca
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function porMarca(marca: string): Promise<Tarjeta[]> {
  return conPlazo(
    db().execute<Tarjeta>(sql`
      select ${COLUMNAS_TARJETA}
        from tienda.producto
       where publicado and marca = ${marca}
       order by existencias = 0, nombre`)
  );
}

/* Los vecinos de una ficha.
 *
 * Primero los de la misma marca; si no llegan, se completa con el resto del
 * catálogo. Dos de los veinticuatro productos son marca de uno solo —Allen
 * Nutrition e Ilovepinch—, y sin ese relleno sus fichas serían callejones sin
 * salida: se entra desde una búsqueda y no hay ningún sitio al que seguir.
 *
 * El orden es fijo, sin `random()`, porque estas páginas se prerenderizan: una
 * lista que cambia en cada regeneración invalida la caché sin aportar nada. */
export async function hermanos(slug: string, marca: string, limite = 4): Promise<Tarjeta[]> {
  return conPlazo(
    db().execute<Tarjeta>(sql`
      select ${COLUMNAS_TARJETA}
        from tienda.producto
       where publicado and slug <> ${slug}
       order by (marca = ${marca}) desc, existencias = 0, nombre
       limit ${limite}`)
  );
}

export async function publicado(slug: string): Promise<Publico | null> {
  const filas = await conPlazo(
    db().execute<Publico>(sql`
      select slug, nombre, marca, gtin, precio_minor::int as precio_minor, moneda,
             contenido, imagen, descripcion, existencias, atributos, actualizado_en
        from tienda.producto
       where publicado and slug = ${slug}`)
  );
  return filas[0] ?? null;
}

/**
 * Búsqueda en español, sobre lo publicado.
 *
 * `websearch_to_tsquery` en vez de `plainto_tsquery` porque entiende lo que la
 * gente ya sabe escribir sin que nadie se lo enseñe: comillas para frase exacta,
 * `or`, y `-palabra` para excluir. Y no revienta con puntuación suelta, que es
 * lo que hace `to_tsquery` a la primera comilla mal cerrada.
 */
export async function buscar(consulta: string): Promise<Publico[]> {
  const limpia = consulta.trim();
  if (!limpia) return [];
  return conPlazo(
    db().execute<Publico>(sql`
    select p.slug, p.nombre, p.marca, p.gtin, p.precio_minor::int as precio_minor, p.moneda,
           p.contenido, p.imagen, p.descripcion, p.existencias, p.atributos, p.actualizado_en
      from tienda.producto p, websearch_to_tsquery('tienda.espanol', ${limpia}) q
     where p.publicado and p.busqueda @@ q
     order by ts_rank(p.busqueda, q) desc, p.existencias = 0, p.nombre
     limit 60`)
  );
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
