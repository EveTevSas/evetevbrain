import type { User } from "@supabase/supabase-js";

/**
 * Roles internos y permisos de la consola (spec `rbac-operativo`).
 *
 * El rol viaja en app_metadata del JWT — lo escribe el script de
 * aprovisionamiento con la clave secreta, nunca el usuario (user_metadata sí
 * sería editable por él). Esta tabla es una copia de la de la API
 * (`apps/api/src/modules/admin/permisos.ts`) y sirve para no mostrar botones
 * que la API va a rechazar; la que manda es la de la API.
 */
export const ROLES_INTERNOS = ["super_admin", "ops", "finanzas"] as const;
export type RolInterno = (typeof ROLES_INTERNOS)[number];

export type Accion =
  | "leer"
  | "comercios.escribir"
  | "proveedores.salud"
  | "pagos.reverificar"
  | "conciliacion.correr"
  | "consignaciones.registrar"
  | "recaudo.saldo"
  | "tarifas.escribir"
  | "dispersion.politica"
  | "lotes.preparar"
  | "lotes.aprobar"
  | "lotes.pagar"
  | "retenciones.liberar_primer_cobro"
  | "retenciones.liberar_reserva"
  | "retenciones.liberar_riesgo"
  | "riesgo.reglas"
  | "riesgo.listas";

const TODOS: RolInterno[] = ["super_admin", "ops", "finanzas"];
const OPS: RolInterno[] = ["super_admin", "ops"];
const FINANZAS: RolInterno[] = ["super_admin", "finanzas"];
const SOLO_SUPER: RolInterno[] = ["super_admin"];

export const PERMISOS: Record<Accion, RolInterno[]> = {
  leer: TODOS,
  "comercios.escribir": OPS,
  "proveedores.salud": OPS,
  "pagos.reverificar": OPS,
  "conciliacion.correr": OPS,
  "consignaciones.registrar": TODOS,
  "recaudo.saldo": FINANZAS,
  "tarifas.escribir": SOLO_SUPER,
  "dispersion.politica": SOLO_SUPER,
  "lotes.preparar": OPS,
  "lotes.aprobar": FINANZAS,
  "lotes.pagar": FINANZAS,
  "retenciones.liberar_primer_cobro": TODOS,
  "retenciones.liberar_reserva": FINANZAS,
  "retenciones.liberar_riesgo": TODOS,
  "riesgo.reglas": SOLO_SUPER,
  "riesgo.listas": OPS
};

/** El rol interno del usuario, o null si no tiene uno (y por tanto no entra). */
export function rolInterno(user: Pick<User, "app_metadata"> | null): RolInterno | null {
  const rol = user?.app_metadata?.role;
  return (ROLES_INTERNOS as readonly string[]).includes(String(rol)) ? (rol as RolInterno) : null;
}

export function puede(rol: RolInterno | null | undefined, accion: Accion): boolean {
  return rol != null && PERMISOS[accion].includes(rol);
}

/** Compatibilidad: la consola nació con un solo rol. */
export function esSuperAdmin(user: Pick<User, "app_metadata"> | null): boolean {
  return rolInterno(user) === "super_admin";
}

/** Solo rutas internas: evita open redirects en el parámetro `next`. */
export function isSafeInternalPath(path: string | null | undefined): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}
