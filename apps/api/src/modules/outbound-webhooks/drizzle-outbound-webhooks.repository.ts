import { eq, sql } from "drizzle-orm";
import type { Db } from "../../database/drizzle";
import { merchantWebhooks } from "../../database/schema";
import type { OutboundWebhooksRepository, WebhookConfig, NuevoWebhook } from "./outbound-webhooks.repository";

type Row = typeof merchantWebhooks.$inferSelect;

function toConfig(row: Row): WebhookConfig {
  return {
    id: row.id,
    tenantId: row.tenantId,
    url: row.url,
    secret: row.secret,
    events: row.events ?? [],
    activa: row.activa
  };
}

export class DrizzleOutboundWebhooksRepository implements OutboundWebhooksRepository {
  constructor(private readonly db: Db) {}

  async buscarPorTenant(tenantId: string): Promise<WebhookConfig | null> {
    // SECURITY DEFINER evita el filtro RLS cuando el tenant aún no está en contexto.
    const rows = await this.db.execute<{
      id: string;
      url: string;
      secret: string;
      events: string[];
      activa: boolean;
    }>(sql`SELECT id, url, secret, events, activa FROM evepay.webhook_config_por_tenant(${tenantId})`);

    const row = (rows as typeof rows)[0];
    if (!row) return null;
    return { id: row.id, tenantId, url: row.url, secret: row.secret, events: row.events, activa: row.activa };
  }

  async registrar(data: NuevoWebhook): Promise<WebhookConfig> {
    const inserted = await this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${data.tenantId}, true)`);
      const rows = await tx
        .insert(merchantWebhooks)
        .values({ tenantId: data.tenantId, url: data.url, secret: data.secret, events: data.events })
        .returning();
      return rows[0]!;
    });
    return toConfig(inserted);
  }

  async actualizar(tenantId: string, data: Partial<Pick<WebhookConfig, "url" | "events" | "activa">>): Promise<WebhookConfig | null> {
    const updated = await this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
      const rows = await tx
        .update(merchantWebhooks)
        .set({ ...data })
        .where(eq(merchantWebhooks.tenantId, tenantId))
        .returning();
      return rows[0] ?? null;
    });
    return updated ? toConfig(updated) : null;
  }
}
