import { Inject, Injectable } from "@nestjs/common";
import type { Cobro, CrearCobroInput, PaymentProvider } from "@evetev/shared";
import { PAYMENT_PROVIDER } from "./payment-provider.token";

/**
 * Casos de uso de cobros. Cimiento no-reescribible (§1, §4): idempotencia.
 *
 * TODO (spec-driven, §9): persistir cobros, máquina de estados
 * (creado → pendiente → aprobado/fallido → conciliado) y auditoría inmutable.
 * Este arranque solo cablea la frontera con el PaymentProvider e ilustra la
 * idempotencia en memoria; la lógica real llega con su spec.
 */
@Injectable()
export class PagosService {
  private readonly porIdempotencyKey = new Map<string, Cobro>();

  constructor(@Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider) {}

  async crearCobro(input: CrearCobroInput, idempotencyKey: string): Promise<Cobro> {
    // Reintentar con la misma clave nunca cobra dos veces (§4).
    const existente = this.porIdempotencyKey.get(idempotencyKey);
    if (existente) {
      return existente;
    }

    const cobro = await this.provider.crearCobro(input, idempotencyKey);
    this.porIdempotencyKey.set(idempotencyKey, cobro);
    return cobro;
  }
}
