import { Inject, Injectable } from "@nestjs/common";
import { desglosarCobro, type DesgloseCobro, type PaymentProvider } from "@evetev/shared";
import {
  PAGOS_REPOSITORY,
  type CobroConTarifas,
  type PagosRepository
} from "../pagos/pagos.repository";
import { PAYMENT_PROVIDER } from "../pagos/payment-provider.token";
import { TARIFAS_REPOSITORY, type TarifasRepository } from "../tarifas/tarifas.repository";
import { CUENTAS } from "./cuentas";
import {
  LEDGER_REPOSITORY,
  LedgerDesbalanceadoError,
  type LedgerLineInput,
  type LedgerRepository,
  type PostEntryArgs
} from "./ledger.repository";

/** El proveedor activo liquida directo al comercio: ese modelo no tiene spec. */
export class ModeloSinCustodiaError extends Error {
  constructor(provider: string) {
    super(
      `El proveedor "${provider}" no custodia el recaudo en EvePay. El ledger solo sabe asentar con custodia (spec ledger-custodia); un proveedor que liquida directo al comercio necesita su propia spec.`
    );
    this.name = "ModeloSinCustodiaError";
  }
}

/** Sin tarifa fijada (cobros anteriores a la Fase 6): comisión y costo cero. */
const SIN_TARIFA = { bps: 0, fijoMinor: 0 } as const;

/**
 * Ledger / libro de movimientos inmutable (§2): la verdad contable de cada peso.
 * Doble partida balanceada; el saldo se reconstruye desde las líneas.
 *
 * EvePay custodia el dinero de los comercios: cada cobro aprobado se reparte
 * en el asiento entre lo que se le debe al comercio, la comisión de EvePay, su
 * IVA y el costo del proveedor, con las tarifas fijadas en el cobro al
 * crearlo. Así el libro dice de quién es cada peso antes de que llegue.
 */
@Injectable()
export class LedgerService {
  constructor(
    @Inject(LEDGER_REPOSITORY) private readonly ledger: LedgerRepository,
    @Inject(PAGOS_REPOSITORY) private readonly pagos: PagosRepository,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    @Inject(TARIFAS_REPOSITORY) private readonly tarifas: TarifasRepository
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
   * Reparte el cobro con las tarifas que quedaron fijadas en él (CA-5 de
   * `comisiones`): cambiar una tarifa después no toca este cálculo. Un cobro
   * anterior a la Fase 6 no tiene tarifas: todo es del comercio.
   */
  private async desgloseDe(
    cobro: CobroConTarifas
  ): Promise<{ desglose: DesgloseCobro; descuentaEnConsignacion: boolean }> {
    const tarifa = cobro.tarifaId ? await this.tarifas.tarifaPorId(cobro.tarifaId) : null;
    const tarifaProveedor = cobro.tarifaProveedorId
      ? await this.tarifas.tarifaProveedorPorId(cobro.tarifaProveedorId)
      : null;

    if (cobro.tarifaId && !tarifa) {
      throw new Error(`El cobro ${cobro.id} referencia una tarifa que no existe.`);
    }
    if (cobro.tarifaProveedorId && !tarifaProveedor) {
      throw new Error(`El cobro ${cobro.id} referencia una tarifa de proveedor que no existe.`);
    }

    return {
      desglose: desglosarCobro(
        cobro.montoMinor,
        tarifa ?? { ...SIN_TARIFA, ivaBps: 0 },
        tarifaProveedor ?? SIN_TARIFA
      ),
      descuentaEnConsignacion: tarifaProveedor?.descuentaEnConsignacion ?? true
    };
  }

  /** Lo que el proveedor debe consignar por el cobro: M − P si descuenta su tarifa, M si no. */
  private esperadoDelProveedor(desglose: DesgloseCobro, descuenta: boolean): number {
    return descuenta ? desglose.montoMinor - desglose.costoProveedor : desglose.montoMinor;
  }

  /**
   * Asiento del cobro aprobado (CA-1, CA-2): débito `clearing:<proveedor>` por
   * el monto; créditos a lo que se le debe al comercio, la comisión y su IVA;
   * y el costo del proveedor contra `clearing` (si lo descuenta al consignar)
   * o `por_pagar` (si lo factura aparte). Las líneas en 0 se omiten.
   * Idempotente por pago.
   */
  async registrarCobroAprobado(
    tenantId: string,
    paymentId: string
  ): Promise<{ posted: boolean; entryId?: string }> {
    if (!this.provider.capacidades.custodia) {
      throw new ModeloSinCustodiaError(this.provider.nombre);
    }

    const cobro = await this.pagos.buscarCobroConTarifas(tenantId, paymentId);
    if (!cobro) {
      return { posted: false };
    }

    const { desglose: d, descuentaEnConsignacion } = await this.desgloseDe(cobro);
    const clearing = CUENTAS.clearing(cobro.provider);

    const candidatas: LedgerLineInput[] = [
      { account: clearing, direction: "debit", amountMinor: d.montoMinor },
      {
        account: CUENTAS.merchantPayable(cobro.merchantId),
        direction: "credit",
        amountMinor: d.alComercio
      },
      { account: CUENTAS.comisionEvepay, direction: "credit", amountMinor: d.comision },
      { account: CUENTAS.ivaPorPagar, direction: "credit", amountMinor: d.iva },
      {
        account: CUENTAS.costoProveedor(cobro.provider),
        direction: "debit",
        amountMinor: d.costoProveedor
      },
      {
        account: descuentaEnConsignacion ? clearing : CUENTAS.porPagar(cobro.provider),
        direction: "credit",
        amountMinor: d.costoProveedor
      }
    ];
    // Las líneas en 0 se omiten (CA-2): la base exige montos positivos.
    const lines = candidatas.filter((l) => l.amountMinor > 0);

    return this.postAsiento({
      tenantId,
      paymentId,
      kind: "cobro_aprobado",
      memo: `Cobro aprobado ${cobro.referencia}`,
      lines
    });
  }

  /**
   * Asiento de conciliación automática (proveedores con liquidaciones por
   * API): el dinero pasa de «en tránsito» a la cuenta de recaudo. Débito
   * `recaudo` / crédito `clearing:<proveedor>` por lo que el proveedor debía
   * de ese cobro. Idempotente por pago.
   *
   * Para ComboPay, sin liquidaciones por API, este asiento lo hace la base en
   * `admin_registrar_consignacion` (consignación asistida).
   */
  async registrarCobroConciliado(
    tenantId: string,
    paymentId: string
  ): Promise<{ posted: boolean; entryId?: string }> {
    const cobro = await this.pagos.buscarCobroConTarifas(tenantId, paymentId);
    if (!cobro) {
      return { posted: false };
    }

    const { desglose, descuentaEnConsignacion } = await this.desgloseDe(cobro);
    const esperado = this.esperadoDelProveedor(desglose, descuentaEnConsignacion);

    return this.postAsiento({
      tenantId,
      paymentId,
      kind: "cobro_conciliado",
      memo: `Cobro conciliado ${cobro.referencia}`,
      lines: [
        { account: CUENTAS.recaudo, direction: "debit", amountMinor: esperado },
        { account: CUENTAS.clearing(cobro.provider), direction: "credit", amountMinor: esperado }
      ]
    });
  }

  /** Saldo reconstruido de una cuenta (créditos − débitos). */
  async saldo(tenantId: string, account: string): Promise<number> {
    return this.ledger.saldoCuenta(tenantId, account);
  }
}
