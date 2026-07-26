import { Module } from "@nestjs/common";
import { IdentidadModule } from "../identidad/identidad.module";
import { LedgerModule } from "../ledger/ledger.module";
import { ConciliacionController } from "./conciliacion.controller";
import { ReconciliacionService } from "./reconciliacion.service";

/**
 * Módulo `conciliacion`. Repositorio y PaymentProvider vienen del módulo global;
 * el ledger de LedgerModule; el RBAC de IdentidadModule.
 */
@Module({
  imports: [IdentidadModule, LedgerModule],
  controllers: [ConciliacionController],
  providers: [ReconciliacionService],
  exports: [ReconciliacionService]
})
export class ConciliacionModule {}
