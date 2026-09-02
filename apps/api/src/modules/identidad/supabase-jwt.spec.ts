import { afterEach, describe, expect, it } from "vitest";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { pareceJwt, verificarJwtSupabase } from "./supabase-jwt";

const SECRET = "super-secreto-de-pruebas-con-largo-suficiente";

async function tokenFirmado(
  claims: Record<string, unknown>,
  opts: { secret?: string; expirado?: boolean } = {}
): Promise<string> {
  const jwt = new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(opts.expirado ? "-1h" : "1h");
  return jwt.sign(new TextEncoder().encode(opts.secret ?? SECRET));
}

afterEach(() => {
  delete process.env.SUPABASE_JWT_SECRET;
  delete process.env.SUPABASE_URL;
});

describe("verificarJwtSupabase (CA-3 de admin-console)", () => {
  it("token válido devuelve sub, email y el rol de app_metadata", async () => {
    process.env.SUPABASE_JWT_SECRET = SECRET;
    const token = await tokenFirmado({
      sub: "user-1",
      email: "ops@evetev.com",
      app_metadata: { role: "super_admin" }
    });

    expect(await verificarJwtSupabase(token)).toEqual({
      sub: "user-1",
      email: "ops@evetev.com",
      role: "super_admin"
    });
  });

  it("el rol sale de app_metadata, nunca de user_metadata", async () => {
    process.env.SUPABASE_JWT_SECRET = SECRET;
    const token = await tokenFirmado({
      sub: "user-2",
      user_metadata: { role: "super_admin" } // editable por el usuario: se ignora
    });

    const usuario = await verificarJwtSupabase(token);
    expect(usuario?.role).toBeUndefined();
  });

  it("firma con otro secreto → null", async () => {
    process.env.SUPABASE_JWT_SECRET = SECRET;
    const token = await tokenFirmado({ sub: "user-3" }, { secret: "otro-secreto-distinto" });
    expect(await verificarJwtSupabase(token)).toBeNull();
  });

  it("token vencido → null", async () => {
    process.env.SUPABASE_JWT_SECRET = SECRET;
    const token = await tokenFirmado({ sub: "user-4" }, { expirado: true });
    expect(await verificarJwtSupabase(token)).toBeNull();
  });

  it("sin configuración de verificación → null (nadie entra por JWT)", async () => {
    const token = await tokenFirmado({ sub: "user-5" });
    expect(await verificarJwtSupabase(token)).toBeNull();
  });

  it("token sin sub → null", async () => {
    process.env.SUPABASE_JWT_SECRET = SECRET;
    const token = await tokenFirmado({ email: "sin-sub@evetev.com" });
    expect(await verificarJwtSupabase(token)).toBeNull();
  });
});

/* Supabase firma con ES256 por omisión y publica la clave en su JWKS. La
   primera versión elegía el verificador según qué variable estuviera puesta:
   con SUPABASE_JWT_SECRET configurado nunca miraba el JWKS, así que rechazaba
   en silencio TODOS los tokens legítimos y nadie podía entrar a la consola.
   Se descubrió levantando el entorno local, no con los tests. */
describe("tokens asimétricos (ES256, el modo por omisión de Supabase)", () => {
  async function proyectoConEs256() {
    const { privateKey, publicKey } = await generateKeyPair("ES256", { extractable: true });
    const jwk = { ...(await exportJWK(publicKey)), alg: "ES256", kid: "k1" };

    const original = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ keys: [jwk] }), {
        headers: { "content-type": "application/json" }
      })) as typeof fetch;

    const token = await new SignJWT({ sub: "user-es", app_metadata: { role: "super_admin" } })
      .setProtectedHeader({ alg: "ES256", kid: "k1" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey);

    return { token, restaurar: () => (globalThis.fetch = original) };
  }

  it("se verifica contra el JWKS aunque SUPABASE_JWT_SECRET esté configurado", async () => {
    process.env.SUPABASE_URL = "http://127.0.0.1:57321";
    process.env.SUPABASE_JWT_SECRET = SECRET; // el caso que rompía antes
    const { token, restaurar } = await proyectoConEs256();
    try {
      expect(await verificarJwtSupabase(token)).toMatchObject({
        sub: "user-es",
        role: "super_admin"
      });
    } finally {
      restaurar();
    }
  });

  it("sin SUPABASE_URL no hay contra qué verificarlo → null", async () => {
    process.env.SUPABASE_JWT_SECRET = SECRET;
    const { token, restaurar } = await proyectoConEs256();
    try {
      expect(await verificarJwtSupabase(token)).toBeNull();
    } finally {
      restaurar();
    }
  });
});

describe("pareceJwt", () => {
  it("distingue JWT de API keys evpk_", () => {
    expect(pareceJwt("aaa.bbb.ccc")).toBe(true);
    expect(pareceJwt("evpk_live_abc123")).toBe(false);
  });
});
