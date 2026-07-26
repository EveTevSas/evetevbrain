import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../../database/drizzle";
import { ledgerEntries, ledgerLines } from "../../database/schema";
import { type LedgerRepository, type PostEntryArgs } from "./ledger.repository";

/**
 * Adaptador Drizzle/Postgres del ledger. Cada operación abre transacción y hace
 * `SET LOCAL app.tenant_id` para RLS (§4). No se ejercita en los tests de este repo
 * (necesita Postgres); su verificación real corre contra Supabase.
 */
export class DrizzleLedgerRepository implements LedgerRepository {
  constructor(private readonly db: Db) {}

  async postEntry(args: PostEntryArgs): Promise<{ posted: boolean; entryId?: string }> {
    return this.db.transaction(async (tx): Promise<{ posted: boolean; entryId?: string }> => {
      await tx.execute(sql`select set_config('app.tenant_id', ${args.tenantId}, true)`);

      const inserted = await tx
        .insert(ledgerEntries)
        .values({
          tenantId: args.tenantId,
          paymentId: args.paymentId ?? null,
          kind: args.kind,
          memo: args.memo
        })
        .onConflictDoNothing()
        .returning({ id: ledgerEntries.id });

      const entry = inserted[0];
      if (!entry) {
        return { posted: false };
      }

      await tx.insert(ledgerLines).values(
        args.lines.map((l) => ({
          entryId: entry.id,
          tenantId: args.tenantId,
          account: l.account,
          direction: l.direction,
          amountMinor: l.amountMinor
        }))
      );

      return { posted: true, entryId: entry.id };
    });
  }

  async saldoCuenta(tenantId: string, account: string): Promise<number> {
    return this.db.transaction(async (tx): Promise<number> => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
      const rows = await tx
        .select({
          net: sql<number>`coalesce(sum(case when ${ledgerLines.direction} = 'credit' then ${ledgerLines.amountMinor} else -${ledgerLines.amountMinor} end), 0)`
        })
        .from(ledgerLines)
        .where(and(eq(ledgerLines.tenantId, tenantId), eq(ledgerLines.account, account)));
      return Number(rows[0]?.net ?? 0);
    });
  }

  async contarAsientosPorPago(tenantId: string, paymentId: string): Promise<number> {
    return this.db.transaction(async (tx): Promise<number> => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
      const rows = await tx
        .select({ n: sql<number>`count(*)` })
        .from(ledgerEntries)
        .where(and(eq(ledgerEntries.tenantId, tenantId), eq(ledgerEntries.paymentId, paymentId)));
      return Number(rows[0]?.n ?? 0);
    });
  }
}
