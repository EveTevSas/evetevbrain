import type { MetadataRoute } from "next";

import { tiendaAbierta } from "@/lib/apertura";
import { articulos } from "@/lib/articulos";
import { marcas, publicados, slugDeMarca } from "@/lib/producto";
import { urlBase } from "@/lib/url";

/* Solo lo publicado, y con la fecha real de cada producto.
 *
 * `lastmod` sale de `actualizado_en`, no de la fecha de generación: una fecha
 * que se mueve sola en cada despliegue deja de ser una señal y los buscadores
 * aprenden a ignorarla. */
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  /* Con la tienda cerrada no se anuncia ni una URL. Un sitemap es una
     invitación explícita a rastrear, y es justo lo que no queremos mientras el
     catálogo está en revisión: sin él, estas páginas sólo se alcanzan
     escribiendo la dirección a mano. */
  if (!tiendaAbierta) return [];

  const base = urlBase();
  const [productos, listaDeMarcas] = await Promise.all([publicados(), marcas()]);

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    /* Las páginas de marca entran aquí porque son páginas de verdad, no un
       filtro: si no se anuncian, sólo se descubren siguiendo enlaces y tardan
       en aparecer. */
    ...listaDeMarcas.map(({ marca }) => ({
      url: `${base}/marca/${slugDeMarca(marca)}`,
      changeFrequency: "weekly" as const,
      priority: 0.6
    })),
    { url: `${base}/blog`, changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${base}/politica-editorial`, changeFrequency: "yearly" as const, priority: 0.3 },
    /* `lastModified` es la fecha de revisión del artículo, no la del
       despliegue, por lo mismo que en las fichas: una fecha que se mueve sola
       deja de significar algo. */
    ...articulos().map((a) => ({
      url: `${base}/blog/${a.slug}`,
      lastModified: new Date(`${a.revisadoEn}T00:00:00Z`),
      changeFrequency: "monthly" as const,
      priority: 0.7
    })),
    ...productos.map((p) => ({
      url: `${base}/producto/${p.slug}`,
      lastModified: new Date(p.actualizado_en),
      changeFrequency: "daily" as const,
      priority: 0.8
    }))
  ];
}
