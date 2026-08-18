import { describe, expect, it } from "vitest";
import { UnauthorizedException } from "@nestjs/common";
import { WebhooksController } from "./webhooks.controller";
import type { WebhookVerifier } from "./webhook-verifier";
import type { EventoWebhook, WebhooksService } from "./webhooks.service";

function verifier(ok: boolean): WebhookVerifier {
  return { verificar: () => ok };
}

function serviceCapturando(sink: { evento?: EventoWebhook }): WebhooksService {
  return {
    procesar: async (evento: EventoWebhook) => {
      sink.evento = evento;
    }
  } as unknown as WebhooksService;
}

function req(body: unknown): { rawBody?: Buffer } {
  return { rawBody: Buffer.from(JSON.stringify(body), "utf8") };
}

/* La forma REAL que manda Akua. El id del pago viaja en `data.payment.link.id`
   —el link de pago es lo que guardamos como provider_payment_id al crear el
   cobro—, no en un `data.payment_id` plano como se supuso antes de tener la
   integración. */
const eventoValido = {
  id: "evt-1",
  type: "payment.purchase.succeeded",
  data: { payment: { id: "pay-9", link: { id: "prov-1" }, merchant: { id: "pm-1" } } }
};

describe("WebhooksController — firma y parseo", () => {
  it("EARS 2: firma inválida → 401 y no procesa", async () => {
    const sink: { evento?: EventoWebhook } = {};
    const controller = new WebhooksController(verifier(false), serviceCapturando(sink));
    await expect(controller.akua(req(eventoValido), "firma-mala")).rejects.toBeInstanceOf(
      UnauthorizedException
    );
    expect(sink.evento).toBeUndefined();
  });

  it("firma válida: parsea el evento y lo pasa al servicio", async () => {
    const sink: { evento?: EventoWebhook } = {};
    const controller = new WebhooksController(verifier(true), serviceCapturando(sink));
    const res = await controller.akua(req(eventoValido), "firma-ok");

    expect(res).toEqual({ received: true });
    expect(sink.evento).toEqual({
      id: "evt-1",
      type: "payment.purchase.succeeded",
      providerPaymentId: "prov-1",
      providerMerchantId: "pm-1"
    });
  });

  /* Sin link, el id del propio pago. Es la rama que decide contra qué cobro se
     resuelve el evento: si se equivoca, un pago aprobado no aprueba nada. */
  it("sin link, el id del pago hace de referencia", async () => {
    const sink: { evento?: EventoWebhook } = {};
    const controller = new WebhooksController(verifier(true), serviceCapturando(sink));
    await controller.akua(
      req({ id: "evt-2", type: "payment.purchase.failed", data: { payment: { id: "pay-9" } } }),
      "firma-ok"
    );

    expect(sink.evento).toEqual({
      id: "evt-2",
      type: "payment.purchase.failed",
      providerPaymentId: "pay-9"
    });
  });

  it("merchant.created trae el comercio en data.merchant", async () => {
    const sink: { evento?: EventoWebhook } = {};
    const controller = new WebhooksController(verifier(true), serviceCapturando(sink));
    await controller.akua(
      req({ id: "evt-3", type: "merchant.created", data: { merchant: { id: "pm-7" } } }),
      "firma-ok"
    );

    expect(sink.evento).toEqual({
      id: "evt-3",
      type: "merchant.created",
      providerMerchantId: "pm-7"
    });
  });

  it("firma válida pero cuerpo malformado: responde 200 y no procesa", async () => {
    const sink: { evento?: EventoWebhook } = {};
    const controller = new WebhooksController(verifier(true), serviceCapturando(sink));
    const res = await controller.akua(req({ hola: "mundo" }), "firma-ok");

    expect(res).toEqual({ received: true });
    expect(sink.evento).toBeUndefined();
  });
});
