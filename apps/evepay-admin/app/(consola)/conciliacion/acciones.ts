"use server";

import { revalidatePath } from "next/cache";
import { apiPost, ErrorApi, type CorridaConciliacion } from "@/lib/api/evepay";

export type ResultadoCorrida =
  { ok: true; datos: CorridaConciliacion } | { ok: false; error: string };

/**
 * Corre la conciliación de un comercio para un rango (CA-19). El resultado
 * queda guardado en el histórico, incluso cuando el proveedor no permite
 * conciliar automáticamente (CA-20): saber que ese periodo quedó sin cuadrar
 * es tan importante como el cuadre mismo.
 */
export async function correrConciliacion(
  tenantId: string,
  desde: string,
  hasta: string
): Promise<ResultadoCorrida> {
  try {
    const datos = await apiPost<CorridaConciliacion>(`/admin/conciliacion/${tenantId}/run`, {
      desde,
      hasta
    });
    revalidatePath("/conciliacion");
    return { ok: true, datos };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof ErrorApi ? error.message : "No se pudo correr la conciliación."
    };
  }
}
