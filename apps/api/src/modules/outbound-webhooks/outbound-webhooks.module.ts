import { Module } from "@nestjs/common";
import { DB, type Db } from "../../database/drizzle";
import { OUTBOUND_WEBHOOKS_REPOSITORY } from "./outbound-webhooks.repository";
import { DrizzleOutboundWebhooksRepository } from "./drizzle-outbound-webhooks.repository";
import { OutboundWebhooksService } from "./outbound-webhooks.service";
import { OutboundWebhookDeliveryService } from "./outbound-webhook-delivery.service";
import { OutboundWebhooksController } from "./outbound-webhooks.controller";

@Module({
  controllers: [OutboundWebhooksController],
  providers: [
    {
      provide: OUTBOUND_WEBHOOKS_REPOSITORY,
      inject: [DB],
      useFactory: (db: Db) => new DrizzleOutboundWebhooksRepository(db)
    },
    OutboundWebhooksService,
    OutboundWebhookDeliveryService
  ],
  exports: [OutboundWebhookDeliveryService, OUTBOUND_WEBHOOKS_REPOSITORY]
})
export class OutboundWebhooksModule {}
