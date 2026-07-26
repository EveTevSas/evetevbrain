import { describe, expect, it } from "vitest";
import { BadRequestException } from "@nestjs/common";
import type { Cobro } from "@evetev/shared";
import { PagosController } from "./pagos.controller";
import type { CobroContext, PagosService } from "./pagos.service";
import { requestStorage } from "../../common/request-context";

const validBody = {
  merchantId: "33333333-3333-4333-8333-333333333333",
  montoMinor: 150000,
  moneda: "COP",
  referencia: "cuota-marzo"
};

const cobroDemo: Cobro = {
  id: "44444444-4444-4444-8444-444444444444",
  merchantId: validBody.merchantId,
  montoMinor: validBody.montoMinor,
  moneda: "COP",
  referencia: validBody.referencia,
  estado: "pendiente",
  checkoutUrl: "https://checkout.fake.evetev.local/x",
  creadoEn: new Date().toISOString()
};

function makeController(
  crearCobro: PagosService["crearCobro"] = async () => cobroDemo
): PagosController {
  const service = { crearCobro } as unknown as PagosService;
  return new PagosController(service);
}

describe("PagosController — validación de entrada", () => {
  it("EARS 4: sin header Idempotency-Key → 400", async () => {
    const controller = makeController();
    await expect(controller.crear(undefined, validBody)).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("EARS 5: cuerpo inválido (monto ≤ 0) → 400", async () => {
    const controller = makeController();
    await expect(controller.crear("key-1", { montoMinor: -5 })).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("con clave y cuerpo válidos, pasa el contexto del tenant al servicio", async () => {
    let recibido: { ctx: CobroContext; key: string } | undefined;
    const controller = makeController(async (ctx, _input, key) => {
      recibido = { ctx, key };
      return cobroDemo;
    });

    await requestStorage.run(
      { tenantId: "11111111-1111-4111-8111-111111111111", actor: "admin", role: "admin_comercio" },
      async () => {
        await controller.crear("key-1", validBody);
      }
    );

    expect(recibido?.key).toBe("key-1");
    expect(recibido?.ctx.tenantId).toBe("11111111-1111-4111-8111-111111111111");
    expect(recibido?.ctx.actor).toBe("admin");
  });
});
