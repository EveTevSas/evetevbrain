import { Module } from "@nestjs/common";
import { IdentidadModule } from "../identidad/identidad.module";
import { MerchantsController } from "./merchants.controller";
import { MerchantsService } from "./merchants.service";

/**
 * Módulo `merchants` (onboarding de comercios). Repositorio y PaymentProvider vienen
 * del módulo global. Exporta MerchantsService para que `webhooks` apruebe altas.
 */
@Module({
  imports: [IdentidadModule],
  controllers: [MerchantsController],
  providers: [MerchantsService],
  exports: [MerchantsService]
})
export class MerchantsModule {}
