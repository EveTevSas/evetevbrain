import { describe, expect, it } from "vitest";
import { esSuperAdmin, isSafeInternalPath, puede, rolInterno } from "./permissions";

describe("rolInterno (rbac-operativo CA-1)", () => {
  it("los tres roles internos entran; los demás no", () => {
    expect(rolInterno({ app_metadata: { role: "super_admin" } })).toBe("super_admin");
    expect(rolInterno({ app_metadata: { role: "ops" } })).toBe("ops");
    expect(rolInterno({ app_metadata: { role: "finanzas" } })).toBe("finanzas");
    expect(rolInterno({ app_metadata: { role: "admin_comercio" } })).toBeNull();
    expect(rolInterno({ app_metadata: {} })).toBeNull();
    expect(rolInterno(null)).toBeNull();
  });

  it("esSuperAdmin sigue significando lo mismo", () => {
    expect(esSuperAdmin({ app_metadata: { role: "super_admin" } })).toBe(true);
    expect(esSuperAdmin({ app_metadata: { role: "ops" } })).toBe(false);
  });
});

describe("puede (misma tabla que la API)", () => {
  it("ops prepara lotes y no los aprueba; finanzas al revés; solo super_admin toca tarifas", () => {
    expect(puede("ops", "lotes.preparar")).toBe(true);
    expect(puede("ops", "lotes.aprobar")).toBe(false);
    expect(puede("finanzas", "lotes.aprobar")).toBe(true);
    expect(puede("finanzas", "lotes.preparar")).toBe(false);
    expect(puede("ops", "tarifas.escribir")).toBe(false);
    expect(puede("super_admin", "tarifas.escribir")).toBe(true);
    expect(puede(null, "leer")).toBe(false);
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
