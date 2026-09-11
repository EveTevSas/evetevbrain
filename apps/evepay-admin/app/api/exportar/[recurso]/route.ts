import { descargarCsv, ErrorApi } from "@/lib/api/evepay";
import type { NextRequest } from "next/server";

/**
 * Puente para descargar exportes: el navegador pide aquí, esta ruta pide a
 * la API con el JWT de la sesión y devuelve el CSV tal cual. Así el token
 * nunca viaja al cliente y los permisos los sigue exigiendo la API.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recurso: string }> }
) {
  const { recurso } = await params;
  if (!/^[a-z-]+$/.test(recurso)) return new Response("Exporte inválido.", { status: 400 });
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());
  try {
    const respuesta = await descargarCsv(recurso, query);
    if (!respuesta.ok) {
      return new Response(`La API respondió ${respuesta.status}.`, { status: respuesta.status });
    }
    return new Response(respuesta.body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          respuesta.headers.get("Content-Disposition") ??
          `attachment; filename="evepay-${recurso}.csv"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch (e) {
    return new Response(e instanceof ErrorApi ? e.message : "No se pudo exportar.", {
      status: e instanceof ErrorApi ? e.status : 500
    });
  }
}
