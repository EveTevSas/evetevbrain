/**
 * Código SQLSTATE y mensaje de un error de la base, venga como venga.
 *
 * Drizzle envuelve el error del driver en un DrizzleQueryError y deja el de
 * Postgres en `cause`; el código (23505, 23514, P0002…) y el mensaje que
 * escribió la función SQL están ahí, no en el envoltorio. Leerlos en un solo
 * sitio evita que cada repositorio compare contra el objeto equivocado y
 * convierta un "ya existe" en un 500.
 */
export function errorDeBase(error: unknown): { code: string | undefined; message: string } {
  const envoltorio = error as { code?: unknown; message?: unknown; cause?: unknown };
  const causa = envoltorio.cause as { code?: unknown; message?: unknown } | undefined;
  const code = (causa?.code ?? envoltorio.code) as string | undefined;
  const message = String(causa?.message ?? envoltorio.message ?? "");
  return { code, message: message.replace(/^error:\s*/i, "") };
}
