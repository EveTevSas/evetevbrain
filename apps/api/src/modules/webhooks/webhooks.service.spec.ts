import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryPagosRepository } from "../pagos/in-memory-pagos.repository";
import { InMemoryLedgerRepository } from "../ledger/in-memory-ledger.repository";
import { LedgerService } from "../ledger/ledger.service";
import { InMemoryMerchantsRepository } from "../merchants/in-memory-merchants.repository";
import { MerchantsService } from "../merchants/merchants.service";
import { FakePaymentProvider } from "../pagos/fake-payment.provider";
import { OutboundWebhookDeliveryService } from "../outbound-webhooks/outbound-webhook-delivery.service";
import type { OutboundWebhooksRepository } from "../outbound-webhooks/outbound-webhooks.repository";
import { WebhooksService } from "./webhooks.service";

const noopDelivery = { entregar: async () => {} } as unknown as OutboundWebhookDeliveryService;
const noopWebhookRepo: OutboundWebhooksRepository = {
  buscarPorTenant: async () => null,
  registrar: async () => { throw new Error("not used"); },
  actualizar: async () => null
};

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
  let ledgerRepo: InMemoryLedgerRepository;
  let merchantsRepo: InMemoryMerchantsRepository;
  let merchants: MerchantsService;
  let service: WebhooksService;

  beforeEach(() => {
    repo = new InMemoryPagosRepository();
    ledgerRepo = new InMemoryLedgerRepository();
    merchantsRepo = new InMemoryMerchantsRepository();
    merchants = new MerchantsService(merchantsRepo, new FakePaymentProvider());
    service = new WebhooksService(repo, new LedgerService(ledgerRepo, repo), merchants, noopDelivery, noopWebhookRepo);
  });

  it("EARS 1: payment.succeeded pasa el cobro pendiente → aprobado y lo audita", async () => {
    const id = await seedCobro(repo);
    await service.procesar({ id: "evt-1", type: "payment.succeeded", providerPaymentId: PROV });

    const cobro = await repo.buscarCobro(TENANT, id);
    expect(cobro?.estado).toBe("aprobado");
    expect(repo.auditoria.some((a) => a.toStatus === "aprobado" && a.actor === "webhook:akua")).toBe(
      true
    );
    // Ledger (Fase 3): al aprobar se asienta el movimiento balanceado.
    expect(await ledgerRepo.contarAsientosPorPago(TENANT, id)).toBe(1);
    expect(ledgerRepo.lines.filter((l) => l.account === `merchant_payable:${MERCHANT}`)).toHaveLength(
      1
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

  it("merchant.approved aprueba el comercio (Fase 5)", async () => {
    const m = await merchantsRepo.crear({
      tenantId: TENANT,
      legalName: "Comercio Demo",
      provider: "fake",
      providerMerchantId: "pm-1",
      estado: "en_revision"
    });
    await service.procesar({ id: "evt-m", type: "merchant.approved", providerMerchantId: "pm-1" });
    expect((await merchants.obtener(TENANT, m.id))?.estado).toBe("aprobado");
  });
});
