import "server-only";

import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";
import * as schema from "./schema";

const databaseUrlSchema = z.string().url().startsWith("postgres");
const userIdSchema = z.string().uuid();

type EveConectaDatabase = PostgresJsDatabase<typeof schema>;
type EveConectaTransaction = Parameters<
  Parameters<EveConectaDatabase["transaction"]>[0]
>[0];
type DatabaseCallback<T> = (database: EveConectaTransaction) => Promise<T>;
type SqlClient = ReturnType<typeof postgres>;

const globalDatabase = globalThis as typeof globalThis & {
  eveConectaSqlClient?: SqlClient;
};

function getSqlClient(): SqlClient {
  const result = databaseUrlSchema.safeParse(process.env.DATABASE_URL);

  if (!result.success) {
    throw new Error(
      "DATABASE_URL no está configurada correctamente para el servidor de EveConecta."
    );
  }

  const client =
    globalDatabase.eveConectaSqlClient ??
    postgres(result.data, {
      max: process.env.NODE_ENV === "production" ? 10 : 3,
      prepare: false
    });

  if (process.env.NODE_ENV !== "production") {
    globalDatabase.eveConectaSqlClient = client;
  }

  return client;
}

/**
 * Ejecuta un caso de uso con la identidad real de Supabase y RLS habilitado.
 * No exportamos una conexión privilegiada para evitar consultas que omitan el tenant.
 */
export async function withUserDatabase<T>(
  userId: string,
  callback: DatabaseCallback<T>
): Promise<T> {
  const validatedUserId = userIdSchema.parse(userId);
  const sqlClient = getSqlClient();
  const database = drizzle(sqlClient, { schema });

  return database.transaction(async (transaction) => {
    await transaction.execute(
      sql`select set_config('request.jwt.claim.sub', ${validatedUserId}, true)`
    );
    await transaction.execute(sql.raw("set local role authenticated"));

    return callback(transaction);
  });
}
