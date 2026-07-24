import { Injectable } from "@nestjs/common";

/**
 * Ledger / libro de movimientos inmutable: la verdad contable de cada peso que
 * entra y sale (§2). Cimiento no-reescribible.
 *
 * TODO (spec-driven, §9): asientos inmutables (sin borrado ni edición), ligados
 * a cada transición de estado de un cobro. Arranque mínimo: solo la costura.
 */
@Injectable()
export class LedgerService {
  registrarPendiente(): void {
    // Placeholder — la lógica contable real llega con su spec.
  }
}
