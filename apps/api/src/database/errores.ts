import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";

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

/**
 * Convierte el error de una función SQL en la respuesta HTTP que le toca. Las
 * funciones admin levantan check_violation cuando algo no cuadra o no
 * corresponde, unique_violation cuando ya existe y no_data_found cuando no
 * está; su mensaje ya está escrito para la persona que opera y se devuelve
 * tal cual. Cualquier otro error sube sin disfrazarse de 400.
 */
export function traducirErrorDeBase(error: unknown): never {
  const { code, message } = errorDeBase(error);
  switch (code) {
    case "23514":
      throw new BadRequestException(message);
    case "23505":
      throw new ConflictException(message);
    case "P0002":
      throw new NotFoundException(message);
    default:
      throw error;
  }
}
