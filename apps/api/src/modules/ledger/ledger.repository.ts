export type LineDirection = "debit" | "credit";

export interface LedgerLineInput {
  account: string;
  direction: LineDirection;
  amountMinor: number;
}

export interface PostEntryArgs {
  tenantId: string;
  paymentId?: string;
  kind: string;
  memo: string;
  lines: LedgerLineInput[];
}

/**
 * Puerto del ledger. Adaptadores in-memory (tests/local) y Drizzle/Postgres.
 * Los asientos son inmutables; el saldo se reconstruye desde las líneas.
 */
export interface LedgerRepository {
  /** Inserta asiento + líneas atómicamente. `posted:false` si ya existía (idempotente). */
  postEntry(args: PostEntryArgs): Promise<{ posted: boolean; entryId?: string }>;
  /** Saldo de una cuenta = Σ créditos − Σ débitos (reconstruido). */
  saldoCuenta(tenantId: string, account: string): Promise<number>;
  /** Cantidad de asientos de un pago (para verificación/idempotencia). */
  contarAsientosPorPago(tenantId: string, paymentId: string): Promise<number>;
}

export const LEDGER_REPOSITORY = Symbol("LEDGER_REPOSITORY");

export class LedgerDesbalanceadoError extends Error {
  constructor(debit: number, credit: number) {
    super(`Asiento desbalanceado: débitos=${debit} ≠ créditos=${credit}`);
    this.name = "LedgerDesbalanceadoError";
  }
}
