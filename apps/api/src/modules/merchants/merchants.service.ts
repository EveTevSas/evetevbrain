import { Inject, Injectable } from "@nestjs/common";
import type { CrearMerchantInput, Merchant, PaymentProvider } from "@evetev/shared";
import { PAYMENT_PROVIDER } from "../pagos/payment-provider.token";
import { MERCHANTS_REPOSITORY, type MerchantsRepository } from "./merchants.repository";

/** Resultado del alta: el comercio y, si aplica, lo que queda por hacer a mano. */
export interface RegistroMerchant {
  merchant: Merchant;
  /**
   * Qué falta hacer fuera de EvePay, o null si no falta nada. Se llena cuando
   * el proveedor no da de alta comercios por API (CA-8 de admin-console).
   */
  pasoManualProveedor: string | null;
}

/** Onboarding de comercios (§8: identidad/merchants del núcleo). */
@Injectable()
export class MerchantsService {
  constructor(
    @Inject(MERCHANTS_REPOSITORY) private readonly repo: MerchantsRepository,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider
  ) {}

  /**
   * Da de alta el comercio en el proveedor y lo persiste (queda en revisión).
   *
   * Con un proveedor agregador (ComboPay) no hay alta por API: el comercio se
   * crea igual en EvePay —que es donde vive su tenant, sus claves y su ledger—
   * y se devuelve el paso que queda pendiente en el panel del proveedor. Fallar
   * el alta completa dejaría a EvePay sin poder operar a un comercio por una
   * gestión que ni siquiera es suya.
   */
  async registrar(tenantId: string, input: CrearMerchantInput): Promise<RegistroMerchant> {
    // El nombre lo dice el proveedor, no la variable de entorno: así el
    // histórico conserva quién procesó qué aunque después se cambie de
    // proveedor (CA-14 de admin-console).
    const provider = this.provider.nombre;

    if (!this.provider.capacidades.altaDeComercios) {
      const merchant = await this.repo.crear({
        tenantId,
        legalName: input.legalName,
        provider,
        providerMerchantId: null,
        estado: "en_revision"
      });
      return {
        merchant,
        pasoManualProveedor: `${provider} no da de alta comercios por API: registra este comercio en su panel y guarda su identificador.`
      };
    }

    const prov = await this.provider.crearMerchant(input);
    const merchant = await this.repo.crear({
      tenantId,
      legalName: input.legalName,
      provider,
      providerMerchantId: prov.providerMerchantId,
      estado: prov.estado
    });
    return { merchant, pasoManualProveedor: null };
  }

  async obtener(tenantId: string, merchantId: string): Promise<Merchant | null> {
    return this.repo.buscar(tenantId, merchantId);
  }

  async obtenerPorTenant(tenantId: string): Promise<Merchant | null> {
    return this.repo.buscarPorTenant(tenantId);
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
