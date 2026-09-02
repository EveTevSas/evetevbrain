import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

/**
 * Verificación de los JWT de Supabase Auth (proyecto de EvePay) para la
 * consola de administración (CA-3 de admin-console).
 *
 * Dos modos, según el proyecto:
 * - `SUPABASE_JWT_SECRET` (HS256): el secreto "legacy" de Supabase. Simple y
 *   suficiente; el secreto vive solo en el gestor del entorno (§4).
 * - `SUPABASE_URL` sin secreto: claves asimétricas del proyecto vía JWKS
 *   (`/auth/v1/.well-known/jwks.json`), cacheadas por jose.
 *
 * El rol viene de `app_metadata.role`, que solo se escribe con la clave
 * secreta del proyecto (script auth:provision-admin de la consola) — nunca de
 * `user_metadata`, que el usuario puede editar.
 */

export interface UsuarioJwt {
  /** `sub` del token: id del usuario en Supabase. */
  sub: string;
  email?: string;
  role?: string;
}

interface SupabaseClaims extends JWTPayload {
  email?: string;
  app_metadata?: { role?: unknown };
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function claveHs256(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/** Devuelve el usuario del token, o null si el token no es válido/verificable. */
export async function verificarJwtSupabase(token: string): Promise<UsuarioJwt | null> {
  const secret = process.env.SUPABASE_JWT_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;

  try {
    let payload: SupabaseClaims;

    if (secret) {
      ({ payload } = await jwtVerify<SupabaseClaims>(token, claveHs256(secret)));
    } else if (supabaseUrl) {
      jwks ??= createRemoteJWKSet(
        new URL(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`)
      );
      ({ payload } = await jwtVerify<SupabaseClaims>(token, jwks));
    } else {
      return null; // sin configuración: nadie entra por JWT
    }

    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      return null;
    }

    const role = payload.app_metadata?.role;
    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      role: typeof role === "string" ? role : undefined
    };
  } catch {
    return null; // firma inválida, token vencido o malformado
  }
}

/** Un Bearer con dos puntos es un JWT; las API keys de comercio son evpk_*. */
export function pareceJwt(token: string): boolean {
  return token.split(".").length === 3;
}
