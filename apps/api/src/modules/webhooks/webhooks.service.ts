import { Inject, Injectable } from "@nestjs/common";
import type { EstadoCobro } from "@evetev/shared";
import { PAGOS_REPOSITORY, type PagosRepository } from "../pagos/pagos.repository";
import { puedeTransicionar } from "../pagos/payment-state";
import { LedgerService } from "../ledger/ledger.service";
import { MerchantsService } from "../merchants/merchants.service";
import { OutboundWebhookDeliveryService } from "../outbound-webhooks/outbound-webhook-delivery.service";
import {
  OUTBOUND_WEBHOOKS_REPOSITORY,
  type OutboundWebhooksRepository
} from "../outbound-webhooks/outbound-webhooks.repository";

/** Evento normalizado del proveedor. */
export interface EventoWebhook {
  id: string;
  type: string;
  /** Quién lo emitió; ausente = akua (compatibilidad). */
  provider?: "akua" | "combopay";
  providerPaymentId?: string;
  providerMerchantId?: string;
}

/** Mapea el tipo de evento del proveedor a nuestro estado destino (pagos). */
function estadoDestino(type: string): EstadoCobro | null {
  switch (type) {
    // Akua
    case "payment.purchase.succeeded":
      return "aprobado";
    case "payment.purchase.rejected":
    case "payment.purchase.failed":
      return "fallido";
    // ComboPay (transaction_state del hook, CA-5 de provider-combopay)
    case "payment_approved":
      return "aprobado";
    case "payment_fail":
      return "fallido";
    // payment.purchase.pending, payment.refunded, dispute.created, etc.: Fase 6.
    default:
      return null;
  }
}

@Injectable()
export class WebhooksService {
  constructor(
    @Inject(PAGOS_REPOSITORY) private readonly repo: PagosRepository,
    private readonly ledger: LedgerService,
    private readonly merchants: MerchantsService,
    private readonly delivery: OutboundWebhookDeliveryService,
    @Inject(OUTBOUND_WEBHOOKS_REPOSITORY)
    private readonly webhookRepo: OutboundWebhooksRepository
  ) {}

  /**
   * Procesa un evento ya verificado (firma). Normaliza a nuestros eventos internos.
   * Nunca lanza por eventos de ruido; el llamante responde 2xx.
   */
  async procesar(evento: EventoWebhook): Promise<void> {
    // Akua fires "merchant.created" once the merchant passes KYC in the platform.
    if (evento.type === "merchant.created" || evento.type === "merchant.approved") {
      if (evento.providerMerchantId) {
        await this.merchants.aprobarPorProvider(evento.providerMerchantId);
      }
      return;
    }
    await this.procesarPago(evento);
  }

  private async procesarPago(evento: EventoWebhook): Promise<void> {
    const destino = estadoDestino(evento.type);
    if (!destino || !evento.providerPaymentId) {
      return; // tipo no soportado (EARS 6) o evento sin pago
    }

    const provider = evento.provider ?? "akua";
    const pago = await this.repo.resolverPagoPorProvider(provider, evento.providerPaymentId);
    if (!pago) {
      return; // el evento referencia un pago que no conocemos (EARS 5)
    }

    const esNuevo = await this.repo.registrarEventoIdempotente({
      tenantId: pago.tenantId,
      eventId: evento.id,
      provider,
      type: evento.type,
      paymentId: pago.paymentId
    });
    if (!esNuevo) {
      return; // evento ya procesado (EARS 3)
    }

    if (!puedeTransicionar(pago.estado, destino)) {
      return; // transición inválida; queda registrado el evento
    }

    await this.repo.aplicarTransicion({
      tenantId: pago.tenantId,
      paymentId: pago.paymentId,
      desde: pago.estado,
      hacia: destino,
      actor: `webhook:${provider}`
    });

    if (destino === "aprobado") {
      await this.ledger.registrarCobroAprobado(pago.tenantId, pago.paymentId);
    }

    void this.enviarWebhookSaliente(pago.tenantId, pago.paymentId, destino);
  }

  private async enviarWebhookSaliente(
    tenantId: string,
    paymentId: string,
    estado: EstadoCobro
  ): Promise<void> {
    const config = await this.webhookRepo.buscarPorTenant(tenantId);
    if (!config?.activa) return;

    const tipo = estado === "aprobado" ? "payment.completed" : "payment.failed";
    if (!config.events.includes(tipo)) return;

    const cobro = await this.repo.buscarCobro(tenantId, paymentId);
    if (!cobro) return;

    void this.delivery.entregar(config.url, config.secret, {
      tenantId,
      type: tipo,
      data: {
        paymentId: cobro.id,
        reference: cobro.referencia,
        amountMinor: cobro.montoMinor,
        currency: cobro.moneda,
        estado: cobro.estado
      }
    });
  }
}
