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

const eventoValido = { id: "evt-1", type: "payment.succeeded", data: { payment_id: "prov-1" } };

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
      type: "payment.succeeded",
      providerPaymentId: "prov-1"
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
