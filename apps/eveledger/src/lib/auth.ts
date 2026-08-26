import { cookies } from "next/headers";

// Sesión simple con cookie firmada (HMAC-SHA256 vía Web Crypto, válido en
// edge/proxy y en Node). Valor: `${expiryMs}.${firmaHex}`.

export const SESSION_COOKIE = "eveledger_session";
const DURACION_MS = 1000 * 60 * 60 * 12; // 12 horas

function secreto(): string {
  return process.env.AUTH_SECRET ?? "dev-secret-eveledger";
}

async function clave(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secreto()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function aHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function firmar(valor: string): Promise<string> {
  const key = await clave();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(valor));
  return aHex(sig);
}

/** Crea el valor de la cookie de sesión. */
export async function crearValorSesion(): Promise<string> {
  const exp = String(Date.now() + DURACION_MS);
  return `${exp}.${await firmar(exp)}`;
}

/** Verifica el valor de la cookie (firma y expiración). Edge-safe. */
export async function verificarValorSesion(valor: string | undefined): Promise<boolean> {
  if (!valor) return false;
  const idx = valor.lastIndexOf(".");
  if (idx <= 0) return false;
  const exp = valor.slice(0, idx);
  const firma = valor.slice(idx + 1);
  if (!/^\d+$/.test(exp)) return false;
  if (Number(exp) < Date.now()) return false;
  const esperada = await firmar(exp);
  // Comparación en tiempo constante (mismo largo si la firma es íntegra).
  if (esperada.length !== firma.length) return false;
  let diff = 0;
  for (let i = 0; i < esperada.length; i++) {
    diff |= esperada.charCodeAt(i) ^ firma.charCodeAt(i);
  }
  return diff === 0;
}

/** true si hay sesión válida (para uso en páginas/acciones de servidor). */
export async function sesionActiva(): Promise<boolean> {
  const store = await cookies();
  return verificarValorSesion(store.get(SESSION_COOKIE)?.value);
}
