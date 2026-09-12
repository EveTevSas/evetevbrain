import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isSafeInternalPath, tieneAcceso } from "@/lib/auth/acceso";
import { getSupabasePublicConfig } from "./config";

function conCookies(source: NextResponse, target: NextResponse): NextResponse {
  source.cookies.getAll().forEach(({ name, value, ...options }) => {
    target.cookies.set(name, value, options);
  });
  target.headers.set("Cache-Control", "private, no-store");
  return target;
}

function redirigir(request: NextRequest, pathname: string, next?: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (next && isSafeInternalPath(next)) url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

/** Sin sesión → /login (CA-1); con sesión pero fuera del dominio → /sin-acceso (CA-2). */
export async function refreshSessionAndAuthorize(request: NextRequest): Promise<NextResponse> {
  const { publishableKey, url } = getSupabasePublicConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, options, value }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (!user) {
    if (pathname === "/login") {
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
    return conCookies(
      response,
      redirigir(request, "/login", `${pathname}${request.nextUrl.search}`)
    );
  }

  if (!tieneAcceso(user)) {
    if (pathname === "/sin-acceso" || pathname === "/login") {
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
    return conCookies(response, redirigir(request, "/sin-acceso"));
  }

  if (pathname === "/login") return conCookies(response, redirigir(request, "/"));

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
