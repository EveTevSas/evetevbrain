import { Module } from "@nestjs/common";
import { DB, type Db } from "../../database/drizzle";
import { IdentidadModule } from "../identidad/identidad.module";
import { PagosController } from "./pagos.controller";
import { PagosService } from "./pagos.service";
import { FakePaymentProvider } from "./fake-payment.provider";
import { AkuaPaymentProvider } from "./akua-payment.provider";
import { PAYMENT_PROVIDER } from "./payment-provider.token";
import { PAGOS_REPOSITORY } from "./pagos.repository";
import { DrizzlePagosRepository } from "./drizzle-pagos.repository";
import { InMemoryPagosRepository } from "./in-memory-pagos.repository";

/**
 * Módulo `pagos` de EvePay. El proveedor y el repositorio se resuelven por token:
 * - Proveedor: Akua si `PAYMENT_PROVIDER=akua`, si no el fake (§4, §7).
 * - Repositorio: Drizzle/Postgres si hay `DATABASE_URL`, si no in-memory.
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
    },
    {
      provide: PAGOS_REPOSITORY,
      inject: [DB],
      useFactory: (db: Db | null) =>
        db ? new DrizzlePagosRepository(db) : new InMemoryPagosRepository()
    }
  ],
  exports: [PagosService]
})
export class PagosModule {}
