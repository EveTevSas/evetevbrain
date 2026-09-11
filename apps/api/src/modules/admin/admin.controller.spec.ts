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
import type { CustodiaAdminService } from "./custodia-admin.service";
import type { DispersionAdminService } from "./dispersion-admin.service";
import type { RiesgoAdminService } from "./riesgo-admin.service";
import type { ReportesAdminService } from "./reportes-admin.service";

const LISTADO: ComercioListado[] = [];

/** Lo que el controller le pasó al servicio de tarifas, para afirmar sobre ello. */
const llamadasTarifas: unknown[][] = [];
const llamadasCustodia: unknown[][] = [];

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
  const custodia = {
    registrarConsignacion: async (...args: unknown[]) => {
      llamadasCustodia.push(args);
      return { id: "c-1" };
    },
    registrarSaldoRecaudo: async (...args: unknown[]) => {
      llamadasCustodia.push(args);
      return { id: "s-1" };
    }
  } as unknown as CustodiaAdminService;
  const dispersion = {
    prepararLote: async (...args: unknown[]) => {
      llamadasCustodia.push(["preparar", ...args]);
      return { id: "l-1" };
    },
    aprobarLote: async (...args: unknown[]) => {
      llamadasCustodia.push(["aprobar", ...args]);
      return { id: "l-1" };
    }
  } as unknown as DispersionAdminService;
  const riesgo = {
    guardarRegla: async (...args: unknown[]) => {
      llamadasCustodia.push(["regla", ...args]);
      return { id: "r-1" };
    }
  } as unknown as RiesgoAdminService;
  const reportes = {
    resumen: async () => ({ cobrosHoy: 0 }),
    fiscal: async (mes: string) => [
      {
        tenantNombre: `mes ${mes}`,
        documento: null,
        cobros: 1,
        baseMinor: 50000,
        comisionMinor: 1200,
        ivaMinor: 228,
        costoMinor: 800,
        margenMinor: 400,
        tenantId: "t"
      }
    ]
  } as unknown as ReportesAdminService;
  const auditoria = { listar: async () => [] } as unknown as AdminAuditService;
  const providers = {
    estado: () => ({ activo: "fake", proveedores: [] })
  } as unknown as ProvidersService;
  const pagos = {} as unknown as PagosAdminService;
  const conciliacion = {} as unknown as ConciliacionAdminService;
  const perfiles = {} as unknown as PerfilComercioService;
  return new AdminController(
    service,
    auditoria,
    providers,
    pagos,
    conciliacion,
    perfiles,
    tarifas,
    custodia,
    dispersion,
    riesgo,
    reportes
  );
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

