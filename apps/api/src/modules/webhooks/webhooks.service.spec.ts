import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryPagosRepository } from "../pagos/in-memory-pagos.repository";
import { WebhooksService } from "./webhooks.service";

const TENANT = "11111111-1111-4111-8111-111111111111";
const MERCHANT = "33333333-3333-4333-8333-333333333333";
const PROV = "prov-abc";

async function seedCobro(repo: InMemoryPagosRepository): Promise<string> {
  const res = await repo.crearConIdempotencia({
    nuevo: {
      tenantId: TENANT,
      merchantId: MERCHANT,
      amountMinor: 150000,
      currency: "COP",
      reference: "cuota-marzo",
      estado: "pendiente",
      provider: "fake",
      providerPaymentId: PROV
    },
    idempotencyKey: "k1",
    requestHash: "h1",
    actor: "admin"
  });
  if (!res.creado) throw new Error("seed falló");
  return res.cobro.id;
}

describe("WebhooksService — normalización de eventos", () => {
  let repo: InMemoryPagosRepository;
  let service: WebhooksService;

  beforeEach(() => {
    repo = new InMemoryPagosRepository();
    service = new WebhooksService(repo);
  });

  it("EARS 1: payment.succeeded pasa el cobro pendiente → aprobado y lo audita", async () => {
    const id = await seedCobro(repo);
    await service.procesar({ id: "evt-1", type: "payment.succeeded", providerPaymentId: PROV });

    const cobro = await repo.buscarCobro(TENANT, id);
    expect(cobro?.estado).toBe("aprobado");
    expect(repo.auditoria.some((a) => a.toStatus === "aprobado" && a.actor === "webhook:akua")).toBe(
      true
    );
  });

  it("EARS 4: payment.failed pasa el cobro pendiente → fallido", async () => {
    const id = await seedCobro(repo);
    await service.procesar({ id: "evt-2", type: "payment.failed", providerPaymentId: PROV });
    const cobro = await repo.buscarCobro(TENANT, id);
    expect(cobro?.estado).toBe("fallido");
  });

  it("EARS 3: un event_id ya procesado no re-aplica el efecto", async () => {
    const id = await seedCobro(repo);
    await service.procesar({ id: "evt-1", type: "payment.succeeded", providerPaymentId: PROV });
    const auditsAntes = repo.auditoria.length;

    await service.procesar({ id: "evt-1", type: "payment.succeeded", providerPaymentId: PROV });
    const cobro = await repo.buscarCobro(TENANT, id);

    expect(cobro?.estado).toBe("aprobado");
    expect(repo.auditoria.length).toBe(auditsAntes); // sin nueva transición
  });

  it("EARS 5: evento para un provider_payment_id inexistente no cambia nada", async () => {
    const id = await seedCobro(repo);
    await service.procesar({ id: "evt-9", type: "payment.succeeded", providerPaymentId: "no-existe" });
    const cobro = await repo.buscarCobro(TENANT, id);
    expect(cobro?.estado).toBe("pendiente");
  });

  it("EARS 6: tipo de evento no soportado se ignora (sin transición)", async () => {
    const id = await seedCobro(repo);
    await service.procesar({ id: "evt-3", type: "payment.refunded", providerPaymentId: PROV });
    const cobro = await repo.buscarCobro(TENANT, id);
    expect(cobro?.estado).toBe("pendiente");
  });
});
