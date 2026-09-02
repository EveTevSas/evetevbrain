"use server";

import { revalidatePath } from "next/cache";
import { apiPost, ErrorApi, type ApiKeyRotada, type ComercioCreado } from "@/lib/api/evepay";

/**
 * Server Actions de la sección de comercios. Cada una devuelve un resultado
 * discriminado en vez de lanzar: el formulario tiene que poder mostrar el error
 * sin perder lo que la persona ya escribió.
 */

export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string };

function comoResultado<T>(error: unknown): Resultado<T> {
  if (error instanceof ErrorApi) return { ok: false, error: error.message };
  return { ok: false, error: "Ocurrió un error inesperado." };
}

export async function crearComercio(
  _estadoPrevio: Resultado<ComercioCreado> | null,
  formulario: FormData
): Promise<Resultado<ComercioCreado>> {
  const legalName = String(formulario.get("legalName") ?? "").trim();
  const displayName = String(formulario.get("displayName") ?? "").trim();

  if (legalName.length < 3) {
    return { ok: false, error: "La razón social debe tener al menos 3 caracteres." };
  }
  if (displayName.length < 2) {
    return { ok: false, error: "El nombre visible debe tener al menos 2 caracteres." };
  }

  try {
    const datos = await apiPost<ComercioCreado>("/admin/merchants", { legalName, displayName });
    revalidatePath("/comercios");
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error);
  }
}

export async function rotarApiKey(
  tenantId: string,
  environment: "live" | "test"
): Promise<Resultado<ApiKeyRotada>> {
  try {
    const datos = await apiPost<ApiKeyRotada>(`/admin/merchants/${tenantId}/api-keys/rotate`, {
      environment
    });
    revalidatePath("/comercios");
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error);
  }
}

export async function cambiarEstadoComercio(
  tenantId: string,
  activo: boolean
): Promise<Resultado<{ tenantId: string; estado: string }>> {
  try {
    const datos = await apiPost<{ tenantId: string; estado: string }>(
      `/admin/merchants/${tenantId}/estado`,
      { activo }
    );
    revalidatePath("/comercios");
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error);
  }
}
