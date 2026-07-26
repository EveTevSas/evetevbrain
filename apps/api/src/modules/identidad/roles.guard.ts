import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { currentContext } from "../../common/request-context";
import { ROLES_KEY } from "./roles.decorator";
import { isUuid, type Role } from "./roles";

/**
 * Exige tenant válido y rol autorizado (§4). Sin tenant → 401; rol no permitido → 403.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const ctx = currentContext();

    if (!ctx.tenantId || !isUuid(ctx.tenantId)) {
      throw new UnauthorizedException("Falta o es inválido el tenant (X-Tenant-Id).");
    }

    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    if (!required.includes(ctx.role as Role)) {
      throw new ForbiddenException("El rol no está autorizado para este recurso.");
    }
    return true;
  }
}
