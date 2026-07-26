import { Module } from "@nestjs/common";
import { IdentidadModule } from "../identidad/identidad.module";
import { PagosController } from "./pagos.controller";
import { PagosService } from "./pagos.service";
import { FakePaymentProvider } from "./fake-payment.provider";
import { AkuaPaymentProvider } from "./akua-payment.provider";
import { PAYMENT_PROVIDER } from "./payment-provider.token";

/**
 * Módulo `pagos` de EvePay. El proveedor se resuelve por token: Akua si
 * `PAYMENT_PROVIDER=akua`, si no el fake (§4, §7). El repositorio viene del
 * módulo global (RepositoriesModule), compartido con `webhooks`.
 */
@Module({
  imports: [IdentidadModule],
  controllers: [PagosController],
  providers: [
    PagosService,
    {
      provide: PAYMENT_PROVIDER,
      useFactory: () =>
        process.env.PAYMENT_PROVIDER === "akua"
          ? new AkuaPaymentProvider(process.env.AKUA_API_KEY ?? "")
          : new FakePaymentProvider()
    }
  ],
  exports: [PagosService]
})
export class PagosModule {}
