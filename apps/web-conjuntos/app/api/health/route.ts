// Route Handler: el backend de dominio de la vertical vive AQUÍ, no en el núcleo (§8).
export function GET() {
  return Response.json({ status: "ok", service: "web-conjuntos" });
}
