/** Roles RBAC del núcleo EvePay (§4). El tenant es el comercio. */
export const Role = {
  SUPER_ADMIN: "super_admin", // Evetev, operación multi-comercio
  ADMIN_COMERCIO: "admin_comercio" // administra su propio comercio (tenant)
} as const;

export type Role = (typeof Role)[keyof typeof Role];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
