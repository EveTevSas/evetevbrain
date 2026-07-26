import { Inject, Injectable } from "@nestjs/common";
import type { EstadoCobro } from "@evetev/shared";
import { PAGOS_REPOSITORY, type PagosRepository } from "../pagos/pagos.repository";
import { puedeTransicionar } from "../pagos/payment-state";
import { LedgerService } from "../ledger/ledger.service";

/** Evento normalizado del proveedor. */
export interface EventoWebhook {
  id: string;
  type: string;
  providerPaymentId: string;
}

/** Mapea el tipo de evento del proveedor a nuestro estado destino (Fase 2). */
function estadoDestino(type: string): EstadoCobro | null {
  switch (type) {
    case "payment.succeeded":
      return "aprobado";
    case "payment.failed":
      return "fallido";
    // payment.refunded, dispute.created, etc.: Fase 6 — no se procesan aún.
    default:
      return null;
  }
}

@Injectable()
export class WebhooksService {
  constructor(
    @Inject(PAGOS_REPOSITORY) private readonly repo: PagosRepository,
    private readonly ledger: LedgerService
  ) {}

  /**
   * Procesa un evento ya verificado (firma). Idempotente por `event_id`; normaliza
   * a la máquina de estados; audita la transición. Nunca lanza por eventos de ruido
   * (pago inexistente, tipo desconocido): el llamante responde 2xx.
   */
  async procesar(evento: EventoWebhook): Promise<void> {
    const destino = estadoDestino(evento.type);
    if (!destino) {
      return; // tipo no soportado en esta fase (EARS 6)
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
      return; // transición inválida (p. ej. ya estaba fallido); queda registrado el evento
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
