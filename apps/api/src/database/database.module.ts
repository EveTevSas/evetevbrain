import { Global, Module } from "@nestjs/common";
import { createDb, DB } from "./drizzle";

/**
 * Provee el cliente Drizzle. Si no hay DATABASE_URL (local/CI sin Supabase),
 * provee `null`: el módulo de pagos cae al repositorio in-memory.
 */
@Global()
@Module({
  providers: [
    {
      provide: DB,
      useFactory: () => {
        const url = process.env.DATABASE_URL;
        return url ? createDb(url) : null;
      }
    }
  ],
  exports: [DB]
})
export class DatabaseModule {}
