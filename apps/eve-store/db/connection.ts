import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

type SqlClient = ReturnType<typeof postgres>;

/* Un solo cliente por proceso, SIEMPRE.
 *
 * La versión anterior guardaba el cliente solo fuera de producción —
 * `if (NODE_ENV !== "production")`— que es exactamente al revés de lo que hace
 * falta. En producción cada llamada a `db()` abría un pool nuevo que nunca se
 * cerraba, y `db()` se llama varias veces por petición: la página, su
 * `generateMetadata`, el sitemap, el robots y el feed. Las conexiones se
 * acumularon hasta agotar el pooler de Supabase, que en modo sesión admite 15
 * clientes, y la tienda entera empezó a devolver 500.
 *
 * El caché en `globalThis` sirve para las dos cosas a la vez: en desarrollo
 * sobrevive a las recargas de módulo de Next, y en producción evita que se abra
 * más de un pool por instancia.
 */
const global_ = globalThis as typeof globalThis & { eveStoreSql?: SqlClient };

function cliente(): SqlClient {
  if (global_.eveStoreSql) return global_.eveStoreSql;

  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("postgres")) {
    throw new Error(
      "DATABASE_URL no está configurada. Copia apps/eve-store/.env.example a " +
        ".env.local y rellénala desde el panel de Supabase."
    );
  }

  global_.eveStoreSql = postgres(url, {
    /* Una sola conexión por instancia. En un entorno sin servidor cada
     * instancia atiende una petición a la vez, así que un pool de cinco
     * multiplica por cinco el consumo sin ganar nada — y el límite es del
     * pooler, compartido con EveConecta. */
    max: 1,
    /* Cierra la conexión tras veinte segundos ociosos. Sin esto una instancia
     * dormida retiene su hueco del pooler mientras Vercel la mantiene viva. */
    idle_timeout: 20,
    /* Si el pooler está saturado conviene fallar rápido y devolver un error
     * claro, no dejar la petición colgada hasta que el navegador se rinda. */
    connect_timeout: 10,
    /* El pooler en modo transacción no admite sentencias preparadas. Se
     * desactivan siempre: en modo sesión no cuesta nada, y así cambiar de
     * puerto no vuelve a romper nada. */
    prepare: false,
    onnotice: () => {}
  });
  return global_.eveStoreSql;
}

export function db(): PostgresJsDatabase<typeof schema> {
  return drizzle(cliente(), { schema });
}
