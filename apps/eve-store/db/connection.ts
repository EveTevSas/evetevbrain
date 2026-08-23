import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

type SqlClient = ReturnType<typeof postgres>;

/* En desarrollo Next recarga los módulos en cada cambio; sin esto se abre un
 * pool nuevo por recarga hasta agotar las conexiones de Postgres. Mismo patrón
 * que usa EveConecta. */
const global_ = globalThis as typeof globalThis & { eveStoreSql?: SqlClient };

function cliente(): SqlClient {
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("postgres")) {
    throw new Error(
      "DATABASE_URL no está configurada. Copia apps/eve-store/.env.example a " +
        ".env.local y rellénala desde el panel de Supabase."
    );
  }
  const c = global_.eveStoreSql ?? postgres(url, { max: 5, onnotice: () => {} });
  if (process.env.NODE_ENV !== "production") global_.eveStoreSql = c;
  return c;
}

export function db(): PostgresJsDatabase<typeof schema> {
  return drizzle(cliente(), { schema });
}
