import { createHmac, timingSafeEqual } from "node:crypto";

/** Headers de Akua necesarios para verificar la firma del webhook. */
export interface WebhookHeaders {
  id?: string;
  timestamp?: string;
  signature?: string;
}

/** Verifica la autenticidad de un webhook (la firma es la única auth, §4). */
export interface WebhookVerifier {
  verificar(rawBody: Buffer, headers: WebhookHeaders): boolean;
}

export const WEBHOOK_VERIFIER = Symbol("WEBHOOK_VERIFIER");

/**
 * Verificación HMAC-SHA256 compatible con Svix (infraestructura de Akua).
 *
 * Spec: secret = "whsec_<base64>" → clave = base64_decode(parte_sin_prefijo).
 * Payload firmado = "{id}.{timestamp}.{rawBody}".
 * Firma esperada = "v1," + base64(HMAC-SHA256(clave, payload)).
 * Rechaza si el timestamp tiene > 5 min de drift (previene replay).
 */
export class AkuaWebhookVerifier implements WebhookVerifier {
  constructor(private readonly secret: string) {}

  verificar(rawBody: Buffer, headers: WebhookHeaders): boolean {
    if (!headers.id || !headers.timestamp || !headers.signature || !this.secret) {
      return false;
    }

    // Reject stale timestamps to prevent replay attacks.
    const ts = Number(headers.timestamp);
    if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
      return false;
    }

    // Secret format: "whsec_<base64>" — strip prefix, base64-decode to get key bytes.
    const secretPart = this.secret.startsWith("whsec_")
      ? this.secret.slice("whsec_".length)
      : this.secret;
    const key = Buffer.from(secretPart, "base64");

    const payload = `${headers.id}.${headers.timestamp}.${rawBody.toString("utf8")}`;
    const expectedSig = createHmac("sha256", key).update(payload).digest("base64");
    const expectedFull = Buffer.from(`v1,${expectedSig}`);

    // Header may contain multiple space-separated sigs; accept any valid one.
    for (const sig of headers.signature.split(" ")) {
      const candidate = Buffer.from(sig);
      if (candidate.length === expectedFull.length && timingSafeEqual(candidate, expectedFull)) {
        return true;
      }
    }
    return false;
  }
}
