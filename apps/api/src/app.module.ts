import { type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module";
import { RepositoriesModule } from "./database/repositories.module";
import { TenantMiddleware } from "./common/tenant.middleware";
import { PagosModule } from "./modules/pagos/pagos.module";
import { PagosController } from "./modules/pagos/pagos.controller";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";
import { LedgerModule } from "./modules/ledger/ledger.module";
import { ConciliacionModule } from "./modules/conciliacion/conciliacion.module";
import { ConciliacionController } from "./modules/conciliacion/conciliacion.controller";
import { MerchantsModule } from "./modules/merchants/merchants.module";
import { MerchantsController } from "./modules/merchants/merchants.controller";
import { AdminModule } from "./modules/admin/admin.module";
import { OutboundWebhooksModule } from "./modules/outbound-webhooks/outbound-webhooks.module";
import { OutboundWebhooksController } from "./modules/outbound-webhooks/outbound-webhooks.controller";
import { HealthController } from "./health/health.controller";

/**
 * EvePay — núcleo de la plataforma de pagos.
 * Solo módulos de pagos. NO conoce el dominio de ninguna vertical (§8).
 * Arranque: `pagos` + `ledger`, sobre cimientos multi-tenant (RLS) e identidad/RBAC.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RepositoriesModule,
    PagosModule,
    WebhooksModule,
    LedgerModule,
    ConciliacionModule,
    MerchantsModule,
    AdminModule,
    OutboundWebhooksModule
  ],
  controllers: [HealthController]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // TenantMiddleware resuelve API keys reales (Bearer evpk_*) o headers internos.
    consumer
      .apply(TenantMiddleware)
      .forRoutes(PagosController, ConciliacionController, MerchantsController, OutboundWebhooksController);
  }
}
