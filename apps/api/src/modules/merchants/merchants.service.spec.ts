import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryMerchantsRepository } from "./in-memory-merchants.repository";
import { MerchantsService } from "./merchants.service";
import { FakePaymentProvider } from "../pagos/fake-payment.provider";

const TENANT = "11111111-1111-4111-8111-111111111111";

describe("MerchantsService — onboarding", () => {
  let repo: InMemoryMerchantsRepository;
  let service: MerchantsService;

  beforeEach(() => {
    repo = new InMemoryMerchantsRepository();
    service = new MerchantsService(repo, new FakePaymentProvider());
  });

  it("EARS 1: registrar crea el comercio en revisión con provider_merchant_id", async () => {
    const m = await service.registrar(TENANT, { legalName: "Comercio Demo" });

    expect(m.estado).toBe("en_revision");
    expect(m.legalName).toBe("Comercio Demo");
    const row = Array.from(repo.merchants.values())[0];
    expect(row?.providerMerchantId).toBeTruthy();
    expect(row?.tenantId).toBe(TENANT);
  });

  it("EARS 3: aprobarPorProvider pasa un comercio en_revision → aprobado", async () => {
    const m = await repo.crear({
      tenantId: TENANT,
      legalName: "Comercio Demo",
      provider: "fake",
      providerMerchantId: "pm-1",
      estado: "en_revision"
    });
    await service.aprobarPorProvider("pm-1");
    expect((await service.obtener(TENANT, m.id))?.estado).toBe("aprobado");
  });

  it("EARS 4: aprobarPorProvider con id de proveedor desconocido no cambia nada", async () => {
    const m = await repo.crear({
      tenantId: TENANT,
      legalName: "Comercio Demo",
      provider: "fake",
      providerMerchantId: "pm-2",
      estado: "en_revision"
    });
    await service.aprobarPorProvider("no-existe");
    expect((await service.obtener(TENANT, m.id))?.estado).toBe("en_revision");
  });
});
