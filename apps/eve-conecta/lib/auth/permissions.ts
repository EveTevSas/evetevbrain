import { z } from "zod";

export const appRoleSchema = z.enum([
  "super_admin",
  "admin_conjunto",
  "consejo",
  "residente"
]);

export type AppRole = z.infer<typeof appRoleSchema>;

export interface AuthenticatedUserView {
  email: string;
  id: string;
  initials: string;
  name: string;
  role: AppRole;
  roleLabel: string;
}

export const roleLabels: Record<AppRole, string> = {
  super_admin: "Superadministración",
  admin_conjunto: "Administración",
  consejo: "Consejo de administración",
  residente: "Residente"
};

const routeRoles: Record<string, readonly AppRole[]> = {
  "/": ["super_admin", "admin_conjunto", "consejo", "residente"],
  "/finanzas": ["super_admin", "admin_conjunto", "residente"],
  "/presupuesto": ["super_admin", "admin_conjunto", "consejo"],
  "/comunidad": ["super_admin", "admin_conjunto"],
  "/comunicaciones": ["super_admin", "admin_conjunto", "consejo", "residente"],
  "/pqrs": ["super_admin", "admin_conjunto", "consejo", "residente"],
  "/reservas": ["super_admin", "admin_conjunto", "consejo", "residente"],
  "/porteria": ["super_admin", "admin_conjunto", "residente"],
  "/mantenimiento": ["super_admin", "admin_conjunto", "consejo"],
  "/asambleas": ["super_admin", "admin_conjunto", "consejo", "residente"],
  "/documentos": ["super_admin", "admin_conjunto", "consejo", "residente"],
  "/auditoria": ["super_admin", "admin_conjunto"]
};

export function canAccessPath(role: AppRole, pathname: string): boolean {
  const route = Object.keys(routeRoles)
    .filter((candidate) =>
      candidate === "/"
        ? pathname === "/"
        : pathname === candidate || pathname.startsWith(`${candidate}/`)
    )
    .sort((left, right) => right.length - left.length)[0];

  const allowedRoles = route ? routeRoles[route] : undefined;
  return allowedRoles ? allowedRoles.includes(role) : false;
}

export function canSeeNavigation(role: AppRole, href: string): boolean {
  return routeRoles[href]?.includes(role) ?? true;
}

export function isSafeInternalPath(value: string | null): value is string {
  return Boolean(value?.startsWith("/") && !value.startsWith("//"));
}

export function initialsFor(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]).join("");
  return (initials || email[0] || "E").toUpperCase();
}
