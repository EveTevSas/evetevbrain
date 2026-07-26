import { randomUUID } from "node:crypto";
import type {
  CrearCobroInput,
  EstadoCobro,
  LiquidacionProvider,
  PaymentProvider,
  ProviderCobro,
  RangoFechas
} from "@evetev/shared";

/**
 * Implementación *fake* de PaymentProvider para local y tests (§7).
 * Akua es la implementación real; se enchufa sin tocar el núcleo cuando queda
 * certificada. El núcleo NUNCA importa el SDK del proveedor directamente (§4).
 */
export class FakePaymentProvider implements PaymentProvider {
  async crearCobro(_input: CrearCobroInput, _idempotencyKey: string): Promise<ProviderCobro> {
    const providerPaymentId = randomUUID();
    return {
      providerPaymentId,
      estado: "pendiente",
      checkoutUrl: `https://checkout.fake.evetev.local/${providerPaymentId}`
    };
  }

  async verificarEstado(_providerPaymentId: string): Promise<EstadoCobro> {
    return "aprobado";
  }

  async listarLiquidaciones(_rango: RangoFechas): Promise<LiquidacionProvider[]> {
    return [];
  }
}
