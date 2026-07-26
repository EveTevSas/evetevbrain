import { Module } from "@nestjs/common";
import { LedgerService } from "./ledger.service";

/**
 * Módulo `ledger`. El repositorio viene del módulo global (RepositoriesModule).
 * Expone LedgerService para que `webhooks`/`pagos` asienten movimientos.
 */
@Module({
  providers: [LedgerService],
  exports: [LedgerService]
})
export class LedgerModule {}
