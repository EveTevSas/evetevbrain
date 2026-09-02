import { describe, expect, it } from "vitest";
import type { PaymentProvider } from "@evetev/shared";
import { InMemoryMerchantsRepository } from "./in-memory-merchants.repository";
import { MerchantsService } from "./merchants.service";

const TENANT = "11111111-1111-4111-8111-111111111111";

/** Proveedor agregador (como ComboPay): no da de alta comercios por API. */
function proveedorAgregador(): PaymentProvider {
  return {
    nombre: "combopay",
    capacidades: { altaDeComercios: false, liquidaciones: false, monedas: ["COP"] },
    crearCobro: async () => {
      throw new Error("no se usa aquí");
    },
    verificarEstado: async () => "pendiente",
    listarLiquidaciones: async () => {
      throw new Error("no expone liquidaciones");
    },
    crearMerchant: async () => {
      throw new Error("no debería llamarse cuando la capacidad está en false");
    }
  };
}

describe("MerchantsService con proveedor agregador (CA-8 de admin-console)", () => {
  it("crea el comercio en EvePay y reporta el paso manual, sin llamar al proveedor", async () => {
    const repo = new InMemoryMerchantsRepository();
    const service = new MerchantsService(repo, proveedorAgregador());

    const { merchant, pasoManualProveedor } = await service.registrar(TENANT, {
      legalName: "Conjunto Los Robles"
    });

    expect(merchant.legalName).toBe("Conjunto Los Robles");
    expect(merchant.estado).toBe("en_revision");
    expect(pasoManualProveedor).toContain("combopay");

    const fila = Array.from(repo.merchants.values())[0];
    // Sin id del proveedor: allá todavía no existe.
    expect(fila?.providerMerchantId).toBeNull();
  });

  it("guarda el nombre real del proveedor, no el de la variable de entorno", async () => {
    // Antes se derivaba de PAYMENT_PROVIDER con un ternario que solo conocía
    // "akua": con ComboPay activo, cada comercio quedaba marcado como "fake".
    const repo = new InMemoryMerchantsRepository();
    const service = new MerchantsService(repo, proveedorAgregador());

    await service.registrar(TENANT, { legalName: "Comercio X" });

    expect(Array.from(repo.merchants.values())[0]?.provider).toBe("combopay");
  });
});
