import { randomBytes } from "node:crypto";
import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  OUTBOUND_WEBHOOKS_REPOSITORY,
  type OutboundWebhooksRepository,
  type WebhookConfig
} from "./outbound-webhooks.repository";

export interface RegistrarWebhookInput {
  url: string;
  events?: string[];
}

export interface WebhookRegistrado {
  id: string;
  url: string;
  events: string[];
  activa: boolean;
  /** Mostrar una sola vez al registrar. Null en consultas posteriores. */
  secret?: string;
}

const EVENTOS_SOPORTADOS = ["payment.completed", "payment.failed"];

function generarSecret(): string {
  return `ewhs_${randomBytes(32).toString("base64url")}`;
}

function toPublico(config: WebhookConfig, incluirSecret = false): WebhookRegistrado {
  return {
    id: config.id,
    url: config.url,
    events: config.events,
    activa: config.activa,
    ...(incluirSecret ? { secret: config.secret } : {})
  };
}

@Injectable()
export class OutboundWebhooksService {
  constructor(
    @Inject(OUTBOUND_WEBHOOKS_REPOSITORY)
    private readonly repo: OutboundWebhooksRepository
  ) {}

  async registrar(tenantId: string, input: RegistrarWebhookInput): Promise<WebhookRegistrado> {
    const existing = await this.repo.buscarPorTenant(tenantId);
    if (existing) {
      throw new ConflictException("Ya existe un endpoint registrado. Usa PUT para actualizarlo.");
    }

    const events = input.events ?? EVENTOS_SOPORTADOS;
    const secret = generarSecret();
    const config = await this.repo.registrar({ tenantId, url: input.url, secret, events });
    return toPublico(config, true);
  }

  async obtener(tenantId: string): Promise<WebhookRegistrado> {
    const config = await this.repo.buscarPorTenant(tenantId);
    if (!config) throw new NotFoundException("No hay endpoint registrado.");
    return toPublico(config);
  }

  async actualizar(
    tenantId: string,
    input: Partial<RegistrarWebhookInput & { activa: boolean }>
  ): Promise<WebhookRegistrado> {
    const config = await this.repo.actualizar(tenantId, {
      ...(input.url ? { url: input.url } : {}),
      ...(input.events ? { events: input.events } : {}),
      ...(input.activa !== undefined ? { activa: input.activa } : {})
    });
    if (!config) throw new NotFoundException("No hay endpoint registrado.");
    return toPublico(config);
  }
}
