import { Inject, Injectable } from "@nestjs/common";
import type { CrearMerchantInput, Merchant, PaymentProvider } from "@evetev/shared";
import { PAYMENT_PROVIDER } from "../pagos/payment-provider.token";
import { MERCHANTS_REPOSITORY, type MerchantsRepository } from "./merchants.repository";

/** Onboarding de comercios (§8: identidad/merchants del núcleo). */
@Injectable()
export class MerchantsService {
  private readonly providerName = process.env.PAYMENT_PROVIDER === "akua" ? "akua" : "fake";

  constructor(
    @Inject(MERCHANTS_REPOSITORY) private readonly repo: MerchantsRepository,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider
  ) {}

  /** Da de alta el comercio en el proveedor y lo persiste (queda en revisión). */
  async registrar(tenantId: string, input: CrearMerchantInput): Promise<Merchant> {
    const prov = await this.provider.crearMerchant(input);
    return this.repo.crear({
      tenantId,
      legalName: input.legalName,
      provider: this.providerName,
      providerMerchantId: prov.providerMerchantId,
      estado: prov.estado
    });
  }

  async obtener(tenantId: string, merchantId: string): Promise<Merchant | null> {
    return this.repo.buscar(tenantId, merchantId);
  }

  /** Aprueba un comercio a partir del evento del proveedor (webhook merchant.approved). */
  async aprobarPorProvider(providerMerchantId: string): Promise<void> {
    const m = await this.repo.resolverPorProvider(providerMerchantId);
    if (!m) {
      return; // comercio desconocido → sin efecto
    }
    if (m.estado === "aprobado" || m.estado === "rechazado") {
      return; // ya en estado final → idempotente
    }
    await this.repo.aplicarEstado(m.tenantId, m.merchantId, "aprobado");
  }
}
