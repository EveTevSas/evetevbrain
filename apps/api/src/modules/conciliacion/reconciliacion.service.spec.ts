import { beforeEach, describe, expect, it } from "vitest";
import type { LiquidacionProvider, PaymentProvider, RangoFechas } from "@evetev/shared";
import { InMemoryPagosRepository } from "../pagos/in-memory-pagos.repository";
import { InMemoryLedgerRepository } from "../ledger/in-memory-ledger.repository";
import { LedgerService } from "../ledger/ledger.service";
import { ReconciliacionService } from "./reconciliacion.service";

const TENANT = "11111111-1111-4111-8111-111111111111";
const MERCHANT = "33333333-3333-4333-8333-333333333333";
const RANGO: RangoFechas = { desde: "2000-01-01T00:00:00.000Z", hasta: "2100-01-01T00:00:00.000Z" };

async function seedAprobado(
  pagos: InMemoryPagosRepository,
  providerPaymentId: string,
  monto: number
): Promise<string> {
  const res = await pagos.crearConIdempotencia({
    nuevo: {
      tenantId: TENANT,
      merchantId: MERCHANT,
      amountMinor: monto,
      currency: "COP",
      reference: `ref-${providerPaymentId}`,
      estado: "aprobado",
      provider: "fake",
      providerPaymentId
    },
    idempotencyKey: providerPaymentId,
    requestHash: "h",
    actor: "a"
  });
  if (!res.creado) throw new Error("seed falló");
  return res.cobro.id;
}

describe("ReconciliacionService — settlement", () => {
  let pagos: InMemoryPagosRepository;
  let ledgerRepo: InMemoryLedgerRepository;
  let liquidaciones: LiquidacionProvider[];
  let service: ReconciliacionService;

  const provider = {
    listarLiquidaciones: async (): Promise<LiquidacionProvider[]> => liquidaciones
  } as unknown as PaymentProvider;

  beforeEach(() => {
    pagos = new InMemoryPagosRepository();
    ledgerRepo = new InMemoryLedgerRepository();
    liquidaciones = [];
    service = new ReconciliacionService(pagos, provider, new LedgerService(ledgerRepo, pagos));
  });

  it("EARS 1: cobro que cuadra → conciliado + asiento en el ledger", async () => {
    const id = await seedAprobado(pagos, "prov-1", 1000);
    liquidaciones = [{ providerPaymentId: "prov-1", montoMinor: 1000 }];

    const rep = await service.conciliar(TENANT, RANGO);

    expect(rep.conciliados).toBe(1);
    expect((await pagos.buscarCobro(TENANT, id))?.estado).toBe("conciliado");
    expect(await ledgerRepo.contarAsientosPorPago(TENANT, id)).toBe(1);
  });

  it("EARS 2: monto distinto → diferencia, no concilia", async () => {
    const id = await seedAprobado(pagos, "prov-2", 1000);
    liquidaciones = [{ providerPaymentId: "prov-2", montoMinor: 999 }];

    const rep = await service.conciliar(TENANT, RANGO);

    expect(rep.diferencias).toBe(1);
    expect(rep.conciliados).toBe(0);
    expect((await pagos.buscarCobro(TENANT, id))?.estado).toBe("aprobado");
  });

  it("EARS 3: liquidación sin cobro local → huérfano del proveedor", async () => {
    liquidaciones = [{ providerPaymentId: "prov-x", montoMinor: 500 }];
    const rep = await service.conciliar(TENANT, RANGO);
    expect(rep.huerfanosProveedor).toBe(1);
    expect(rep.conciliados).toBe(0);
  });

  it("EARS 4: cobro aprobado sin liquidación → no conciliado", async () => {
    const id = await seedAprobado(pagos, "prov-3", 1000);
    liquidaciones = [];
    const rep = await service.conciliar(TENANT, RANGO);
    expect(rep.noConciliados).toBe(1);
    expect((await pagos.buscarCobro(TENANT, id))?.estado).toBe("aprobado");
  });

  it("EARS 5: correr dos veces no re-concilia ni duplica asientos", async () => {
    const id = await seedAprobado(pagos, "prov-1", 1000);
    liquidaciones = [{ providerPaymentId: "prov-1", montoMinor: 1000 }];

    const primero = await service.conciliar(TENANT, RANGO);
    const segundo = await service.conciliar(TENANT, RANGO);

    expect(primero.conciliados).toBe(1);
    expect(segundo.conciliados).toBe(0);
    expect(await ledgerRepo.contarAsientosPorPago(TENANT, id)).toBe(1);
  });
});
