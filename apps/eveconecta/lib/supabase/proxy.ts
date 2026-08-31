import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { canAccessPath, isSafeInternalPath } from "@/lib/auth/permissions";
import { fetchActiveMemberships, selectActiveMembership } from "@/lib/auth/resolve-membership";
import { ACTIVE_CONJUNTO_COOKIE } from "@/lib/auth/tenant-cookie";
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
  const isAuthRoute = pathname.startsWith("/auth/");

  if (!user) {
    if (pathname === "/login" || isAuthRoute) {
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    const next = `${pathname}${request.nextUrl.search}`;
    return responseWithAuthCookies(response, redirectTo(request, "/login", next));
  }

  if (pathname === "/login") {
    return responseWithAuthCookies(response, redirectTo(request, "/"));
  }

  if (
    isAuthRoute ||
    pathname.startsWith("/api/") ||
    pathname === "/actualizar-contrasena" ||
    pathname === "/sin-acceso" ||
    pathname === "/sin-permiso"
  ) {
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  const memberships = await fetchActiveMemberships(supabase, user.id);
  if (!memberships?.length) {
    return responseWithAuthCookies(response, redirectTo(request, "/sin-acceso"));
  }

  const membership = selectActiveMembership(
    memberships,
    request.cookies.get(ACTIVE_CONJUNTO_COOKIE)?.value
  );
  if (!membership || !canAccessPath(membership.role, pathname)) {
    return responseWithAuthCookies(response, redirectTo(request, "/sin-permiso"));
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
