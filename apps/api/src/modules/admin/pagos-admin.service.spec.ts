import { describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import type { EstadoCobro, PaymentProvider } from "@evetev/shared";
import type { Db } from "../../database/drizzle";
import type { PagosRepository } from "../pagos/pagos.repository";
import type { LedgerService } from "../ledger/ledger.service";
import type { AdminAuditService } from "./admin-audit.service";
import { PagosAdminService } from "./pagos-admin.service";

const PAGO_ID = "22222222-2222-4222-8222-222222222222";
const TENANT = "11111111-1111-4111-8111-111111111111";

function filaPago(status: string, providerPaymentId: string | null = "prov-1") {
  return {
    id: PAGO_ID,
    tenant_id: TENANT,
    tenant_nombre: "Los Robles",
    merchant_id: "33333333-3333-4333-8333-333333333333",
    amount_minor: "150000",
    currency: "COP",
    reference: "cuota-marzo",
    descripcion: null,
    status,
    provider: "combopay",
    provider_payment_id: providerPaymentId,
    checkout_url: null,
    created_at: "2026-09-01T10:00:00.000Z",
    updated_at: "2026-09-01T10:00:00.000Z"
  };
}

interface Montaje {
  service: PagosAdminService;
  transiciones: unknown[];
  auditorias: { accion: string; detalle?: Record<string, unknown> }[];
  asientos: number;
}

function montar(estadoLocal: string, estadoProveedor: EstadoCobro, providerId?: string | null) {
  const transiciones: unknown[] = [];
  const auditorias: { accion: string; detalle?: Record<string, unknown> }[] = [];
  const estado = { asientos: 0 };

  const db = {
    execute: vi.fn(async () => [
      filaPago(estadoLocal, providerId === undefined ? "prov-1" : providerId)
    ])
  } as unknown as Db;

  const repo = {
    aplicarTransicion: async (args: unknown) => {
      transiciones.push(args);
    }
  } as unknown as PagosRepository;

  const provider = {
    nombre: "combopay",
    verificarEstado: async () => estadoProveedor
  } as unknown as PaymentProvider;

  const ledger = {
    registrarCobroAprobado: async () => {
      estado.asientos += 1;
    }
  } as unknown as LedgerService;

  const auditoria = {
    registrar: async (a: { accion: string; detalle?: Record<string, unknown> }) => {
      auditorias.push(a);
      return "audit-1";
    }
  } as unknown as AdminAuditService;

  return {
    service: new PagosAdminService(db, repo, provider, ledger, auditoria),
    transiciones,
    auditorias,
    get asientos() {
      return estado.asientos;
    }
  } as Montaje;
}

describe("PagosAdminService — reverificación manual (CA-17, CA-18)", () => {
  let m: Montaje;

  it("aplica la transición cuando el proveedor avanzó y la máquina lo permite", async () => {
    m = montar("pendiente", "aprobado");

    const r = await m.service.reverificar(PAGO_ID, "ops@evetev.com");

    expect(r.cambio).toBe(true);
    expect(r.estadoLocal).toBe("pendiente");
    expect(r.estadoProveedor).toBe("aprobado");
    expect(m.transiciones).toHaveLength(1);
    expect(m.transiciones[0]).toMatchObject({
      desde: "pendiente",
      hacia: "aprobado",
      actor: "admin:ops@evetev.com"
    });
    // Al aprobar se asienta el movimiento, igual que por webhook.
    expect(m.asientos).toBe(1);
  });

  /* CA-18: si nada cambió hay que decirlo, no registrar una transición. Un
     cobro ya aprobado no debe acumular transiciones falsas cada vez que
     alguien abre su detalle y pulsa el botón. */
  it("cuando ambos coinciden no registra transición y lo dice", async () => {
    m = montar("aprobado", "aprobado");

    const r = await m.service.reverificar(PAGO_ID, "ops@evetev.com");

    expect(r.cambio).toBe(false);
    expect(r.detalle).toContain("coinciden");
    expect(m.transiciones).toHaveLength(0);
    expect(m.asientos).toBe(0);
  });

  /* La máquina de estados manda sobre el proveedor: un cobro ya conciliado no
     retrocede porque una consulta diga otra cosa. */
  it("respeta la máquina de estados y no fuerza una transición inválida", async () => {
    m = montar("conciliado", "pendiente");

    const r = await m.service.reverificar(PAGO_ID, "ops@evetev.com");

    expect(r.cambio).toBe(false);
    expect(r.detalle).toContain("no está permitida");
    expect(m.transiciones).toHaveLength(0);
  });

  it("audita SIEMPRE, cambie o no el estado", async () => {
    for (const [local, remoto] of [
      ["pendiente", "aprobado"],
      ["aprobado", "aprobado"],
      ["conciliado", "pendiente"]
    ] as [string, EstadoCobro][]) {
      m = montar(local, remoto);
      await m.service.reverificar(PAGO_ID, "ops@evetev.com");

      expect(m.auditorias).toHaveLength(1);
      expect(m.auditorias[0]!.accion).toBe("pago.reverificar");
      expect(m.auditorias[0]!.detalle).toMatchObject({
        estadoLocal: local,
        estadoProveedor: remoto
      });
    }
  });

  it("un cobro sin id del proveedor no se puede reverificar", async () => {
    m = montar("pendiente", "aprobado", null);

    await expect(m.service.reverificar(PAGO_ID, "ops@evetev.com")).rejects.toBeInstanceOf(
      NotFoundException
    );
  });
});

describe("PagosAdminService — listado (CA-15)", () => {
  function servicioConFilas(filas: unknown[]) {
    const db = { execute: vi.fn(async () => filas) } as unknown as Db;
    return new PagosAdminService(
      db,
      {} as PagosRepository,
      {} as PaymentProvider,
      {} as LedgerService,
      {} as AdminAuditService
    );
  }

  it("convierte el monto bigint (que llega como texto) sin perderlo", async () => {
    const service = servicioConFilas([filaPago("aprobado")]);

    const { pagos } = await service.listar({});

    expect(pagos[0]!.montoMinor).toBe(150000);
    expect(typeof pagos[0]!.montoMinor).toBe("number");
  });

  it("conserva el proveedor que procesó el cobro (CA-14)", async () => {
    const service = servicioConFilas([filaPago("aprobado")]);

    const { pagos } = await service.listar({});
    expect(pagos[0]!.provider).toBe("combopay");
  });

  /* La página siguiente se detecta pidiendo una fila de más, no contando el
     total: en una tabla de pagos grande el COUNT es caro y no se usa. */
  it("con más filas que el límite devuelve cursor y recorta al límite", async () => {
    const service = servicioConFilas([filaPago("aprobado"), filaPago("pendiente")]);

    const pagina = await service.listar({ limite: 1 });

    expect(pagina.pagos).toHaveLength(1);
    expect(pagina.siguiente).toEqual({ at: "2026-09-01T10:00:00.000Z", id: PAGO_ID });
  });

  it("sin más filas no hay cursor", async () => {
    const service = servicioConFilas([filaPago("aprobado")]);

    const pagina = await service.listar({ limite: 10 });

    expect(pagina.pagos).toHaveLength(1);
    expect(pagina.siguiente).toBeNull();
  });

  it("una lista vacía no inventa cursor", async () => {
    const pagina = await servicioConFilas([]).listar({});

    expect(pagina.pagos).toEqual([]);
    expect(pagina.siguiente).toBeNull();
  });
});
