import { randomUUID } from "node:crypto";
import type {
  CapacidadesProvider,
  CrearCobroInput,
  CrearMerchantInput,
  EstadoCobro,
  LiquidacionProvider,
  PaymentProvider,
  ProviderCobro,
  ProviderMerchant,
  RangoFechas,
  SaludProvider
} from "@evetev/shared";

/**
 * Implementación *fake* de PaymentProvider para local y tests (§7).
 * Akua es la implementación real; se enchufa sin tocar el núcleo cuando queda
 * certificada. El núcleo NUNCA importa el SDK del proveedor directamente (§4).
 */
export class FakePaymentProvider implements PaymentProvider {
  readonly nombre = "fake";
  /** El fake lo puede todo: así los tests ejercitan los caminos completos. */
  readonly capacidades: CapacidadesProvider = {
    altaDeComercios: true,
    liquidaciones: true,
    monedas: ["COP", "USD"]
  };

  /** No hay nada externo que comprobar: el fake siempre está sano. */
  async verificarSalud(): Promise<SaludProvider> {
    return {
      ok: true,
      detalle: "Proveedor simulado: no hay servicio externo que comprobar.",
      duracionMs: 0,
      verificadoEn: new Date().toISOString()
    };
  }

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

  async crearMerchant(_input: CrearMerchantInput): Promise<ProviderMerchant> {
    return { providerMerchantId: randomUUID(), estado: "en_revision" };
  }
}
