import type {
  CapacidadesProvider,
  CrearCobroInput,
  CrearMerchantInput,
  EstadoCobro,
  EstadoMerchant,
  LiquidacionProvider,
  PaymentProvider,
  ProviderCobro,
  ProviderMerchant,
  RangoFechas,
  SaludProvider
} from "@evetev/shared";

/**
 * Implementación real sobre Akua (REST + JSON). ESTE es el único punto que habla
 * con Akua; el resto del núcleo solo conoce la interfaz PaymentProvider (§4).
 *
 * Auth: OAuth2 client_credentials → Bearer token en caché, renovado al expirar.
 * Flujo de pagos: Payment Links (POST /v1/links) — Akua hostea el checkout; nunca
 * tocamos el PAN (§4).
 * Sandbox: AKUA_BASE_URL=https://sandbox.akua.la; en producción omitir esa var.
 */
export class AkuaPaymentProvider implements PaymentProvider {
  readonly nombre = "akua";
  /** Plataforma completa: onboarding y settlements por API. */
  readonly capacidades: CapacidadesProvider = {
    altaDeComercios: true,
    liquidaciones: true,
    monedas: ["COP", "USD"]
  };

  private readonly baseUrl: string;

  // Token cache: se renueva cuando expira (con 60 s de margen).
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    baseUrl?: string
  ) {
    this.baseUrl = baseUrl ?? "https://api.akua.la";
  }

  /** Obtiene (o reutiliza) el Bearer token via client_credentials. */
  private async bearerToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        audience: this.baseUrl
      })
    });

    if (!res.ok) {
      throw new Error(`Akua OAuth falló con ${res.status}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      expires_in?: number;
    };

    this.cachedToken = data.access_token;
    // expires_in en segundos; renovar 60 s antes de que venza.
    const ttl = (data.expires_in ?? 3600) - 60;
    this.tokenExpiresAt = Date.now() + ttl * 1000;

    return this.cachedToken;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    return {
      authorization: `Bearer ${await this.bearerToken()}`,
      "client-id": this.clientId,
      "content-type": "application/json"
    };
  }

  async crearCobro(input: CrearCobroInput, idempotencyKey: string): Promise<ProviderCobro> {
    const res = await fetch(`${this.baseUrl}/v1/links`, {
      method: "POST",
      headers: {
        ...(await this.authHeaders()),
        "idempotency-key": idempotencyKey
      },
      body: JSON.stringify({
        type: "payment",
        expires_in: 3600,
        data: {
          amount: {
            // montoMinor en unidad mínima: para COP (sin centavos) es el valor face.
            // TODO(sandbox): confirmar si Akua espera entero o decimal para COP.
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
      headers: await this.authHeaders()
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
      headers: await this.authHeaders()
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

  /**
   * Salud: pide un token OAuth nuevo. Eso valida credenciales y conectividad
   * sin tocar ningún recurso. Se salta la caché a propósito: un token guardado
   * diría que todo va bien aunque las credenciales ya se hubieran revocado,
   * que es justo el caso que esta comprobación existe para detectar.
   */
  async verificarSalud(): Promise<SaludProvider> {
    const inicio = Date.now();
    const cerrar = (ok: boolean, detalle: string): SaludProvider => ({
      ok,
      detalle,
      duracionMs: Date.now() - inicio,
      verificadoEn: new Date().toISOString()
    });

    if (!this.clientId || !this.clientSecret) {
      return cerrar(false, "Faltan AKUA_CLIENT_ID o AKUA_CLIENT_SECRET.");
    }

    this.cachedToken = null;
    this.tokenExpiresAt = 0;

    try {
      await this.bearerToken();
      return cerrar(true, `Akua respondió y emitió un token (${this.baseUrl}).`);
    } catch (error) {
      return cerrar(
        false,
        error instanceof Error ? error.message : `No se pudo contactar ${this.baseUrl}.`
      );
    }
  }

  async crearMerchant(input: CrearMerchantInput): Promise<ProviderMerchant> {
    const res = await fetch(`${this.baseUrl}/v1/merchants`, {
      method: "POST",
      headers: await this.authHeaders(),
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
 * "active" = pendiente de pago; "used" = pagado; "expired" = venció sin pagar.
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
