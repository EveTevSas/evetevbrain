import { afterEach, describe, expect, it } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { requestStorage, type RequestContext } from "../../common/request-context";
import { AdminController } from "./admin.controller";
import type { AdminService, ComercioListado } from "./admin.service";
import type { AdminAuditService } from "./admin-audit.service";
import type { ProvidersService } from "./providers.service";
import type { PagosAdminService } from "./pagos-admin.service";

const LISTADO: ComercioListado[] = [];

function controllerConMock(): AdminController {
  const service = { listarComercios: async () => LISTADO } as unknown as AdminService;
  const auditoria = { listar: async () => [] } as unknown as AdminAuditService;
  const providers = {
    estado: () => ({ activo: "fake", proveedores: [] })
  } as unknown as ProvidersService;
  const pagos = {} as unknown as PagosAdminService;
  return new AdminController(service, auditoria, providers, pagos);
}

function conContexto<T>(ctx: RequestContext, fn: () => Promise<T>): Promise<T> {
  return requestStorage.run(ctx, fn);
}

const SIN_ROL: RequestContext = { tenantId: "", actor: "", role: "" };
const SUPER_ADMIN: RequestContext = { tenantId: "", actor: "ops@evetev.com", role: "super_admin" };

afterEach(() => {
  delete process.env.ADMIN_SECRET;
});

describe("AdminController — acceso (CA-3 de admin-console)", () => {
  it("rol super_admin del JWT entra sin X-Admin-Secret", async () => {
    const controller = controllerConMock();
    await expect(
      conContexto(SUPER_ADMIN, () => controller.listarComercios(undefined))
    ).resolves.toEqual(LISTADO);
  });

  it("X-Admin-Secret correcto sigue entrando (transitorio hasta F1)", async () => {
    process.env.ADMIN_SECRET = "secreto";
    const controller = controllerConMock();
    await expect(
      conContexto(SIN_ROL, () => controller.listarComercios("secreto"))
    ).resolves.toEqual(LISTADO);
  });

  it("sin rol y sin secreto → 403", async () => {
    process.env.ADMIN_SECRET = "secreto";
    const controller = controllerConMock();
    await expect(
      conContexto(SIN_ROL, () => controller.listarComercios(undefined))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("otro rol (admin_comercio) no entra a admin", async () => {
    const controller = controllerConMock();
    await expect(
      conContexto({ tenantId: "t1", actor: "x", role: "admin_comercio" }, () =>
        controller.listarComercios(undefined)
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("sin ADMIN_SECRET configurado el secreto no abre nada", async () => {
    const controller = controllerConMock();
    await expect(
      conContexto(SIN_ROL, () => controller.listarComercios("lo-que-sea"))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  /* Regresión: la primera versión leía el contexto con currentContext(), que
     LANZA cuando no hay ninguno. Como AdminController no estaba en el
     forRoutes del TenantMiddleware, en la aplicación real no había contexto y
     cada endpoint de admin respondía 500 en vez de 403 — incluido el camino
     del X-Admin-Secret, que quedó inservible. Los tests no lo vieron porque
     todos corrían dentro de requestStorage.run(). Este corre FUERA a propósito. */
  it("sin contexto de request (ruta sin middleware) → 403, nunca un 500", async () => {
    process.env.ADMIN_SECRET = "secreto";
    const controller = controllerConMock();
    await expect(controller.listarComercios(undefined)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("sin contexto, el X-Admin-Secret correcto sigue funcionando", async () => {
    process.env.ADMIN_SECRET = "secreto";
    const controller = controllerConMock();
    await expect(controller.listarComercios("secreto")).resolves.toEqual(LISTADO);
  });
});
