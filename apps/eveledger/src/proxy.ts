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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
