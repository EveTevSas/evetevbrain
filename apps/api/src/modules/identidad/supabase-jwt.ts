import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTPayload } from "jose";

/**
 * Verificación de los JWT de Supabase Auth (proyecto de EvePay) para la
 * consola de administración (CA-3 de admin-console).
 *
 * QUÉ FIRMA SE ESPERA. Supabase emite tokens de dos maneras y un proyecto puede
 * pasar de una a la otra sin avisar a la aplicación:
 * - **Asimétrica (ES256/RS256)** — el modo por omisión hoy. Se verifica contra
 *   el JWKS del proyecto (`/auth/v1/.well-known/jwks.json`), que jose cachea.
 *   Necesita `SUPABASE_URL`.
 * - **HS256 con secreto compartido** — el esquema anterior. Necesita
 *   `SUPABASE_JWT_SECRET`, que vive solo en el gestor del entorno (§4).
 *
 * El método se elige por el `alg` del token, NO por qué variable esté puesta.
 * Elegirlo por la configuración parece equivalente y no lo es: con el secreto
 * configurado y un proyecto ya migrado a claves asimétricas, todos los tokens
 * legítimos se rechazaban en silencio y nadie podía entrar a la consola.
 *
 * Escoger el verificador según el token es seguro aquí porque cada rama fija
 * su algoritmo y sus claves son distintas: la del secreto solo acepta HS256
 * contra un secreto que el atacante no tiene, y la asimétrica solo acepta
 * ES256/RS256 contra la clave pública del proyecto. El secreto HMAC nunca es
 * una clave pública, que es lo que abre la confusión de algoritmos clásica; y
 * `alg: none` no casa con ninguna de las dos listas.
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
  try {
    const { alg } = decodeProtectedHeader(token);
    let payload: SupabaseClaims;

    if (alg?.startsWith("HS")) {
      const secret = process.env.SUPABASE_JWT_SECRET;
      if (!secret) return null;
      ({ payload } = await jwtVerify<SupabaseClaims>(token, claveHs256(secret), {
        algorithms: ["HS256"]
      }));
    } else {
      const supabaseUrl = process.env.SUPABASE_URL;
      if (!supabaseUrl) return null;
      jwks ??= createRemoteJWKSet(
        new URL(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`)
      );
      ({ payload } = await jwtVerify<SupabaseClaims>(token, jwks, {
        algorithms: ["ES256", "RS256"]
      }));
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
