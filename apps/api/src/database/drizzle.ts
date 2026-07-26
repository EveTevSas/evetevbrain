import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

/** Token de inyección para la instancia de Drizzle (o null si no hay DATABASE_URL). */
export const DB = Symbol("DB");

/**
 * Crea el cliente Drizzle sobre postgres-js. La conexión debe usar un rol que
 * RESPETE RLS (no owner, no BYPASSRLS) — ver supabase/README.md.
 */
export function createDb(databaseUrl: string): Db {
  const client = postgres(databaseUrl, { prepare: false });
  return drizzle(client, { schema });
}
