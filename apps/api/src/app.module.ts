import { type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module";
import { RepositoriesModule } from "./database/repositories.module";
import { TenantMiddleware } from "./common/tenant.middleware";
import { PagosModule } from "./modules/pagos/pagos.module";
import { PagosController } from "./modules/pagos/pagos.controller";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";
import { LedgerModule } from "./modules/ledger/ledger.module";
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
    LedgerModule
  ],
  controllers: [HealthController]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Establece el contexto por request (tenant/actor/rol) en las rutas de pagos.
    consumer.apply(TenantMiddleware).forRoutes(PagosController);
  }
}
