import "server-only";

import postgres from "postgres";

/**
 * Conexión del Hub: mismo Postgres que EvePay, rol `hub_app`, que solo ve el
 * schema `hub` (spec hub-base, CA-3). Sin ORM: el Hub tiene ocho tablas y
 * consultas planas; un ORM aquí sería peso sin retorno (§6).
 */
declare global {
  var __hubSql: ReturnType<typeof postgres> | undefined;
}

export function db() {
  if (!globalThis.__hubSql) {
    const url = process.env.HUB_DATABASE_URL;
    if (!url) throw new Error("Configura HUB_DATABASE_URL (rol hub_app).");
    globalThis.__hubSql = postgres(url, { max: 5, prepare: false });
  }
  return globalThis.__hubSql;
}

export const mesActual = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

export const trimestreActual = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
};

/**
 * Comprueba que la base del Hub está alcanzable y con el schema aplicado.
 * Devuelve null si todo bien, o un texto que dice qué falta: la URL, el rol
 * `hub_app`, la migración 0024… Lo usa el layout para mostrar una página
 * legible en vez de un 500.
 */
export async function diagnosticoBase(): Promise<string | null> {
  if (!process.env.HUB_DATABASE_URL) {
    return "Falta la variable HUB_DATABASE_URL (conexión al Postgres de EvePay con el rol hub_app).";
  }
  try {
    await db()`select 1 from hub.portales limit 1`;
    return null;
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const codigo = err.code ?? "";
    if (codigo === "3F000" || codigo === "42P01") {
      return "La base responde pero el schema `hub` no existe: falta aplicar la migración 0024_hub.sql en este proyecto Supabase.";
    }
    if (codigo === "28P01" || codigo === "28000") {
      return "La base rechazó la conexión (usuario o contraseña): el rol hub_app no existe en este proyecto o la clave de HUB_DATABASE_URL no coincide.";
    }
    if (codigo === "42501") {
      return "El rol hub_app no tiene permisos sobre el schema `hub`: vuelve a aplicar la migración 0024_hub.sql (los GRANT están ahí).";
    }
    return `No se pudo consultar la base del Hub: ${err.message ?? String(e)}${codigo ? ` (código ${codigo})` : ""}.`;
  }
}
