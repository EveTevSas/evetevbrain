"use server";

import { revalidatePath } from "next/cache";
import { apiPost, ErrorApi, type ResultadoReverificacion } from "@/lib/api/evepay";

export type ResultadoReverify =
  { ok: true; datos: ResultadoReverificacion } | { ok: false; error: string };

/**
 * Pregunta al proveedor por el estado real del cobro y lo aplica si la máquina
 * de estados lo permite (CA-17, CA-18). Devuelve el resultado en vez de lanzar:
 * "no cambió nada" es una respuesta legítima que hay que mostrar, no un error.
 */
export async function reverificarPago(paymentId: string): Promise<ResultadoReverify> {
  try {
    const datos = await apiPost<ResultadoReverificacion>(`/admin/pagos/${paymentId}/reverify`);
    revalidatePath(`/pagos/${paymentId}`);
    revalidatePath("/pagos");
    return { ok: true, datos };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof ErrorApi ? error.message : "No se pudo reverificar el cobro."
    };
  }
}
