import { describe, expect, it } from "vitest";
import { BadRequestException } from "@nestjs/common";
import type { Merchant } from "@evetev/shared";
import { MerchantsController } from "./merchants.controller";
import type { MerchantsService } from "./merchants.service";
import { requestStorage } from "../../common/request-context";

const merchantDemo: Merchant = {
  id: "44444444-4444-4444-8444-444444444444",
  legalName: "Comercio Demo",
  estado: "en_revision",
  creadoEn: new Date().toISOString()
};

function makeController(
  registrar: MerchantsService["registrar"] = async () => ({
    merchant: merchantDemo,
    pasoManualProveedor: null
  })
): MerchantsController {
  const service = {
    registrar,
    obtener: async () => null,
    aprobarPorProvider: async () => undefined
  } as unknown as MerchantsService;
  return new MerchantsController(service);
}

describe("MerchantsController", () => {
  it("EARS 2: body inválido (sin legalName) → 400", async () => {
    const controller = makeController();
    await expect(controller.crear({})).rejects.toBeInstanceOf(BadRequestException);
  });

  it("con body válido, pasa el tenant del contexto al servicio", async () => {
    let recibido: { tenantId: string; legalName: string } | undefined;
    const controller = makeController(async (tenantId, input) => {
      recibido = { tenantId, legalName: input.legalName };
      return { merchant: merchantDemo, pasoManualProveedor: null };
    });

    await requestStorage.run(
      { tenantId: "11111111-1111-4111-8111-111111111111", actor: "admin", role: "admin_comercio" },
      async () => {
        await controller.crear({ legalName: "Comercio Demo" });
      }
    );

    expect(recibido?.tenantId).toBe("11111111-1111-4111-8111-111111111111");
    expect(recibido?.legalName).toBe("Comercio Demo");
  });
});
