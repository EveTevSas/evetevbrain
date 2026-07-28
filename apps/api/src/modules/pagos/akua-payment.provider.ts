import type {
  CrearCobroInput,
  CrearMerchantInput,
  EstadoCobro,
  EstadoMerchant,
  LiquidacionProvider,
  PaymentProvider,
  ProviderCobro,
  ProviderMerchant,
  RangoFechas
} from "@evetev/shared";

/**
 * Implementación real sobre Akua (REST + JSON). ESTE es el único punto que habla
 * con Akua; el resto del núcleo solo conoce la interfaz PaymentProvider (§4).
 *
 * Flujo de pagos: Payment Links (POST /v1/links) — Akua hostea el checkout; nunca
 * tocamos el PAN (§4). Auth: Bearer token + Client-Id header en cada request.
 * Sandbox: AKUA_BASE_URL=https://sandbox.prod.akua.la; producción sin esa var.
 */
export class AkuaPaymentProvider implements PaymentProvider {
  constructor(
    private readonly apiKey: string,
    private readonly clientId: string,
    baseUrl?: string
  ) {
    this.baseUrl = baseUrl ?? "https://api.akua.la";
  }

  private readonly baseUrl: string;

  private authHeaders(): Record<string, string> {
    return {
      authorization: `Bearer ${this.apiKey}`,
      "client-id": this.clientId,
      "content-type": "application/json"
    };
  }

  async crearCobro(input: CrearCobroInput, idempotencyKey: string): Promise<ProviderCobro> {
    const res = await fetch(`${this.baseUrl}/v1/links`, {
      method: "POST",
      headers: {
        ...this.authHeaders(),
        "idempotency-key": idempotencyKey
      },
      body: JSON.stringify({
        type: "payment",
        expires_in: 3600,
        data: {
          amount: {
            // montoMinor es en la unidad mínima: para COP (sin centavos) es el
            // valor face; para USD dividir por 100. TODO(sandbox): confirmar.
            value: input.montoMinor,
            currency: input.moneda
          },
          description: input.descripcion ?? input.referencia,
          reference: input.referencia,
          merchant_id: input.merchantId
        },
        metadata: { "3ds": true }
      })
    });

    if (!res.ok) {
      throw new Error(`Akua respondió ${res.status} al crear el link de cobro`);
    }

    // TODO(sandbox): confirmar campos exactos de la respuesta.
    const data = (await res.json()) as {
      id: string;
      url?: string;
      status?: string;
    };

    return {
      providerPaymentId: data.id,
      estado: mapEstadoLink(data.status),
      checkoutUrl: data.url
    };
  }

  async verificarEstado(providerPaymentId: string): Promise<EstadoCobro> {
    const res = await fetch(`${this.baseUrl}/v1/links/${providerPaymentId}`, {
      headers: this.authHeaders()
    });
    if (!res.ok) {
      throw new Error(`Akua respondió ${res.status} al verificar el link`);
    }
    const data = (await res.json()) as { status?: string };
    return mapEstadoLink(data.status);
  }

  async listarLiquidaciones(_rango: RangoFechas): Promise<LiquidacionProvider[]> {
    // TODO(sandbox): confirmar endpoint y campos de settlements en Akua.
    const res = await fetch(`${this.baseUrl}/v1/settlements`, {
      headers: this.authHeaders()
    });
    if (!res.ok) {
      throw new Error(`Akua respondió ${res.status} al listar liquidaciones`);
    }
    const data = (await res.json()) as {
      settlements?: Array<{ payment_id: string; amount: number }>;
    };
    return (data.settlements ?? []).map((s) => ({
      providerPaymentId: s.payment_id,
      montoMinor: s.amount
    }));
  }

  async crearMerchant(input: CrearMerchantInput): Promise<ProviderMerchant> {
    const res = await fetch(`${this.baseUrl}/v1/merchants`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify({ legal_name: input.legalName })
    });
    if (!res.ok) {
      throw new Error(`Akua respondió ${res.status} al crear el comercio`);
    }
    const data = (await res.json()) as { id: string; status?: string };
    return { providerMerchantId: data.id, estado: mapEstadoMerchant(data.status) };
  }
}

/**
 * Mapea el estado del link de Akua a nuestra máquina de estados.
 * "active" = link creado pero aún no pagado; "used" = pago exitoso; "expired" = venció.
 */
function mapEstadoLink(providerStatus: string | undefined): EstadoCobro {
  switch (providerStatus) {
    case "used":
      return "aprobado";
    case "expired":
      return "fallido";
    default:
      return "pendiente";
  }
}

function mapEstadoMerchant(providerStatus: string | undefined): EstadoMerchant {
  switch (providerStatus) {
    case "approved":
      return "aprobado";
    case "rejected":
      return "rechazado";
    default:
      return "en_revision";
  }
}
