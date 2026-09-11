import { describe, expect, it } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { InMemoryTarifasRepository } from "../tarifas/in-memory-tarifas.repository";
import type { ProvidersService } from "./providers.service";
import { TarifasAdminService } from "./tarifas-admin.service";

const TENANT = "11111111-1111-4111-8111-111111111111";
const OTRO = "22222222-2222-4222-8222-222222222222";
const ACTOR = "ops@evetev.com";

const providers = {
  estado: () => ({
    activo: "combopay",
    proveedores: [{ nombre: "combopay" }, { nombre: "akua" }, { nombre: "fake" }]
  })
} as unknown as ProvidersService;

function montar(): { repo: InMemoryTarifasRepository; service: TarifasAdminService } {
  const repo = new InMemoryTarifasRepository();
  repo.tenants.add(TENANT);
  repo.tenants.add(OTRO);
  return { repo, service: new TarifasAdminService(repo, providers) };
}

describe("TarifasAdminService — tarifa del comercio", () => {
  it("sin tarifa: vigente null e historial vacío, no un error", async () => {
    const { service } = montar();
    await expect(service.tarifaComercio(TENANT)).resolves.toEqual({ vigente: null, historial: [] });
  });

  it("CA-1: cambiar la tarifa agrega una versión, la anterior sigue en el historial", async () => {
    const { repo, service } = montar();
    const v1 = await service.asignarTarifaComercio(
      TENANT,
      { bps: 290, fijoMinor: 30_000, ivaBps: 1900 },
      ACTOR
    );
    const v2 = await service.asignarTarifaComercio(
      TENANT,
      { bps: 250, fijoMinor: 0, ivaBps: 1900 },
      ACTOR
    );

    const { vigente, historial } = await service.tarifaComercio(TENANT);
    expect(vigente?.id).toBe(v2.id);
    expect(historial.map((v) => v.id)).toEqual([v2.id, v1.id]);
    expect(historial[1]).toMatchObject({ bps: 290, fijoMinor: 30_000, creadaPor: ACTOR });
    expect(repo.rastros.filter((r) => r.accion === "tarifa.asignar")).toHaveLength(2);
  });

  it("un comercio inexistente → 404", async () => {
    const { service } = montar();
    await expect(
      service.asignarTarifaComercio(
        "99999999-9999-4999-8999-999999999999",
        { bps: 0, fijoMinor: 0, ivaBps: 0 },
        ACTOR
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("la vigente de todos: una por comercio con tarifa; sin tarifa no aparece", async () => {
    const { service } = montar();
    await service.asignarTarifaComercio(TENANT, { bps: 100, fijoMinor: 0, ivaBps: 0 }, ACTOR);
    await service.asignarTarifaComercio(TENANT, { bps: 200, fijoMinor: 0, ivaBps: 0 }, ACTOR);

    const todas = await service.tarifasVigentes();
    expect(todas).toHaveLength(1);
    expect(todas[0]).toMatchObject({ tenantId: TENANT, bps: 200 });
  });
});

describe("TarifasAdminService — tarifa del proveedor", () => {
  it("se guarda por proveedor, no por comercio, y registra si descuenta en la consignación", async () => {
    const { repo, service } = montar();
    const v = await service.asignarTarifaProveedor(
      "combopay",
      { bps: 0, fijoMinor: 80_000, descuentaEnConsignacion: true },
      ACTOR
    );

    const { vigente, historial } = await service.tarifaProveedor("combopay");
    expect(vigente).toMatchObject({
      id: v.id,
      provider: "combopay",
      descuentaEnConsignacion: true
    });
    expect(historial).toHaveLength(1);
    expect(repo.rastros[0]).toMatchObject({
      accion: "tarifa_proveedor.asignar",
      objetoId: "combopay"
    });
  });

  /* Guardar una tarifa a "combo-pay" no fallaría en la base, pero nadie la
     leería: el núcleo busca por el nombre real del proveedor. */
  it("un proveedor que no existe como implementación → 404, sin guardar nada", async () => {
    const { repo, service } = montar();
    await expect(
      service.asignarTarifaProveedor(
        "combo-pay",
        { bps: 0, fijoMinor: 0, descuentaEnConsignacion: true },
        ACTOR
      )
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.tarifaProveedor("combo-pay")).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.proveedor).toHaveLength(0);
  });
});
