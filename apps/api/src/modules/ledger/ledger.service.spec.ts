import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryPagosRepository } from "../pagos/in-memory-pagos.repository";
import { InMemoryLedgerRepository } from "./in-memory-ledger.repository";
import { FakePaymentProvider } from "../pagos/fake-payment.provider";
import { LedgerService } from "./ledger.service";
import { LedgerDesbalanceadoError } from "./ledger.repository";

const TENANT = "11111111-1111-4111-8111-111111111111";
const MERCHANT = "33333333-3333-4333-8333-333333333333";
const MONTO = 150000;

async function seedCobro(pagos: InMemoryPagosRepository): Promise<string> {
  const res = await pagos.crearConIdempotencia({
    nuevo: {
      tenantId: TENANT,
      merchantId: MERCHANT,
      amountMinor: MONTO,
      currency: "COP",
      reference: "cuota-marzo",
      estado: "pendiente",
      provider: "fake",
      providerPaymentId: "prov-1"
    },
    idempotencyKey: "k1",
    requestHash: "h1",
    actor: "admin"
  });
  if (!res.creado) throw new Error("seed falló");
  return res.cobro.id;
}

describe("LedgerService — doble partida inmutable", () => {
  let pagos: InMemoryPagosRepository;
  let ledgerRepo: InMemoryLedgerRepository;
  let service: LedgerService;

  beforeEach(() => {
    pagos = new InMemoryPagosRepository();
    ledgerRepo = new InMemoryLedgerRepository();
    service = new LedgerService(ledgerRepo, pagos, new FakePaymentProvider());
  });

  it("EARS 1 y 3: cobro_aprobado asienta débito/crédito y el saldo se reconstruye", async () => {
    const id = await seedCobro(pagos);
    const res = await service.registrarCobroAprobado(TENANT, id);

    expect(res.posted).toBe(true);
    expect(await service.saldo(TENANT, `merchant_payable:${MERCHANT}`)).toBe(MONTO); // crédito
    // La compensación va nombrada por proveedor: con dos adquirencias hay que
    // poder decir cuánto tiene cada una sin mezclarlo en una cuenta común.
    expect(await service.saldo(TENANT, "clearing:fake")).toBe(-MONTO); // débito
    expect(await service.saldo(TENANT, "akua_clearing")).toBe(0);
  });

  it("EARS 2: un asiento desbalanceado se rechaza sin persistir", async () => {
    await expect(
      service.postAsiento({
        tenantId: TENANT,
        kind: "prueba",
        memo: "desbalanceado",
        lines: [
          { account: "a", direction: "debit", amountMinor: 100 },
          { account: "b", direction: "credit", amountMinor: 90 }
        ]
      })
    ).rejects.toBeInstanceOf(LedgerDesbalanceadoError);
    expect(ledgerRepo.entries).toHaveLength(0);
    expect(ledgerRepo.lines).toHaveLength(0);
  });

  it("EARS 4: asentar dos veces el mismo cobro no duplica (idempotente)", async () => {
    const id = await seedCobro(pagos);
    const primero = await service.registrarCobroAprobado(TENANT, id);
    const segundo = await service.registrarCobroAprobado(TENANT, id);

    expect(primero.posted).toBe(true);
    expect(segundo.posted).toBe(false);
    expect(await ledgerRepo.contarAsientosPorPago(TENANT, id)).toBe(1);
    expect(await service.saldo(TENANT, `merchant_payable:${MERCHANT}`)).toBe(MONTO);
  });
});
