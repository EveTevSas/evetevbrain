import type { MetadataRoute } from "next";

import { marcas, publicados, slugDeMarca } from "@/lib/producto";
import { urlBase } from "@/lib/url";

/* Solo lo publicado, y con la fecha real de cada producto.
 *
 * `lastmod` sale de `actualizado_en`, no de la fecha de generación: una fecha
 * que se mueve sola en cada despliegue deja de ser una señal y los buscadores
 * aprenden a ignorarla. */
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
    ...productos.map((p) => ({
      url: `${base}/producto/${p.slug}`,
      lastModified: new Date(p.actualizado_en),
      changeFrequency: "daily" as const,
      priority: 0.8
    }))
  ];
}
