import {
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
  Req,
  UnauthorizedException
} from "@nestjs/common";
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
