import { afterEach, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
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

describe("pareceJwt", () => {
  it("distingue JWT de API keys evpk_", () => {
    expect(pareceJwt("aaa.bbb.ccc")).toBe(true);
    expect(pareceJwt("evpk_live_abc123")).toBe(false);
  });
});
