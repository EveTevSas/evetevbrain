import { describe, expect, it } from "vitest";
import { esSuperAdmin, isSafeInternalPath } from "./permissions";

describe("esSuperAdmin (CA-2)", () => {
  it("solo el rol super_admin de app_metadata pasa", () => {
    expect(esSuperAdmin({ app_metadata: { role: "super_admin" } })).toBe(true);
    expect(esSuperAdmin({ app_metadata: { role: "admin_comercio" } })).toBe(false);
    expect(esSuperAdmin({ app_metadata: {} })).toBe(false);
    expect(esSuperAdmin(null)).toBe(false);
  });
});

describe("isSafeInternalPath", () => {
  it("acepta solo rutas internas", () => {
    expect(isSafeInternalPath("/pagos?estado=aprobado")).toBe(true);
    expect(isSafeInternalPath("//evil.com")).toBe(false);
    expect(isSafeInternalPath("https://evil.com")).toBe(false);
    expect(isSafeInternalPath(null)).toBe(false);
  });
});
