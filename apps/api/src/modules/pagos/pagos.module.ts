import { Module } from "@nestjs/common";
import { PagosController } from "./pagos.controller";
import { PagosService } from "./pagos.service";
import { FakePaymentProvider } from "./fake-payment.provider";
import { PAYMENT_PROVIDER } from "./payment-provider.token";

/**
 * Módulo `pagos` de EvePay. Expone su API pública (el controller) y oculta su
 * implementación (§3). El PaymentProvider se resuelve por token: hoy el fake,
 * mañana Akua, sin tocar el núcleo (§4, §7).
 */
@Module({
  controllers: [PagosController],
  providers: [PagosService, { provide: PAYMENT_PROVIDER, useClass: FakePaymentProvider }],
  exports: [PagosService]
})
export class PagosModule {}
