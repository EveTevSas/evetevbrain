import { describe, expect, it } from "vitest";
import { EnlaceProductoSchema, ingresoDeCuenta, type EnlaceProducto } from "./cuenta-canonica";

const CUENTA = "11111111-1111-4111-8111-111111111111";
const TENANT = "22222222-2222-4222-8222-222222222222";

describe("Cuenta canónica (hub-base CA-4, CA-5)", () => {
  it("un enlace vacío no es válido y EvePay no lleva mensualidad", () => {
    expect(
      EnlaceProductoSchema.safeParse({
        accountId: CUENTA,
        producto: "eveledger",
        origen: "directo"
      }).success
    ).toBe(false);
    expect(
      EnlaceProductoSchema.safeParse({
        accountId: CUENTA,
        producto: "evepay",
        origen: "directo",
        evepayTenantId: TENANT,
        suscripcion: { estado: "activa", mrrMinor: 1 }
      }).success
    ).toBe(false);
  });

  it("CA-5: suma MRR activo + comisión del tenant una sola vez aunque dos productos apunten al mismo tenant", () => {
    const enlaces: EnlaceProducto[] = [
      {
        accountId: CUENTA,
        producto: "eveledger",
        origen: "eveledger",
        suscripcion: { estado: "activa", mrrMinor: 900_000 },
        evepayTenantId: TENANT
      },
      { accountId: CUENTA, producto: "evepay", origen: "eveledger", evepayTenantId: TENANT },
      {
        accountId: CUENTA,
        producto: "eveconecta",
        origen: "directo",
        suscripcion: { estado: "cancelada", mrrMinor: 500_000 }
      }
    ];
    expect(ingresoDeCuenta(enlaces, { [TENANT]: 120_000 })).toEqual({
      mrrMinor: 900_000,
      comisionMinor: 120_000,
      totalMinor: 1_020_000
    });
  });
});
