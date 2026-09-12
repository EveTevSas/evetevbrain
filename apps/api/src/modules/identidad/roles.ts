/** Roles RBAC del núcleo EvePay (§4). El tenant es el comercio. */
export const Role = {
  SUPER_ADMIN: "super_admin", // Evetev, dirección: todo
  OPS: "ops", // Evetev, operación diaria: comercios, consignaciones, preparar lotes
  FINANZAS: "finanzas", // Evetev, tesorería: aprobar y pagar lotes, saldo del banco
  ADMIN_COMERCIO: "admin_comercio" // administra su propio comercio (tenant)
} as const;

export type Role = (typeof Role)[keyof typeof Role];

/** Los roles del equipo de Evetev: entran a la consola y operan cross-tenant. */
export const ROLES_INTERNOS: readonly Role[] = [Role.SUPER_ADMIN, Role.OPS, Role.FINANZAS];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
