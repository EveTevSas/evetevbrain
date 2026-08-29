import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verificarValorSesion } from "@/lib/auth";

// Protege todo excepto /login y los recursos estáticos/internos.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/login") {
    return NextResponse.next();
  }
  const valor = request.cookies.get(SESSION_COOKIE)?.value;
  if (!(await verificarValorSesion(valor))) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // `marca` va en la lista junto a los estáticos de Next, y no es cosmético: la
  // pantalla de login enseña el isotipo desde /marca, y a esa pantalla se llega
  // SIN sesión. Sin esta exclusión el proxy redirige también la imagen a
  // /login, así que el login se queda sin logo — y no falla ruidosamente: la
  // petición devuelve un 307 perfectamente válido y el navegador se calla.
  // Antes no pasaba porque el isotipo venía de un CDN externo; empezó a pasar
  // el día que la marca se sirvió desde la propia app.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|marca/).*)"]
};
