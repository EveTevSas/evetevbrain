import { createHmac, timingSafeEqual } from "node:crypto";

/** Verifica la autenticidad de un webhook (la firma es la única auth, §4). */
export interface WebhookVerifier {
  verificar(rawBody: Buffer, signature: string | undefined): boolean;
}

export const WEBHOOK_VERIFIER = Symbol("WEBHOOK_VERIFIER");

/**
 * Verificación HMAC-SHA256 del cuerpo crudo con el secreto del proveedor,
 * comparación en tiempo constante. El header/scheme exacto de Akua se confirma
 * con el sandbox; esta es la forma estándar.
 */
export class AkuaWebhookVerifier implements WebhookVerifier {
  constructor(private readonly secret: string) {}

  verificar(rawBody: Buffer, signature: string | undefined): boolean {
    if (!signature || !this.secret) {
      return false;
    }
    const esperado = createHmac("sha256", this.secret).update(rawBody).digest("hex");
    const a = Buffer.from(esperado);
    const b = Buffer.from(signature);
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  }
}
