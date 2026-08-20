import { createHmac, timingSafeEqual } from "node:crypto";

/** Token de sesion firmado.
 *
 *  **No es autenticacion y no lo pretende**: cualquiera puede pedir uno en
 *  `/api/sesion`. Lo que hace es obligar a dos viajes en vez de uno y dar una
 *  identidad estable a la que colgarle el cupo, que es lo que frena el guion
 *  ingenuo que golpea `/api/chat` en bucle. Lo dice aqui para que nadie lo
 *  confunda con una puerta. */
const VIGENCIA_MS = 30 * 60 * 1000;

export function emitirSesion(secreto: string, ahora = Date.now()): string {
  const expira = ahora + VIGENCIA_MS;
  const semilla = Math.random().toString(36).slice(2, 10);
  const carga = `${expira}.${semilla}`;
  return `${carga}.${firmar(secreto, carga)}`;
}

export type Sesion = { valida: true; id: string } | { valida: false; motivo: string };

export function verificarSesion(
  token: string | undefined,
  secreto: string,
  ahora = Date.now()
): Sesion {
  if (!token) return { valida: false, motivo: "sin_sesion" };
  const partes = token.split(".");
  if (partes.length !== 3) return { valida: false, motivo: "sesion_malformada" };

  const [expira, semilla, firma] = partes as [string, string, string];
  const carga = `${expira}.${semilla}`;
  if (!iguales(firma, firmar(secreto, carga))) return { valida: false, motivo: "firma_invalida" };
  if (Number(expira) < ahora) return { valida: false, motivo: "sesion_vencida" };

  return { valida: true, id: semilla };
}

function firmar(secreto: string, carga: string): string {
  return createHmac("sha256", secreto).update(carga).digest("base64url");
}

/** Comparacion en tiempo constante: comparar firmas con `===` filtra
 *  informacion por el tiempo de respuesta. */
function iguales(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
