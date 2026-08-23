import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { appRoleSchema, canAccessPath, isSafeInternalPath } from "@/lib/auth/permissions";
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

  const { data: membership, error } = await supabase
    .schema("conjuntos")
    .from("miembros_conjunto")
    .select("rol")
    .eq("usuario_id", user.id)
    .eq("activo", true)
    .order("creado_en", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !membership) {
    return responseWithAuthCookies(response, redirectTo(request, "/sin-acceso"));
  }

  const role = appRoleSchema.safeParse(membership.rol);
  if (!role.success || !canAccessPath(role.data, pathname)) {
    return responseWithAuthCookies(response, redirectTo(request, "/sin-permiso"));
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
