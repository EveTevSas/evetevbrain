import type { MetadataRoute } from "next";

import { publicados } from "@/lib/producto";
import { urlBase } from "@/lib/url";

/* El panel nunca se rastrea. La tienda, solo cuando tiene algo que enseñar.
 *
 * Con el catálogo vacío se cierra entero: una tienda sin productos posicionando
 * hace más daño que no aparecer. Igual que el `noindex` de la portada, lo decide
 * el dato y no la memoria de nadie. */
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const hay = (await publicados()).length > 0;
  const base = urlBase();

  return {
    rules: hay
      ? [{ userAgent: "*", allow: "/", disallow: ["/panel", "/entrar", "/sin-acceso", "/buscar"] }]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: hay ? `${base}/sitemap.xml` : undefined
  };
}
