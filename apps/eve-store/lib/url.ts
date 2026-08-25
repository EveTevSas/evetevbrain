/** La URL pública de la tienda, para sitemap, robots, canonical y JSON-LD. */
export function urlBase() {
  const v =
    process.env.NEXT_PUBLIC_URL_TIENDA ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    "http://localhost:3003";
  return v.startsWith("http") ? v.replace(/\/$/, "") : `https://${v}`;
}
