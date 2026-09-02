import type {
  CrearCobroInput,
  CrearMerchantInput,
  EstadoCobro,
  LiquidacionProvider,
  PaymentProvider,
  ProviderCobro,
  ProviderMerchant,
  RangoFechas
} from "@evetev/shared";

/**
 * Implementación real sobre ComboPay (API Recaudos beta, combopay.co). ESTE es
 * el único punto que habla con ComboPay; el resto del núcleo solo conoce la
 * interfaz PaymentProvider (§4). Spec: specs/evepay/provider-combopay/.
 *
 * Auth: Bearer token estático del dashboard de ComboPay (Perfil → Claves API).
 * Flujo: facturas con enlace de pago (POST /api/invoice-company-customer) —
 * ComboPay hostea el checkout (PSE/TC/efectivo); nunca tocamos el PAN (§4).
 *
 * Diferencias con Akua que definen esta clase:
 * - No hay header de idempotencia: el campo `invoice` personalizado hace las
 *   veces — si se reenvía y la factura sigue pendiente, ComboPay actualiza en
 *   vez de duplicar. Enviamos la clave de idempotencia de EvePay como invoice.
 * - El token pertenece a UN comercio: EvePay opera como agregador con la
 *   cuenta de Evetev; no existe alta de comercios por API (CA-9).
 * - La beta de recaudos solo transa COP (CA-3) y no expone settlements (CA-8).
 */
export class ComboPayPaymentProvider implements PaymentProvider {
  private readonly baseUrl: string;

  constructor(
    private readonly apiToken: string,
    baseUrl?: string
  ) {
    this.baseUrl = baseUrl ?? "https://api-gateway.combopay.co";
  }

  private headers(): Record<string, string> {
    return {
      authorization: `Bearer ${this.apiToken}`,
      "content-type": "application/json",
      accept: "application/json"
    };
  }

  async crearCobro(input: CrearCobroInput, idempotencyKey: string): Promise<ProviderCobro> {
    if (input.moneda !== "COP") {
      throw new Error(
        `ComboPay (Recaudos beta) solo transa COP; se recibió ${input.moneda} (CA-3).`
      );
    }

    const res = await fetch(`${this.baseUrl}/api/invoice-company-customer`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        // Para COP, montoMinor es el valor face (sin centavos): va tal cual.
        value: input.montoMinor,
        description: input.descripcion ?? input.referencia,
        // invoice personalizado = clave de idempotencia: un reintento con la
        // misma clave ACTUALIZA la factura pendiente en vez de duplicarla.
        // TODO(sandbox): confirmar el comportamiento si la factura ya se pagó.
        invoice: idempotencyKey
      })
    });

    if (!res.ok) {
      throw new Error(`ComboPay respondió ${res.status} al crear la factura`);
    }

    // TODO(sandbox): confirmar campos exactos; la doc muestra id numérico,
    // payment_link y status 0/1/2. Un body con `error` llega con HTTP 200.
    const data = (await res.json()) as {
      id?: number | string;
      payment_link?: string;
      status?: number;
      error?: string;
    };

    if (data.error !== undefined || data.id === undefined) {
      throw new Error(`ComboPay rechazó la factura: ${data.error ?? "respuesta sin id"}`);
    }

    return {
      providerPaymentId: String(data.id),
      estado: mapStatusFactura(data.status),
      checkoutUrl: data.payment_link || undefined
    };
  }

  async verificarEstado(providerPaymentId: string): Promise<EstadoCobro> {
    const res = await fetch(
      `${this.baseUrl}/api/invoice/${encodeURIComponent(providerPaymentId)}/status`,
      { headers: this.headers() }
    );
    if (!res.ok) {
      throw new Error(`ComboPay respondió ${res.status} al consultar la factura`);
    }
    const data = (await res.json()) as { transaction_state?: string; error?: string };
    // Factura sin transacción todavía: ComboPay responde error descriptivo;
    // para nuestra máquina de estados eso sigue siendo un cobro pendiente.
    return mapTransactionState(data.transaction_state);
  }

  async listarLiquidaciones(_rango: RangoFechas): Promise<LiquidacionProvider[]> {
    // CA-8: fallar fuerte antes que producir un reporte de conciliación falso
    // con una lista vacía inventada.
    throw new Error(
      "ComboPay (Recaudos beta) no expone liquidaciones por API; " +
        "conciliar con el reporte de transacciones de su dashboard."
    );
  }

  async crearMerchant(_input: CrearMerchantInput): Promise<ProviderMerchant> {
    // CA-9: el alta de comercios en ComboPay es manual (su dashboard). EvePay
    // opera como agregador con la cuenta ComboPay de Evetev.
    throw new Error(
      "ComboPay no expone alta de comercios por API; el alta es manual en su dashboard."
    );
  }
}

/**
 * Estado de la factura al crearla: 0 = pendiente, 1 = pagada, 2 = en proceso
 * de pago (PSE). Una factura recién creada siempre debería ser 0.
 */
function mapStatusFactura(status: number | undefined): EstadoCobro {
  switch (status) {
    case 1:
      return "aprobado";
    default:
      return "pendiente";
  }
}

/**
 * transaction_state de /api/invoice/{id}/status y del hook (CA-4):
 * payment_approved → aprobado; payment_fail → fallido; payment_pending,
 * ausente o desconocido → pendiente.
 */
export function mapTransactionState(state: string | undefined): EstadoCobro {
  switch (state) {
    case "payment_approved":
      return "aprobado";
    case "payment_fail":
      return "fallido";
    default:
      return "pendiente";
  }
}
