import { Inject, Injectable } from "@nestjs/common";
import type {
  LiquidacionProvider,
  PaymentProvider,
  RangoFechas,
  ReporteConciliacion
} from "@evetev/shared";
import { PAGOS_REPOSITORY, type PagosRepository } from "../pagos/pagos.repository";
import { PAYMENT_PROVIDER } from "../pagos/payment-provider.token";
import { LedgerService } from "../ledger/ledger.service";

/**
 * Conciliación (§1): cruza los cobros aprobados con las liquidaciones del proveedor
 * y verifica que lo cobrado cuadra con lo liquidado. Idempotente.
 */
@Injectable()
export class ReconciliacionService {
  constructor(
    @Inject(PAGOS_REPOSITORY) private readonly repo: PagosRepository,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly ledger: LedgerService
  ) {}

  async conciliar(tenantId: string, rango: RangoFechas): Promise<ReporteConciliacion> {
    const cobros = await this.repo.listarCobrosAprobados(tenantId, rango);
    const liquidaciones = await this.provider.listarLiquidaciones(rango);

    const porProvider = new Map<string, LiquidacionProvider>();
    for (const l of liquidaciones) {
      porProvider.set(l.providerPaymentId, l);
    }

    let conciliados = 0;
    let diferencias = 0;
    let noConciliados = 0;
    const cruzados = new Set<string>();

    for (const cobro of cobros) {
      const liq = porProvider.get(cobro.providerPaymentId);
      if (!liq) {
        noConciliados++;
        continue;
      }
      cruzados.add(cobro.providerPaymentId);
      if (liq.montoMinor !== cobro.montoMinor) {
        diferencias++;
        continue;
      }
      await this.repo.aplicarTransicion({
        tenantId,
        paymentId: cobro.paymentId,
        desde: "aprobado",
        hacia: "conciliado",
        actor: "conciliacion"
      });
      await this.ledger.registrarCobroConciliado(tenantId, cobro.paymentId);
      conciliados++;
    }

    let huerfanosProveedor = 0;
    for (const l of liquidaciones) {
      if (!cruzados.has(l.providerPaymentId)) {
        huerfanosProveedor++;
      }
    }

    return { rango, conciliados, diferencias, huerfanosProveedor, noConciliados };
  }
}
