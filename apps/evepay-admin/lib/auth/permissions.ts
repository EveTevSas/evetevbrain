import type { User } from "@supabase/supabase-js";

/**
 * La consola es de un solo rol: super_admin (equipo Evetev). El rol viaja en
 * app_metadata del JWT — lo escribe el script de aprovisionamiento con la
 * clave secreta, nunca el usuario (user_metadata sí sería editable por él).
 */
export function esSuperAdmin(user: Pick<User, "app_metadata"> | null): boolean {
  return user?.app_metadata?.role === "super_admin";
}

/** Solo rutas internas: evita open redirects en el parámetro `next`. */
export function isSafeInternalPath(path: string | null | undefined): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}
