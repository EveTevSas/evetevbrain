import { describe, expect, it } from "vitest";
import { ForbiddenException, type ExecutionContext, UnauthorizedException } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";
import { Role } from "./roles";
import { requestStorage, type RequestContext } from "../../common/request-context";

const TENANT = "11111111-1111-4111-8111-111111111111";

function guardWith(required: Role[] | undefined): RolesGuard {
  const reflector = { getAllAndOverride: () => required } as unknown as Reflector;
  return new RolesGuard(reflector);
}

const execCtx = {
  getHandler: () => undefined,
  getClass: () => undefined
} as unknown as ExecutionContext;

function run(ctx: RequestContext, guard: RolesGuard): boolean {
  return requestStorage.run(ctx, () => guard.canActivate(execCtx));
}

describe("RolesGuard — RBAC y tenant (§4)", () => {
  it("sin tenant válido → 401", () => {
    const guard = guardWith([Role.ADMIN_COMERCIO]);
    expect(() => run({ tenantId: "", actor: "a", role: Role.ADMIN_COMERCIO }, guard)).toThrow(
      UnauthorizedException
    );
  });

  it("rol no autorizado → 403", () => {
    const guard = guardWith([Role.SUPER_ADMIN]);
    expect(() => run({ tenantId: TENANT, actor: "a", role: Role.ADMIN_COMERCIO }, guard)).toThrow(
      ForbiddenException
    );
  });

  it("rol autorizado → permite", () => {
    const guard = guardWith([Role.ADMIN_COMERCIO]);
    expect(run({ tenantId: TENANT, actor: "a", role: Role.ADMIN_COMERCIO }, guard)).toBe(true);
  });
});
