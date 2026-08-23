import { createHmac, randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";

export interface WebhookPayload {
  tenantId: string;
  type: "payment.completed" | "payment.failed";
  data: {
    paymentId: string;
    reference: string;
    amountMinor: number;
    currency: string;
    estado: string;
  };
}

const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1_000, 5_000, 25_000];

/**
 * Firma y entrega webhooks salientes a comercios.
 * Reintenta hasta 3 veces con backoff (1s, 5s, 25s).
 * Se llama con void (fire-and-forget) desde WebhooksService.
 */
@Injectable()
export class OutboundWebhookDeliveryService {
  private readonly logger = new Logger(OutboundWebhookDeliveryService.name);

  /**
   * Construye y envía el evento al comercio. Llama sin await para no bloquear.
   */
  async entregar(url: string, secret: string, payload: WebhookPayload): Promise<void> {
    const deliveryId = randomUUID();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({
      id: deliveryId,
      created: Number(timestamp),
      type: payload.type,
      data: payload.data
    });

    const signature = this.firmar(secret, timestamp, body);
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "evepay-event": payload.type,
      "evepay-delivery-id": deliveryId,
      "evepay-signature": `t=${timestamp},v1=${signature}`
    };

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body,
          signal: AbortSignal.timeout(TIMEOUT_MS)
        });

        if (response.ok) {
          this.logger.log(`Webhook entregado a ${url} (intento ${attempt + 1})`);
          return;
        }

        this.logger.warn(`Webhook a ${url} respondió ${response.status} (intento ${attempt + 1})`);
      } catch (err) {
        this.logger.warn(`Webhook a ${url} falló (intento ${attempt + 1}): ${String(err)}`);
      }

      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
      }
    }

    this.logger.error(
      `Webhook a ${url} falló después de ${MAX_RETRIES} intentos para delivery ${deliveryId}`
    );
  }

  private firmar(secret: string, timestamp: string, body: string): string {
    const payload = `${timestamp}.${body}`;
    return createHmac("sha256", secret).update(payload).digest("hex");
  }
}
