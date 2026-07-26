import { Global, Module } from "@nestjs/common";
import { DB, type Db } from "./drizzle";
import { PAGOS_REPOSITORY } from "../modules/pagos/pagos.repository";
import { DrizzlePagosRepository } from "../modules/pagos/drizzle-pagos.repository";
import { InMemoryPagosRepository } from "../modules/pagos/in-memory-pagos.repository";

/**
 * Provee el repositorio de pagos como singleton global, para que `pagos` y
 * `webhooks` compartan la MISMA instancia. Drizzle/Postgres si hay DATABASE_URL,
 * si no in-memory.
 */
@Global()
@Module({
  providers: [
    {
      provide: PAGOS_REPOSITORY,
      inject: [DB],
      useFactory: (db: Db | null) =>
        db ? new DrizzlePagosRepository(db) : new InMemoryPagosRepository()
    }
  ],
  exports: [PAGOS_REPOSITORY]
})
export class RepositoriesModule {}
