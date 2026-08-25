import type { MetadataRoute } from "next";

import { publicados } from "@/lib/producto";
import { urlBase } from "@/lib/url";

/* Solo lo publicado, y con la fecha real de cada producto.
 *
 * `lastmod` sale de `actualizado_en`, no de la fecha de generación: una fecha
 * que se mueve sola en cada despliegue deja de ser una señal y los buscadores
 * aprenden a ignorarla. */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = urlBase();
  const productos = await publicados();

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    ...productos.map((p) => ({
      url: `${base}/producto/${p.slug}`,
      lastModified: new Date(p.actualizado_en),
      changeFrequency: "daily" as const,
      priority: 0.8
    }))
  ];
}
