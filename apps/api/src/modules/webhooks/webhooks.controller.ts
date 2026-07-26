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
   * POST /v1/webhooks/akua — recibe eventos de Akua. La auth es la FIRMA (§4),
   * no el tenant. Responde 200 salvo firma inválida (401) para que Akua no reintente.
   */
  @Post("akua")
  @HttpCode(200)
  async akua(
    @Req() req: RawBodyReq,
    @Headers("x-akua-signature") signature?: string
  ): Promise<{ received: boolean }> {
    const raw = req.rawBody;
    if (!raw || !this.verifier.verificar(raw, signature)) {
      throw new UnauthorizedException("Firma de webhook inválida.");
    }

    const evento = parseEvento(raw);
    if (evento) {
      await this.webhooks.procesar(evento);
    }
    return { received: true };
  }
}

/** Extrae el evento del cuerpo crudo. Devuelve null si está malformado. */
function parseEvento(raw: Buffer): EventoWebhook | null {
  try {
    const obj = JSON.parse(raw.toString("utf8")) as {
      id?: unknown;
      type?: unknown;
      data?: { payment_id?: unknown };
    };
    if (
      typeof obj.id === "string" &&
      typeof obj.type === "string" &&
      typeof obj.data?.payment_id === "string"
    ) {
      return { id: obj.id, type: obj.type, providerPaymentId: obj.data.payment_id };
    }
  } catch {
    // cuerpo no-JSON o inesperado
  }
  return null;
}
