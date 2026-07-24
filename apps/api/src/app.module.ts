import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PagosModule } from "./modules/pagos/pagos.module";
import { LedgerModule } from "./modules/ledger/ledger.module";
import { HealthController } from "./health/health.controller";

/**
 * EvePay — núcleo de la plataforma de pagos.
 * Solo módulos de pagos. NO conoce el dominio de ninguna vertical (§8).
 * Arranque mínimo: `pagos` + `ledger` (los demás módulos se agregan cuando la
 * validación los pida, no antes).
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PagosModule, LedgerModule],
  controllers: [HealthController]
})
export class AppModule {}
