"use server";

import { revalidatePath } from "next/cache";
import { apiPost, ErrorApi, type Lote, type Retencion } from "@/lib/api/evepay";

export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string };

function comoResultado<T>(error: unknown, generico: string): Resultado<T> {
  return { ok: false, error: error instanceof ErrorApi ? error.message : generico };
}

function refrescar() {
  revalidatePath("/dispersion");
  revalidatePath("/comercios");
  revalidatePath("/conciliacion");
}

/**
 * Server Actions de la dispersión asistida (spec `dispersion`). Cada paso lo
 * decide la base con quién actúa: el cuatro ojos y el pago único se rechazan
 * allá y el mensaje llega tal cual al formulario.
 */
export async function prepararLote(tenantId: string): Promise<Resultado<Lote>> {
  try {
    const datos = await apiPost<Lote>("/admin/dispersion/lotes", { tenantId });
    refrescar();
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error, "No se pudo preparar el lote.");
  }
}

export async function aprobarLote(id: string): Promise<Resultado<Lote>> {
  try {
    const datos = await apiPost<Lote>(`/admin/dispersion/lotes/${id}/aprobar`);
    refrescar();
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error, "No se pudo aprobar el lote.");
  }
}

export async function pagarLote(id: string, formulario: FormData): Promise<Resultado<Lote>> {
  const referenciaPago = String(formulario.get("referenciaPago") ?? "").trim();
  if (!referenciaPago) return { ok: false, error: "Falta la referencia del pago en el banco." };
  try {
    const datos = await apiPost<Lote>(`/admin/dispersion/lotes/${id}/pagar`, {
      fecha: String(formulario.get("fecha") ?? "").trim(),
      referenciaPago,
      comprobante: String(formulario.get("comprobante") ?? "").trim() || undefined
    });
    refrescar();
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error, "No se pudo registrar el pago.");
  }
}

export async function fallarLote(id: string, motivo: string): Promise<Resultado<Lote>> {
  if (motivo.trim().length < 3)
    return { ok: false, error: "Di por qué falló (al menos 3 letras)." };
  try {
    const datos = await apiPost<Lote>(`/admin/dispersion/lotes/${id}/fallar`, {
      motivo: motivo.trim()
    });
    refrescar();
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error, "No se pudo marcar el lote como fallido.");
  }
}

export async function liberarRetencion(id: string, motivo: string): Promise<Resultado<Retencion>> {
  if (motivo.trim().length < 3)
    return { ok: false, error: "Di por qué se libera (al menos 3 letras)." };
  try {
    const datos = await apiPost<Retencion>(`/admin/dispersion/retenciones/${id}/liberar`, {
      motivo: motivo.trim()
    });
    refrescar();
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error, "No se pudo liberar la retención.");
  }
}
