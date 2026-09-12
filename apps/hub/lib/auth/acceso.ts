import type { User } from "@supabase/supabase-js";

/**
 * Quién entra al Hub (spec hub-base, CA-2): cualquier cuenta cuyo correo sea de
 * un dominio permitido. El dominio lo verifica Google al iniciar sesión; aquí
 * solo se compara. La lista viene del entorno para no recompilar al cambiarla.
 */
export function dominiosPermitidos(valor = process.env.HUB_DOMINIOS_PERMITIDOS): string[] {
  const lista = (valor ?? "evetev.com")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  return lista.length > 0 ? lista : ["evetev.com"];
}

export function correoPermitido(email: string | null | undefined, dominios: string[]): boolean {
  if (!email) return false;
  const arroba = email.lastIndexOf("@");
  if (arroba <= 0 || arroba === email.length - 1) return false;
  const dominio = email.slice(arroba + 1).toLowerCase();
  return dominios.includes(dominio);
}

export function tieneAcceso(
  user: Pick<User, "email" | "app_metadata"> | null,
  dominios = dominiosPermitidos()
): boolean {
  if (!user) return false;
  /* El equipo interno de EvePay (super_admin · ops · finanzas) entra aunque su
     correo no sea del dominio: ya fue aprovisionado a mano por Evetev. */
  const rol = String(user.app_metadata?.role ?? "");
  if (["super_admin", "ops", "finanzas"].includes(rol)) return true;
  return correoPermitido(user.email, dominios);
}

/** Solo rutas internas: evita open redirects en el parámetro `next`. */
export function isSafeInternalPath(path: string | null | undefined): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}
