import { randomUUID } from "node:crypto";
import type {
  Cobro,
  CrearCobroInput,
  EstadoCobro,
  PaymentProvider,
  RangoFechas,
  ResultadoConciliacion
} from "@evetev/shared";

/**
 * Implementación *fake* de PaymentProvider para local y tests (§7).
 * Akua es la implementación real; se enchufa sin tocar el núcleo cuando queda
 * certificada. El núcleo NUNCA importa el SDK del proveedor directamente (§4).
 */
export class FakePaymentProvider implements PaymentProvider {
  async crearCobro(input: CrearCobroInput, _idempotencyKey: string): Promise<Cobro> {
    return {
      id: randomUUID(),
      merchantId: input.merchantId,
      montoMinor: input.montoMinor,
      moneda: input.moneda,
      referencia: input.referencia,
      estado: "pendiente",
      checkoutUrl: `https://checkout.fake.evetev.local/${randomUUID()}`,
      creadoEn: new Date().toISOString()
    };
  }

  async verificarEstado(_cobroId: string): Promise<EstadoCobro> {
    return "aprobado";
  }

  async conciliar(rango: RangoFechas): Promise<ResultadoConciliacion> {
    return { rango, cobrosConciliados: 0, diferencias: 0 };
  }
}
