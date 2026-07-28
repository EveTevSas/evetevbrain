export const OUTBOUND_WEBHOOKS_REPOSITORY = "OUTBOUND_WEBHOOKS_REPOSITORY";

export interface WebhookConfig {
  id: string;
  tenantId: string;
  url: string;
  secret: string;
  events: string[];
  activa: boolean;
}

export interface NuevoWebhook {
  tenantId: string;
  url: string;
  secret: string;
  events: string[];
}

export interface OutboundWebhooksRepository {
  buscarPorTenant(tenantId: string): Promise<WebhookConfig | null>;
  registrar(data: NuevoWebhook): Promise<WebhookConfig>;
  actualizar(tenantId: string, data: Partial<Pick<WebhookConfig, "url" | "events" | "activa">>): Promise<WebhookConfig | null>;
}
