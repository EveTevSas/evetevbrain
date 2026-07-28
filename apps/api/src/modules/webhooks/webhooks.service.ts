import { Inject, Injectable } from "@nestjs/common";
import type { EstadoCobro } from "@evetev/shared";
import { PAGOS_REPOSITORY, type PagosRepository } from "../pagos/pagos.repository";
import { puedeTransicionar } from "../pagos/payment-state";
import { LedgerService } from "../ledger/ledger.service";
import { MerchantsService } from "../merchants/merchants.service";

/** Evento normalizado del proveedor. */
export interface EventoWebhook {
  id: string;
  type: string;
  providerPaymentId?: string;
  providerMerchantId?: string;
}

/** Mapea el tipo de evento de Akua a nuestro estado destino (pagos). */
function estadoDestino(type: string): EstadoCobro | null {
  switch (type) {
    case "payment.purchase.succeeded":
      return "aprobado";
    case "payment.purchase.rejected":
    case "payment.purchase.failed":
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
    private readonly merchants: MerchantsService
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

    const pago = await this.repo.resolverPagoPorProvider(evento.providerPaymentId);
    if (!pago) {
      return; // el evento referencia un pago que no conocemos (EARS 5)
    }

    const esNuevo = await this.repo.registrarEventoIdempotente({
      tenantId: pago.tenantId,
      eventId: evento.id,
      provider: "akua",
      type: evento.type
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
      actor: "webhook:akua"
    });

    // Al aprobar, asienta el movimiento en el ledger (idempotente por pago, §2).
    if (destino === "aprobado") {
      await this.ledger.registrarCobroAprobado(pago.tenantId, pago.paymentId);
    }
  }
}
