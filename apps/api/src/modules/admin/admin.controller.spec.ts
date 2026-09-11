import { describe, expect, it } from "vitest";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { requestStorage, type RequestContext } from "../../common/request-context";
import { AdminController } from "./admin.controller";
import type { AdminService, ComercioListado } from "./admin.service";
import type { AdminAuditService } from "./admin-audit.service";
import type { ProvidersService } from "./providers.service";
import type { PagosAdminService } from "./pagos-admin.service";
import type { ConciliacionAdminService } from "./conciliacion-admin.service";
import type { PerfilComercioService } from "./perfil-comercio.service";
import type { TarifasAdminService } from "./tarifas-admin.service";

const LISTADO: ComercioListado[] = [];

/** Lo que el controller le pasó al servicio de tarifas, para afirmar sobre ello. */
const llamadasTarifas: unknown[][] = [];

function controllerConMock(): AdminController {
  const service = { listarComercios: async () => LISTADO } as unknown as AdminService;
  const tarifas = {
    asignarTarifaComercio: async (...args: unknown[]) => {
      llamadasTarifas.push(args);
      return { id: "v-nueva" };
    },
    asignarTarifaProveedor: async (...args: unknown[]) => {
      llamadasTarifas.push(args);
      return { id: "v-nueva" };
    }
  } as unknown as TarifasAdminService;
  const auditoria = { listar: async () => [] } as unknown as AdminAuditService;
  const providers = {
    estado: () => ({ activo: "fake", proveedores: [] })
  } as unknown as ProvidersService;
  const pagos = {} as unknown as PagosAdminService;
  const conciliacion = {} as unknown as ConciliacionAdminService;
  const perfiles = {} as unknown as PerfilComercioService;
  return new AdminController(service, auditoria, providers, pagos, conciliacion, perfiles, tarifas);
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

describe("AdminController — corregir el nombre (H4)", () => {
  const TENANT = "11111111-1111-4111-8111-111111111111";
  const NOMBRES = { legalName: "Comercio Nuevo SAS", displayName: "Nuevo" };

  it("sin el rol no se puede renombrar", async () => {
    const controller = controllerConMock();
    await expect(
      conContexto(SIN_ROL, () => controller.renombrarComercio(TENANT, NOMBRES))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("aplica las mismas reglas del alta: nombres demasiado cortos → 400", async () => {
    const controller = controllerConMock();
    await expect(
      conContexto(SUPER_ADMIN, () =>
        controller.renombrarComercio(TENANT, { ...NOMBRES, legalName: "AB" })
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      conContexto(SUPER_ADMIN, () =>
        controller.renombrarComercio(TENANT, { ...NOMBRES, displayName: "N" })
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("un tenantId que no es UUID → 400 antes de tocar nada", async () => {
    const controller = controllerConMock();
    await expect(
      conContexto(SUPER_ADMIN, () => controller.renombrarComercio("no-es-uuid", NOMBRES))
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("AdminController — tarifas (comisiones CA-8, CA-11)", () => {
  const TENANT = "11111111-1111-4111-8111-111111111111";
  const TARIFA = { bps: 290, fijoMinor: 30_000, ivaBps: 1900 };

  it("sin el rol no se lee ni se cambia ninguna tarifa", async () => {
    const controller = controllerConMock();
    await expect(
      conContexto(SIN_ROL, () => controller.asignarTarifaComercio(TENANT, TARIFA))
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      conContexto(SIN_ROL, () => controller.tarifaProveedor("combopay"))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("CA-8: porcentaje fuera de 0–10 000 bps o fijo negativo → 400", async () => {
    const controller = controllerConMock();
    for (const mala of [
      { ...TARIFA, bps: -1 },
      { ...TARIFA, bps: 10_001 },
      { ...TARIFA, bps: 2.5 },
      { ...TARIFA, fijoMinor: -1 }
    ]) {
      await expect(
        conContexto(SUPER_ADMIN, () => controller.asignarTarifaComercio(TENANT, mala))
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it("CA-11: un IVA que no sea 0 % ni 19 % → 400, y la respuesta dice cuáles valen", async () => {
    const controller = controllerConMock();
    for (const iva of [500, 1600, 19, "1900"]) {
      const error = await conContexto(SUPER_ADMIN, () =>
        controller.asignarTarifaComercio(TENANT, { ...TARIFA, ivaBps: iva })
      ).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(JSON.stringify((error as BadRequestException).getResponse())).toMatch(/0 % o 19 %/);
    }
  });

  it("una tarifa válida llega al servicio tal cual, con el actor del JWT", async () => {
    llamadasTarifas.length = 0;
    const controller = controllerConMock();
    await conContexto(SUPER_ADMIN, () => controller.asignarTarifaComercio(TENANT, TARIFA));
    expect(llamadasTarifas[0]).toEqual([TENANT, TARIFA, "ops@evetev.com"]);
  });

  it("la del proveedor exige declarar si descuenta en la consignación", async () => {
    llamadasTarifas.length = 0;
    const controller = controllerConMock();
    await expect(
      conContexto(SUPER_ADMIN, () =>
        controller.asignarTarifaProveedor("combopay", { bps: 0, fijoMinor: 80_000 })
      )
    ).rejects.toBeInstanceOf(BadRequestException);

    await conContexto(SUPER_ADMIN, () =>
      controller.asignarTarifaProveedor("combopay", {
        bps: 0,
        fijoMinor: 80_000,
        descuentaEnConsignacion: true
      })
    );
    expect(llamadasTarifas[0]?.[0]).toBe("combopay");
  });

  it("un tenantId que no es UUID → 400 antes de tocar nada", async () => {
    const controller = controllerConMock();
    await expect(
      conContexto(SUPER_ADMIN, () => controller.tarifaComercio("no-es-uuid"))
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
