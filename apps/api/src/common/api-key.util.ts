import { createHash, randomBytes } from "node:crypto";

export type ApiKeyEnv = "live" | "test";

export interface GeneratedApiKey {
  /** Clave completa — mostrar UNA SOLA VEZ al comercio; nunca guardar. */
  key: string;
  /** SHA-256 hex — lo que se almacena en DB. */
  hash: string;
  /** Primeros 16 caracteres — para mostrar en la UI sin exponer la clave. */
  prefix: string;
}

export function generateApiKey(env: ApiKeyEnv): GeneratedApiKey {
  const random = randomBytes(32).toString("base64url");
  const key = `evpk_${env}_${random}`;
  return { key, hash: hashApiKey(key), prefix: key.slice(0, 16) };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}
