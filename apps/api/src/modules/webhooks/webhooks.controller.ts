import {
  Controller,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  UnauthorizedException
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import { WEBHOOK_VERIFIER, type WebhookVerifier } from "./webhook-verifier";
import { WebhooksService, type EventoWebhook } from "./webhooks.service";

/** Request con el cuerpo crudo (Nest con rawBody: true). */
interface RawBodyReq {
  rawBody?: Buffer;
}

@Controller("webhooks")
export class WebhooksController {
  constructor(
    @Inject(WEBHOOK_VERIFIER) private readonly verifier: WebhookVerifier,
    private readonly webhooks: WebhooksService
  ) {}

  /**
   * POST /v1/webhooks/akua — recibe eventos de Akua (Svix). La auth es la FIRMA
   * (§4), no el tenant. Responde 200 salvo firma inválida (401).
   */
  @Post("akua")
  @HttpCode(200)
  async akua(
    @Req() req: RawBodyReq,
    @Headers("akua-wh-id") whId?: string,
    @Headers("akua-wh-timestamp") whTimestamp?: string,
    @Headers("akua-wh-signature") whSignature?: string
  ): Promise<{ received: boolean }> {
    const raw = req.rawBody;
    if (
      !raw ||
      !this.verifier.verificar(raw, {
        id: whId,
        timestamp: whTimestamp,
        signature: whSignature
      })
    ) {
      throw new UnauthorizedException("Firma de webhook inválida.");
    }

    const evento = parseEvento(raw);
    if (evento) {
      await this.webhooks.procesar(evento);
    }
    return { received: true };
  }

  /**
   * POST /v1/webhooks/combopay/:secreto — recibe la notificación hook de
   * ComboPay. ComboPay no firma sus hooks, así que la auth es un secreto en la
   * ruta (COMBOPAY_WEBHOOK_SECRET), comparado en tiempo constante (CA-6 de
   * provider-combopay). Esa URL completa es la que se registra en su dashboard
   * (Perfil → URL de notificación hook).
   */
  @Post("combopay/:secreto")
  @HttpCode(200)
  async combopay(
    @Req() req: RawBodyReq,
    @Param("secreto") secreto: string
  ): Promise<{ received: boolean }> {
    const esperado = process.env.COMBOPAY_WEBHOOK_SECRET ?? "";
    if (!esperado || !igualesEnTiempoConstante(secreto, esperado)) {
      throw new UnauthorizedException("Secreto de webhook inválido.");
    }

    const evento = req.rawBody ? parseEventoComboPay(req.rawBody) : null;
    if (evento) {
      await this.webhooks.procesar(evento);
    }
    return { received: true };
  }
}

function igualesEnTiempoConstante(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/**
 * Extrae el evento del cuerpo crudo usando la estructura real de Akua:
 * { id, type, data: { payment: { id, link?: { id }, merchant?: { id } } } }
 */
function parseEvento(raw: Buffer): EventoWebhook | null {
  try {
    const obj = JSON.parse(raw.toString("utf8")) as {
      id?: unknown;
      type?: unknown;
      data?: {
        payment?: {
          id?: unknown;
          link?: { id?: unknown };
          merchant?: { id?: unknown };
        };
        merchant?: { id?: unknown };
      };
    };
    if (typeof obj.id !== "string" || typeof obj.type !== "string") {
      return null;
    }
    const evento: EventoWebhook = { id: obj.id, type: obj.type };

    const payment = obj.data?.payment;
    if (payment) {
      // Prefer link.id (matches providerPaymentId we stored on cobro creation).
      // TODO(sandbox): confirm that data.payment.link.id === the link id we stored.
      const paymentRef = payment.link?.id ?? payment.id;
      if (typeof paymentRef === "string") {
        evento.providerPaymentId = paymentRef;
      }
      if (typeof payment.merchant?.id === "string") {
        evento.providerMerchantId = payment.merchant.id;
      }
    }

    // merchant.created event carries data.merchant.id
    if (!evento.providerMerchantId && typeof obj.data?.merchant?.id === "string") {
      evento.providerMerchantId = obj.data.merchant.id;
    }

    return evento;
  } catch {
    // cuerpo no-JSON o inesperado
  }
  return null;
}

/**
 * Extrae el evento del hook de ComboPay (Recaudos beta):
 * { id, transaction_state, ticket_id?, unique_transaction_code?, ... }
 * donde `id` es el id de la factura (= providerPaymentId que guardamos al
 * crear el cobro) y transaction_state ∈ {payment_approved, payment_fail}.
 * Los campos nulos no se envían, por eso todo se trata como opcional.
 */
function parseEventoComboPay(raw: Buffer): EventoWebhook | null {
  try {
    const obj = JSON.parse(raw.toString("utf8")) as {
      id?: unknown;
      transaction_state?: unknown;
      ticket_id?: unknown;
      unique_transaction_code?: unknown;
    };
    if (typeof obj.transaction_state !== "string") {
      return null;
    }
    const invoiceId =
      typeof obj.id === "string" || typeof obj.id === "number" ? String(obj.id) : null;
    if (!invoiceId) {
      return null;
    }

    // Id del evento para la idempotencia (CA-7): ticket_id, o el CUS, o en su
    // defecto factura+estado (un reenvío del mismo hook produce el mismo id).
    const ticketId = typeof obj.ticket_id === "string" ? obj.ticket_id : null;
    const cus =
      typeof obj.unique_transaction_code === "string" ? obj.unique_transaction_code : null;
    const eventId = ticketId ?? cus ?? `${invoiceId}:${obj.transaction_state}`;

    return {
      id: eventId,
      type: obj.transaction_state,
      provider: "combopay",
      providerPaymentId: invoiceId
    };
  } catch {
    // cuerpo no-JSON o inesperado
  }
  return null;
}
