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
