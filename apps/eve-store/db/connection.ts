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
    /* Cierra la conexión tras cinco segundos ociosos, y en todo caso la recicla
     * al minuto. Es la lección de haber cambiado una fuga por un cuelgue: al
     * guardar el cliente entre peticiones, Vercel congela la instancia y el
     * socket muere sin que `postgres.js` se entere. Al despertar escribe sobre
     * una conexión muerta y espera indefinidamente. Reciclar agresivamente hace
     * que ese socket nunca llegue a la siguiente petición. */
    idle_timeout: 5,
    max_lifetime: 60,
    /* Fallar rápido y con un error claro, en vez de dejar la petición colgada
     * hasta que Vercel la mate a los 300 segundos — que es lo que pasó. */
    connect_timeout: 8,
    /* Plazo del lado del servidor: una consulta que se pase de diez segundos se
     * aborta. No cubre el socket muerto —el servidor nunca recibe la consulta—,
     * pero sí una consulta que de verdad se atasque. */
    connection: { statement_timeout: 10_000 },
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
