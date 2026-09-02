import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { esSuperAdmin, isSafeInternalPath } from "@/lib/auth/permissions";
import { getSupabasePublicConfig } from "./config";

function responseWithAuthCookies(source: NextResponse, target: NextResponse): NextResponse {
  source.cookies.getAll().forEach(({ name, value, ...options }) => {
    target.cookies.set(name, value, options);
  });
  target.headers.set("Cache-Control", "private, no-store");
  return target;
}

function redirectTo(request: NextRequest, pathname: string, next?: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (next && isSafeInternalPath(next)) {
    url.searchParams.set("next", next);
  }
  return NextResponse.redirect(url);
}

/**
 * Refresca la sesión y autoriza cada request (CA-1, CA-2 de admin-console):
 * sin sesión → /login; con sesión pero sin rol super_admin → /sin-acceso.
 * El rol se lee de app_metadata (solo escribible con la clave secreta).
 */
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
    const next = `${pathname}${request.nextUrl.search}`;
    return responseWithAuthCookies(response, redirectTo(request, "/login", next));
  }

  // CA-2: autenticado pero sin el rol → fuera de toda la consola.
  if (!esSuperAdmin(user)) {
    if (pathname === "/sin-acceso" || pathname === "/login") {
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
    return responseWithAuthCookies(response, redirectTo(request, "/sin-acceso"));
  }

  if (pathname === "/login") {
    return responseWithAuthCookies(response, redirectTo(request, "/"));
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
