import type {
  CrearCobroInput,
  EstadoCobro,
  PaymentProvider,
  ProviderCobro,
  RangoFechas,
  ResultadoConciliacion
} from "@evetev/shared";

/**
 * Implementación real sobre Akua (REST + JSON). ESTE es el único punto que habla
 * con Akua; el resto del núcleo solo conoce la interfaz PaymentProvider (§4).
 *
 * Estado: esqueleto. Los contratos exactos de campos (`POST /v1/payments`, mapeo
 * de estados, firma de webhooks) se fijan al obtener las sandbox keys `ak_test_`.
 * Ver docs/PLAN_DESARROLLO_EVEPAY.md §4.
 */
export class AkuaPaymentProvider implements PaymentProvider {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://api.akua.la/v1"
  ) {}

  async crearCobro(input: CrearCobroInput, idempotencyKey: string): Promise<ProviderCobro> {
    const res = await fetch(`${this.baseUrl}/payments`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
        // Idempotencia nativa de Akua: reenviamos la clave del cliente.
        "idempotency-key": idempotencyKey
      },
      body: JSON.stringify({
        amount: input.montoMinor,
        currency: input.moneda,
        reference: input.referencia,
        description: input.descripcion,
        merchant_id: input.merchantId
      })
    });

    if (!res.ok) {
      throw new Error(`Akua respondió ${res.status} al crear el cobro`);
    }

    // TODO(sandbox): confirmar nombres de campos reales de la respuesta de Akua.
    const data = (await res.json()) as {
      id: string;
      status?: string;
      checkout_url?: string;
    };

    return {
      providerPaymentId: data.id,
      estado: mapEstado(data.status),
      checkoutUrl: data.checkout_url
    };
  }

  async verificarEstado(providerPaymentId: string): Promise<EstadoCobro> {
    const res = await fetch(`${this.baseUrl}/payments/${providerPaymentId}`, {
      headers: { authorization: `Bearer ${this.apiKey}` }
    });
    if (!res.ok) {
      throw new Error(`Akua respondió ${res.status} al verificar el cobro`);
    }
    const data = (await res.json()) as { status?: string };
    return mapEstado(data.status);
  }

  async conciliar(_rango: RangoFechas): Promise<ResultadoConciliacion> {
    // Se implementa en Fase 4 contra /v1/settlements.
    throw new Error("Conciliación con Akua: pendiente (Fase 4).");
  }
}

/** Mapea el estado del proveedor a nuestra máquina de estados. */
function mapEstado(providerStatus: string | undefined): EstadoCobro {
  switch (providerStatus) {
    case "succeeded":
    case "approved":
      return "aprobado";
    case "failed":
      return "fallido";
    default:
      return "pendiente";
  }
}
