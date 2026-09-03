import { Inject, Injectable } from "@nestjs/common";
import type { PaymentProvider } from "@evetev/shared";
import { PAGOS_REPOSITORY, type PagosRepository } from "../pagos/pagos.repository";
import { PAYMENT_PROVIDER } from "../pagos/payment-provider.token";
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
    @Inject(PAGOS_REPOSITORY) private readonly pagos: PagosRepository,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider
  ) {}

  /**
   * Cuenta de compensación: el dinero que el proveedor tiene nuestro mientras
   * no lo liquida. Va nombrada POR PROVEEDOR y no con un nombre fijo.
   *
   * Estaba escrita a mano como "akua_clearing", de cuando Akua era la única
   * adquirencia. Con ComboPay activo, el dinero en tránsito habría seguido
   * cayendo en una cuenta con el nombre de un proveedor que no lo tiene, y con
   * dos proveedores sería imposible decir cuánto debe cada uno. Los asientos
   * anteriores conservan su nombre: el ledger es inmutable y aquel dinero sí
   * lo tenía Akua.
   */
  private get cuentaCompensacion(): string {
    return `clearing:${this.provider.nombre}`;
  }

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
        { account: this.cuentaCompensacion, direction: "debit", amountMinor: cobro.montoMinor },
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
   * ingreso en banco. Débito `banco` / crédito la compensación del proveedor.
   * Idempotente por pago.
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
        { account: this.cuentaCompensacion, direction: "credit", amountMinor: cobro.montoMinor }
      ]
    });
  }

  /** Saldo reconstruido de una cuenta (créditos − débitos). */
  async saldo(tenantId: string, account: string): Promise<number> {
    return this.ledger.saldoCuenta(tenantId, account);
  }
}