describe("AdminController — consignaciones y saldo del banco (ledger-custodia)", () => {
  const CONSIGNACION = {
    provider: "combopay",
    referenciaBancaria: "TRX-0001",
    fecha: "2026-09-11",
    montoMinor: 49_200,
    paymentIds: ["11111111-1111-4111-8111-111111111111"]
  };

  it("sin el rol no se registra nada", async () => {
    const controller = controllerConMock();
    await expect(
      conContexto(SIN_ROL, () => controller.registrarConsignacion(CONSIGNACION))
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      conContexto(SIN_ROL, () =>
        controller.registrarSaldoRecaudo({ fecha: "2026-09-11", saldoMinor: 1 })
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("una consignación sin cobros, sin monto o con fecha rara → 400 antes de tocar la base", async () => {
    llamadasCustodia.length = 0;
    const controller = controllerConMock();
    for (const mala of [
      { ...CONSIGNACION, paymentIds: [] },
      { ...CONSIGNACION, montoMinor: 0 },
      { ...CONSIGNACION, montoMinor: 49_200.5 },
      { ...CONSIGNACION, fecha: "11/09/2026" },
      { ...CONSIGNACION, referenciaBancaria: "   " },
      { ...CONSIGNACION, paymentIds: ["no-es-uuid"] }
    ]) {
      await expect(
        conContexto(SUPER_ADMIN, () => controller.registrarConsignacion(mala))
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(llamadasCustodia).toHaveLength(0);
  });

  it("una consignación bien formada llega al servicio con el actor del JWT", async () => {
    llamadasCustodia.length = 0;
    const controller = controllerConMock();
    await conContexto(SUPER_ADMIN, () => controller.registrarConsignacion(CONSIGNACION));
    expect(llamadasCustodia[0]).toEqual([CONSIGNACION, "ops@evetev.com"]);
  });

  it("el saldo del banco no puede ser negativo ni traer decimales", async () => {
    const controller = controllerConMock();
    for (const malo of [
      { fecha: "2026-09-11", saldoMinor: -1 },
      { fecha: "2026-09-11", saldoMinor: 10.5 },
      { fecha: "ayer", saldoMinor: 10 }
    ]) {
      await expect(
        conContexto(SUPER_ADMIN, () => controller.registrarSaldoRecaudo(malo))
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    // Cero sí: una cuenta recién abierta tiene saldo cero, y hay que poder decirlo.
    await expect(
      conContexto(SUPER_ADMIN, () =>
        controller.registrarSaldoRecaudo({ fecha: "2026-09-11", saldoMinor: 0 })
      )
    ).resolves.toEqual({ id: "s-1" });
  });

  it("el cuadre exige una fecha de calendario si se manda", async () => {
    const controller = controllerConMock();
    await expect(
      conContexto(SUPER_ADMIN, () => controller.cuadreCustodia("2026-9-1"))
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

/* rbac-operativo: quien prepara no aprueba ni paga; solo super_admin toca
   tarifas; el mensaje dice qué rol hace falta. */
describe("AdminController — roles internos (rbac-operativo CA-2, CA-3)", () => {
  const OPS: RequestContext = { tenantId: "", actor: "ops@evetev.com", role: "ops" };
  const FINANZAS: RequestContext = { tenantId: "", actor: "fin@evetev.com", role: "finanzas" };
  const TENANT = "11111111-1111-4111-8111-111111111111";

  it("ops y finanzas leen", async () => {
    const controller = controllerConMock();
    await expect(conContexto(OPS, () => controller.listarComercios())).resolves.toEqual(LISTADO);
    await expect(conContexto(FINANZAS, () => controller.listarComercios())).resolves.toEqual(
      LISTADO
    );
  });

  it("ops no cambia tarifas, y el 403 dice qué rol hace falta", async () => {
    const controller = controllerConMock();
    const error = await conContexto(OPS, () =>
      controller.asignarTarifaComercio(TENANT, { bps: 0, fijoMinor: 0, ivaBps: 0 })
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as Error).message).toMatch(/super_admin/);
    expect((error as Error).message).toMatch(/tu rol es ops/);
  });

  it("ops prepara lotes pero no los aprueba; finanzas al revés", async () => {
    llamadasCustodia.length = 0;
    const controller = controllerConMock();
    await conContexto(OPS, () => controller.prepararLote({ tenantId: TENANT }));
    await expect(conContexto(OPS, () => controller.aprobarLote(TENANT))).rejects.toBeInstanceOf(
      ForbiddenException
    );
    await expect(
      conContexto(FINANZAS, () => controller.prepararLote({ tenantId: TENANT }))
    ).rejects.toBeInstanceOf(ForbiddenException);
    await conContexto(FINANZAS, () => controller.aprobarLote(TENANT));
    // El servicio recibe quién actúa y con qué rol: la base hace el cuatro ojos.
    expect(llamadasCustodia[0]).toEqual([
      "preparar",
      TENANT,
      { actor: "ops@evetev.com", rol: "ops" }
    ]);
    expect(llamadasCustodia[1]).toEqual([
      "aprobar",
      TENANT,
      { actor: "fin@evetev.com", rol: "finanzas" }
    ]);
  });

  it("finanzas no edita comercios; ops no registra el saldo del banco", async () => {
    const controller = controllerConMock();
    await expect(
      conContexto(FINANZAS, () =>
        controller.renombrarComercio(TENANT, {
          legalName: "Comercio Nuevo SAS",
          displayName: "Nuevo"
        })
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      conContexto(OPS, () =>
        controller.registrarSaldoRecaudo({ fecha: "2026-09-11", saldoMinor: 1 })
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe("AdminController — reglas de riesgo (riesgo-comercio CA-8, CA-11)", () => {
  const REGLA = {
    nombre: "Límite por transacción",
    tipo: "limite_transaccion",
    tenantId: null,
    parametros: { limiteMinor: 20_000_000 },
    accion: "rechazar",
    modo: "shadow",
    prioridad: 10
  };

  it("CA-11: ops no crea ni cambia reglas", async () => {
    const controller = controllerConMock();
    await expect(
      conContexto({ tenantId: "", actor: "ops@evetev.com", role: "ops" }, () =>
        controller.guardarReglaRiesgo(REGLA)
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("CA-8: parámetros que no son del tipo → 400; bien formada → llega al servicio", async () => {
    llamadasCustodia.length = 0;
    const controller = controllerConMock();
    await expect(
      conContexto(SUPER_ADMIN, () =>
        controller.guardarReglaRiesgo({ ...REGLA, parametros: { factor: 5, minimoCobros: 10 } })
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      conContexto(SUPER_ADMIN, () => controller.guardarReglaRiesgo({ ...REGLA, modo: "encendida" }))
    ).rejects.toBeInstanceOf(BadRequestException);
    await conContexto(SUPER_ADMIN, () =>
      controller.guardarReglaRiesgo({ ...REGLA, id: "11111111-1111-4111-8111-111111111111" })
    );
    expect(llamadasCustodia[0]).toEqual([
      "regla",
      "11111111-1111-4111-8111-111111111111",
      REGLA,
      "ops@evetev.com"
    ]);
  });
});

describe("AdminController — reportes y exportes (Fase 10)", () => {
  function res() {
    const headers: Record<string, string> = {};
    return {
      headers,
      res: { setHeader: (k: string, v: string) => void (headers[k] = v) } as never
    };
  }

  it("el exporte fiscal sale como CSV con BOM, punto y coma y nombre de archivo", async () => {
    const controller = controllerConMock();
    const r = res();
    const csv = await conContexto(SUPER_ADMIN, () =>
      controller.exportar("fiscal.csv", { mes: "2026-09" }, r.res)
    );
    expect(
      csv.startsWith("\uFEFFComercio;Documento;Cobros;Base;Comisión;IVA;Costo proveedor;Margen")
    ).toBe(true);
    expect(csv).toContain("mes 2026-09;;1;50000;1200;228;800;400");
    expect(r.headers["Content-Type"]).toMatch(/text\/csv/);
    expect(r.headers["Content-Disposition"]).toMatch(/evepay-fiscal-.*\.csv/);
  });

  it("un mes mal escrito o un recurso inexistente → 400 / 404", async () => {
    const controller = controllerConMock();
    await expect(
      conContexto(SUPER_ADMIN, () =>
        controller.exportar("fiscal.csv", { mes: "septiembre" }, res().res)
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      conContexto(SUPER_ADMIN, () => controller.exportar("secretos.csv", {}, res().res))
    ).rejects.toThrow(/No hay exporte/);
  });

  it("los exportes exigen un rol interno", async () => {
    const controller = controllerConMock();
    await expect(conContexto(SIN_ROL, () => controller.resumen())).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });
});
