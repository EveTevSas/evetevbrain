import { randomUUID } from "node:crypto";
import {
  type LedgerLineInput,
  type LedgerRepository,
  type PostEntryArgs
} from "./ledger.repository";

interface EntryRow {
  id: string;
  tenantId: string;
  paymentId?: string;
  kind: string;
  memo: string;
}

interface LineRow extends LedgerLineInput {
  entryId: string;
  tenantId: string;
}

/** Adaptador in-memory del ledger (tests/local). Replica idempotencia y aislamiento. */
export class InMemoryLedgerRepository implements LedgerRepository {
  readonly entries: EntryRow[] = [];
  readonly lines: LineRow[] = [];

  async postEntry(args: PostEntryArgs): Promise<{ posted: boolean; entryId?: string }> {
    if (
      args.paymentId &&
      this.entries.some(
        (e) =>
          e.tenantId === args.tenantId && e.paymentId === args.paymentId && e.kind === args.kind
      )
    ) {
      return { posted: false };
    }

    const id = randomUUID();
    this.entries.push({
      id,
      tenantId: args.tenantId,
      paymentId: args.paymentId,
      kind: args.kind,
      memo: args.memo
    });
    for (const l of args.lines) {
      this.lines.push({
        entryId: id,
        tenantId: args.tenantId,
        account: l.account,
        direction: l.direction,
        amountMinor: l.amountMinor
      });
    }
    return { posted: true, entryId: id };
  }

  async movimientosCuenta(
    tenantId: string,
    account: string
  ): Promise<{ debitos: number; creditos: number }> {
    let debitos = 0;
    let creditos = 0;
    for (const l of this.lines) {
      if (l.tenantId === tenantId && l.account === account) {
        if (l.direction === "debit") debitos += l.amountMinor;
        else creditos += l.amountMinor;
      }
    }
    return { debitos, creditos };
  }

  async contarAsientosPorPago(tenantId: string, paymentId: string): Promise<number> {
    return this.entries.filter((e) => e.tenantId === tenantId && e.paymentId === paymentId).length;
  }
}
