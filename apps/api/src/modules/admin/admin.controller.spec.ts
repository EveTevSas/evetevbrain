import { describe, expect, it } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { requestStorage, type RequestContext } from "../../common/request-context";
import { AdminController } from "./admin.controller";
import type { AdminService, ComercioListado } from "./admin.service";
import type { AdminAuditService } from "./admin-audit.service";
import type { ProvidersService } from "./providers.service";
import type { PagosAdminService } from "./pagos-admin.service";
import type { ConciliacionAdminService } from "./conciliacion-admin.service";

const LISTADO: ComercioListado[] = [];

function controllerConMock(): AdminController {
  const service = { listarComercios: async () => LISTADO } as unknown as AdminService;
  const auditoria = { listar: async () => [] } as unknown as AdminAuditService;
  const providers = {
    estado: () => ({ activo: "fake", proveedores: [] })
  } as unknown as ProvidersService;
  const pagos = {} as unknown as PagosAdminService;
  const conciliacion = {} as unknown as ConciliacionAdminService;
  return new AdminController(service, auditoria, providers, pagos, conciliacion);
}

function conContexto<T>(ctx: RequestContext, fn: () => Promise<T>): Promise<T> {
  return requestStorage.run(ctx, fn);
}

const SIN_ROL: RequestContext = { tenantId: "", actor: "", role: "" };
const SUPER_ADMIN: RequestContext = { tenantId: "", actor: "ops@evetev.com", role: "super_admin" };

describe("AdminController — acceso (CA-3 de admin-console)", () => {
  it("el rol super_admin del JWT entra", async () => {
    const controller = controllerConMock();
    await expect(conContexto(SUPER_ADMIN, () => controller.listarComercios())).resolves.toEqual(
      LISTADO
    );
  });

  it("sin rol → 403", async () => {
    const controller = controllerConMock();
    await expect(conContexto(SIN_ROL, () => controller.listarComercios())).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it("otro rol (admin_comercio) no entra a admin", async () => {
    const controller = controllerConMock();
    await expect(
      conContexto({ tenantId: "t1", actor: "x", role: "admin_comercio" }, () =>
        controller.listarComercios()
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  /* Regresión: la primera versión leía el contexto con currentContext(), que
     LANZA cuando no hay ninguno. Como AdminController no estaba en el
     forRoutes del TenantMiddleware, en la aplicación real no había contexto y
     cada endpoint de admin respondía 500 en vez de 403. Los tests no lo vieron
     porque todos corrían dentro de requestStorage.run(); este corre FUERA. */
  it("sin contexto de request (ruta sin middleware) → 403, nunca un 500", async () => {
    const controller = controllerConMock();
    await expect(controller.listarComercios()).rejects.toBeInstanceOf(ForbiddenException);
  });

  /* F1: el X-Admin-Secret se retiró. Un secreto compartido no distingue quién
     hizo qué —la auditoría no podía nombrar a nadie— y revocarlo obligaba a
     rotarlo para todos a la vez. Este test fija que ya no hay puerta trasera:
     ni con la variable puesta se entra sin un JWT con el rol. */
  it("ADMIN_SECRET ya no abre nada, aunque esté configurado", async () => {
    process.env.ADMIN_SECRET = "el-secreto-de-antes";
    try {
      const controller = controllerConMock();
      await expect(controller.listarComercios()).rejects.toBeInstanceOf(ForbiddenException);
      await expect(conContexto(SIN_ROL, () => controller.listarComercios())).rejects.toBeInstanceOf(
        ForbiddenException
      );
    } finally {
      delete process.env.ADMIN_SECRET;
    }
  });

  it("los endpoints ya no reciben ningún parámetro de credencial", () => {
    // Si alguien reintroduce un header de acceso, la aridad cambia y esto falla.
    expect(controllerConMock().listarComercios.length).toBe(0);
  });
});
