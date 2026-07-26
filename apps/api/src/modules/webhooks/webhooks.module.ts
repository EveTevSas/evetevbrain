import { Module } from "@nestjs/common";
import { LedgerModule } from "../ledger/ledger.module";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";
import { AkuaWebhookVerifier, WEBHOOK_VERIFIER } from "./webhook-verifier";

/**
 * Módulo `webhooks`: normaliza los eventos del proveedor a eventos internos (§8).
 * El repositorio viene del módulo global; el ledger, de LedgerModule.
 */
@Module({
  imports: [LedgerModule],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    {
      provide: WEBHOOK_VERIFIER,
      useFactory: () => new AkuaWebhookVerifier(process.env.AKUA_WEBHOOK_SECRET ?? "")
    }
  ]
})
export class WebhooksModule {}
