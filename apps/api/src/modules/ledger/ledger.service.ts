import { Inject, Injectable } from "@nestjs/common";
import { PAGOS_REPOSITORY, type PagosRepository } from "../pagos/pagos.repository";
import {
  LEDGER_REPOSITORY,
  LedgerDesbalanceadoError,
  type LedgerRepository,
  type PostEntryArgs
} from "./ledger.repository";

/**
 * Ledger / libro de movimientos inmutable (§2): la verdad contable de cada peso.
 * Doble partida balanceada; el saldo se reconstruye desde las líneas.
 */
@Injectable()
export class LedgerService {
  constructor(
    @Inject(LEDGER_REPOSITORY) private readonly ledger: LedgerRepository,
    @Inject(PAGOS_REPOSITORY) private readonly pagos: PagosRepository
  ) {}

  /** Asienta un movimiento validando el balance (Σ débitos == Σ créditos). */
  async postAsiento(args: PostEntryArgs): Promise<{ posted: boolean; entryId?: string }> {
    let debit = 0;
    let credit = 0;
    for (const l of args.lines) {
      if (l.direction === "debit") debit += l.amountMinor;
      else credit += l.amountMinor;
    }
    if (args.lines.length === 0 || debit !== credit) {
      throw new LedgerDesbalanceadoError(debit, credit);
    }
    return this.ledger.postEntry(args);
  }

  /**
   * Asiento de un cobro aprobado: débito en la compensación del proveedor (activo)
   * y crédito en lo que le debemos al comercio (pasivo). Idempotente por pago.
   */
  async registrarCobroAprobado(
    tenantId: string,
    paymentId: string
  ): Promise<{ posted: boolean; entryId?: string }> {
    const cobro = await this.pagos.buscarCobro(tenantId, paymentId);
    if (!cobro) {
      return { posted: false };
    }
    return this.postAsiento({
      tenantId,
      paymentId,
      kind: "cobro_aprobado",
      memo: `Cobro aprobado ${cobro.referencia}`,
      lines: [
        { account: "akua_clearing", direction: "debit", amountMinor: cobro.montoMinor },
        {
          account: `merchant_payable:${cobro.merchantId}`,
          direction: "credit",
          amountMinor: cobro.montoMinor
        }
      ]
    });
  }

  /**
   * Asiento de conciliación: cierra la compensación del proveedor y reconoce el
   * ingreso en banco. Débito `banco` / crédito `akua_clearing`. Idempotente por pago.
   */
  async registrarCobroConciliado(
    tenantId: string,
    paymentId: string
  ): Promise<{ posted: boolean; entryId?: string }> {
    const cobro = await this.pagos.buscarCobro(tenantId, paymentId);
    if (!cobro) {
      return { posted: false };
    }
    return this.postAsiento({
      tenantId,
      paymentId,
      kind: "cobro_conciliado",
      memo: `Cobro conciliado ${cobro.referencia}`,
      lines: [
        { account: "banco", direction: "debit", amountMinor: cobro.montoMinor },
        { account: "akua_clearing", direction: "credit", amountMinor: cobro.montoMinor }
      ]
    });
  }

  /** Saldo reconstruido de una cuenta (créditos − débitos). */
  async saldo(tenantId: string, account: string): Promise<number> {
    return this.ledger.saldoCuenta(tenantId, account);
  }
}
