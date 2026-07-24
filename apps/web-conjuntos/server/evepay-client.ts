import { CobroSchema, type Cobro, type CrearCobroInput } from "@evetev/shared";

/**
 * Cliente HTTP hacia EvePay. La vertical consume la plataforma como lo haría un
 * comercio externo — SOLO por HTTP, nunca importando el módulo de pagos (§8, regla 3).
 * Esto es el dogfooding: si no la consumimos como cliente externo, no sabemos si
 * la plataforma sirve para clientes externos.
 *
 * (Cuando exista `packages/evepay-sdk`, este cliente se reemplaza por el SDK.)
 */
const EVEPAY_API_URL = process.env.NEXT_PUBLIC_EVEPAY_API_URL ?? "http://localhost:3001";

export async function crearCobro(
  input: CrearCobroInput,
  idempotencyKey: string
): Promise<Cobro> {
  const res = await fetch(`${EVEPAY_API_URL}/v1/pagos`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": idempotencyKey
    },
    body: JSON.stringify(input)
  });

  if (!res.ok) {
    throw new Error(`EvePay respondió ${res.status}`);
  }

  return CobroSchema.parse(await res.json());
}
