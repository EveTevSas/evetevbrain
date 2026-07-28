import { Global, Module } from "@nestjs/common";
import { DB, type Db } from "./drizzle";
import { PAGOS_REPOSITORY } from "../modules/pagos/pagos.repository";
import { DrizzlePagosRepository } from "../modules/pagos/drizzle-pagos.repository";
import { InMemoryPagosRepository } from "../modules/pagos/in-memory-pagos.repository";
import { LEDGER_REPOSITORY } from "../modules/ledger/ledger.repository";
import { DrizzleLedgerRepository } from "../modules/ledger/drizzle-ledger.repository";
import { InMemoryLedgerRepository } from "../modules/ledger/in-memory-ledger.repository";
import { PAYMENT_PROVIDER } from "../modules/pagos/payment-provider.token";
import { FakePaymentProvider } from "../modules/pagos/fake-payment.provider";
import { AkuaPaymentProvider } from "../modules/pagos/akua-payment.provider";
import { MERCHANTS_REPOSITORY } from "../modules/merchants/merchants.repository";
import { DrizzleMerchantsRepository } from "../modules/merchants/drizzle-merchants.repository";
import { InMemoryMerchantsRepository } from "../modules/merchants/in-memory-merchants.repository";

/**
 * Provee los repositorios como singletons globales, para que los módulos compartan
 * la MISMA instancia. Drizzle/Postgres si hay DATABASE_URL, si no in-memory.
 */
@Global()
@Module({
  providers: [
    {
      provide: PAGOS_REPOSITORY,
      inject: [DB],
      useFactory: (db: Db | null) =>
        db ? new DrizzlePagosRepository(db) : new InMemoryPagosRepository()
    },
    {
      provide: LEDGER_REPOSITORY,
      inject: [DB],
      useFactory: (db: Db | null) =>
        db ? new DrizzleLedgerRepository(db) : new InMemoryLedgerRepository()
    },
    {
      provide: MERCHANTS_REPOSITORY,
      inject: [DB],
      useFactory: (db: Db | null) =>
        db ? new DrizzleMerchantsRepository(db) : new InMemoryMerchantsRepository()
    },
    {
      provide: PAYMENT_PROVIDER,
      useFactory: () =>
        process.env.PAYMENT_PROVIDER === "akua"
          ? new AkuaPaymentProvider(
              process.env.AKUA_API_KEY ?? "",
              process.env.AKUA_CLIENT_ID ?? "",
              process.env.AKUA_BASE_URL // undefined → usa producción
            )
          : new FakePaymentProvider()
    }
  ],
  exports: [PAGOS_REPOSITORY, LEDGER_REPOSITORY, MERCHANTS_REPOSITORY, PAYMENT_PROVIDER]
})
export class RepositoriesModule {}
