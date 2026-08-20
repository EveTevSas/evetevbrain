import { and, eq, sql } from "drizzle-orm";
import type { EstadoMerchant, Merchant } from "@evetev/shared";
import type { Db } from "../../database/drizzle";
import { merchants } from "../../database/schema";
import {
  type MerchantsRepository,
  type NuevoMerchant,
  type ResolucionMerchant
} from "./merchants.repository";

type Row = typeof merchants.$inferSelect;

/** Adaptador Drizzle/Postgres de merchants (RLS por tenant vía SET LOCAL). */
export class DrizzleMerchantsRepository implements MerchantsRepository {
  constructor(private readonly db: Db) {}

  private aMerchant(row: Row): Merchant {
    return {
      id: row.id,
      legalName: row.legalName,
      estado: row.status as EstadoMerchant,
      creadoEn: row.createdAt.toISOString()
    };
  }

  async crear(nuevo: NuevoMerchant): Promise<Merchant> {
    return this.db.transaction(async (tx): Promise<Merchant> => {
      await tx.execute(sql`select set_config('app.tenant_id', ${nuevo.tenantId}, true)`);
      const inserted = await tx
        .insert(merchants)
        .values({
          tenantId: nuevo.tenantId,
          legalName: nuevo.legalName,
          provider: nuevo.provider,
          providerMerchantId: nuevo.providerMerchantId,
          status: nuevo.estado
        })
        .returning();
      return this.aMerchant(inserted[0]!);
    });
  }

  async buscarPorTenant(tenantId: string): Promise<Merchant | null> {
    return this.db.transaction(async (tx): Promise<Merchant | null> => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
      const rows = await tx
        .select()
        .from(merchants)
        .where(eq(merchants.tenantId, tenantId))
        .limit(1);
      const row = rows[0];
      return row ? this.aMerchant(row) : null;
    });
  }

  async buscar(tenantId: string, merchantId: string): Promise<Merchant | null> {
    return this.db.transaction(async (tx): Promise<Merchant | null> => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
      const rows = await tx
        .select()
        .from(merchants)
        .where(and(eq(merchants.id, merchantId), eq(merchants.tenantId, tenantId)))
        .limit(1);
      const row = rows[0];
      return row ? this.aMerchant(row) : null;
    });
  }

  async resolverPorProvider(providerMerchantId: string): Promise<ResolucionMerchant | null> {
    const result = await this.db.execute(
      sql`select merchant_id, tenant_id, status from evepay.merchant_by_provider(${providerMerchantId})`
    );
    const rows = result as unknown as Array<{
      merchant_id: string;
      tenant_id: string;
      status: string;
    }>;
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      merchantId: row.merchant_id,
      tenantId: row.tenant_id,
      estado: row.status as EstadoMerchant
    };
  }

  async aplicarEstado(tenantId: string, merchantId: string, estado: EstadoMerchant): Promise<void> {
    await this.db.transaction(async (tx): Promise<void> => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
      await tx
        .update(merchants)
        .set({ status: estado })
        .where(and(eq(merchants.id, merchantId), eq(merchants.tenantId, tenantId)));
    });
  }
}
