import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

/* Hook real de ComboPay (Recaudos beta): JSON plano, sin firma; la auth es el
   secreto de la ruta. `id` es el id de la factura que guardamos al crear el
   cobro. Los campos nulos no se envían. */
const hookComboPay = {
  custom: "158790",
  ticket_id: "851_2146359_20210616210621",
  id: 1003455,
  invoice_number: "2146359",
  payment_method: "pse",
  transaction_state: "payment_approved",
  transaction_value: 100000,
  unique_transaction_code: "77926584888"
};

describe("WebhooksController — ComboPay (secreto en la ruta)", () => {
  const SECRETO = "s3creto-combopay";

  beforeEach(() => {
    process.env.COMBOPAY_WEBHOOK_SECRET = SECRETO;
  });

  afterEach(() => {
    delete process.env.COMBOPAY_WEBHOOK_SECRET;
  });

  it("CA-6: secreto incorrecto → 401 y no procesa", async () => {
    const sink: { evento?: EventoWebhook } = {};
    const controller = new WebhooksController(verifier(true), serviceCapturando(sink));
    await expect(controller.combopay(req(hookComboPay), "otro-secreto")).rejects.toBeInstanceOf(
      UnauthorizedException
    );
    expect(sink.evento).toBeUndefined();
  });

  it("CA-6: sin COMBOPAY_WEBHOOK_SECRET configurado → 401 siempre", async () => {
    delete process.env.COMBOPAY_WEBHOOK_SECRET;
    const controller = new WebhooksController(verifier(true), serviceCapturando({}));
    await expect(controller.combopay(req(hookComboPay), "")).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it("CA-5: secreto correcto → normaliza al evento interno con provider combopay", async () => {
    const sink: { evento?: EventoWebhook } = {};
    const controller = new WebhooksController(verifier(true), serviceCapturando(sink));
    const res = await controller.combopay(req(hookComboPay), SECRETO);

    expect(res).toEqual({ received: true });
    expect(sink.evento).toEqual({
      id: "851_2146359_20210616210621",
      type: "payment_approved",
      provider: "combopay",
      providerPaymentId: "1003455"
    });
  });

  it("CA-7: sin ticket_id usa el CUS como id de evento (reenvío = mismo id)", async () => {
    const sink: { evento?: EventoWebhook } = {};
    const controller = new WebhooksController(verifier(true), serviceCapturando(sink));
    const { ticket_id: _omitido, ...sinTicket } = hookComboPay;
    await controller.combopay(req(sinTicket), SECRETO);

    expect(sink.evento?.id).toBe("77926584888");
  });

  it("cuerpo sin transaction_state o sin id de factura: 200 y no procesa", async () => {
    const sink: { evento?: EventoWebhook } = {};
    const controller = new WebhooksController(verifier(true), serviceCapturando(sink));

    expect(await controller.combopay(req({ id: 1 }), SECRETO)).toEqual({ received: true });
    expect(
      await controller.combopay(req({ transaction_state: "payment_approved" }), SECRETO)
    ).toEqual({ received: true });
    expect(sink.evento).toBeUndefined();
  });
});
