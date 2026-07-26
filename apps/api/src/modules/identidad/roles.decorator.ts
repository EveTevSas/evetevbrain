import { SetMetadata } from "@nestjs/common";
import type { Role } from "./roles";

export const ROLES_KEY = "evepay_roles";

/** Declara los roles permitidos para un endpoint (§4: cada endpoint declara su rol). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
