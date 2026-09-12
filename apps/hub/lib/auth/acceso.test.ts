import { describe, expect, it } from "vitest";
import { correoPermitido, dominiosPermitidos, isSafeInternalPath, tieneAcceso } from "./acceso";

describe("acceso al Hub (hub-base CA-2)", () => {
  it("lee los dominios del entorno y cae a evetev.com", () => {
    expect(dominiosPermitidos(" Evetev.com , kushkipagos.com ")).toEqual([
      "evetev.com",
      "kushkipagos.com"
    ]);
    expect(dominiosPermitidos("")).toEqual(["evetev.com"]);
    expect(dominiosPermitidos(undefined)).toEqual(["evetev.com"]);
  });

  it("solo entra el correo del dominio, sin trucos con la arroba", () => {
    const d = ["evetev.com"];
    expect(correoPermitido("ana@evetev.com", d)).toBe(true);
    expect(correoPermitido("ana@EVETEV.com", d)).toBe(true);
    expect(correoPermitido("ana@evetev.com.evil.io", d)).toBe(false);
    expect(correoPermitido("evetev.com@gmail.com", d)).toBe(false);
    expect(correoPermitido("ana@", d)).toBe(false);
    expect(correoPermitido(null, d)).toBe(false);
  });

  it("el equipo interno de EvePay entra por su rol aunque el correo sea de otro dominio", () => {
    expect(
      tieneAcceso({ email: "x@gmail.com", app_metadata: { role: "finanzas" } }, ["evetev.com"])
    ).toBe(true);
    expect(
      tieneAcceso({ email: "x@gmail.com", app_metadata: { role: "admin_comercio" } }, [
        "evetev.com"
      ])
    ).toBe(false);
    expect(tieneAcceso(null)).toBe(false);
  });

  it("solo redirige a rutas internas", () => {
    expect(isSafeInternalPath("/equipo")).toBe(true);
    expect(isSafeInternalPath("//evil.com")).toBe(false);
    expect(isSafeInternalPath("https://evil.com")).toBe(false);
  });
});
