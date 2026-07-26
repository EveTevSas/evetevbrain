import { Global, Module } from "@nestjs/common";
import { DB, type Db } from "./drizzle";
import { PAGOS_REPOSITORY } from "../modules/pagos/pagos.repository";
import { DrizzlePagosRepository } from "../modules/pagos/drizzle-pagos.repository";
import { InMemoryPagosRepository } from "../modules/pagos/in-memory-pagos.repository";
import { LEDGER_REPOSITORY } from "../modules/ledger/ledger.repository";
import { DrizzleLedgerRepository } from "../modules/ledger/drizzle-ledger.repository";
import { InMemoryLedgerRepository } from "../modules/ledger/in-memory-ledger.repository";

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
    }
  ],
  exports: [PAGOS_REPOSITORY, LEDGER_REPOSITORY]
})
export class RepositoriesModule {}
