"use server";

import { revalidatePath } from "next/cache";
import {
  apiGet,
  apiPost,
  apiPut,
  ErrorApi,
  type CoincidenciaRestrictiva,
  type ModoRegla,
  type ReglaRiesgo
} from "@/lib/api/evepay";
import { montoDigitado } from "@/lib/tarifas";

export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string };
function comoResultado<T>(error: unknown, generico: string): Resultado<T> {
  return { ok: false, error: error instanceof ErrorApi ? error.message : generico };
}

/** Cambia solo el modo de una regla: la forma normal de pasar de shadow a activa. */
export async function cambiarModoRegla(
  id: string,
  modo: ModoRegla
): Promise<Resultado<ReglaRiesgo>> {
  try {
    const reglas = await apiGet<ReglaRiesgo[]>("/admin/riesgo/reglas");
    const actual = reglas.find((r) => r.id === id);
    if (!actual) return { ok: false, error: "La regla ya no existe." };
    const datos = await apiPut<ReglaRiesgo>("/admin/riesgo/reglas", {
      id,
      nombre: actual.nombre,
      tipo: actual.tipo,
      tenantId: actual.tenantId,
      parametros: actual.parametros,
      accion: actual.accion,
      modo,
      prioridad: actual.prioridad
    });
    revalidatePath("/riesgo");
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error, "No se pudo cambiar el modo de la regla.");
  }
}

export async function guardarRegla(formulario: FormData): Promise<Resultado<ReglaRiesgo>> {
  const t = (k: string) => String(formulario.get(k) ?? "").trim();
  const tipo = t("tipo");
  const parametros =
    tipo === "monto_atipico"
      ? { factor: Number(t("factor")), minimoCobros: Number(t("minimoCobros")) }
      : tipo === "geo_mismatch"
        ? { montoMinimoMinor: montoDigitado(t("montoMinimo")) }
        : tipo === "intentos_tarjeta"
          ? { maxIntentos: Number(t("maxIntentos")) }
          : tipo === "score_proveedor"
            ? { scoreMaximo: Number(t("scoreMaximo")) }
            : { limiteMinor: montoDigitado(t("limite")) };
  try {
    const datos = await apiPut<ReglaRiesgo>("/admin/riesgo/reglas", {
      id: t("id") || null,
      nombre: t("nombre"),
      tipo,
      tenantId: t("tenantId") || null,
      parametros,
      accion: t("accion"),
      modo: t("modo") || "shadow",
      prioridad: Number(t("prioridad") || 100)
    });
    revalidatePath("/riesgo");
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error, "No se pudo guardar la regla.");
  }
}

export async function agregarALista(formulario: FormData): Promise<Resultado<{ id: string }>> {
  const t = (k: string) => String(formulario.get(k) ?? "").trim();
  try {
    const datos = await apiPost<{ id: string }>("/admin/riesgo/listas", {
      tipoDocumento: t("tipoDocumento"),
      numeroDocumento: t("numeroDocumento"),
      nombre: t("nombre"),
      fuente: t("fuente"),
      motivo: t("motivo") || null
    });
    revalidatePath("/riesgo");
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error, "No se pudo agregar a la lista.");
  }
}

export async function desactivarDeLista(id: string): Promise<Resultado<{ ok: true }>> {
  try {
    const datos = await apiPost<{ ok: true }>(`/admin/riesgo/listas/${id}/desactivar`);
    revalidatePath("/riesgo");
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error, "No se pudo desactivar la entrada.");
  }
}

export async function verificarDocumento(
  formulario: FormData
): Promise<Resultado<CoincidenciaRestrictiva[]>> {
  const t = (k: string) => String(formulario.get(k) ?? "").trim();
  try {
    const datos = await apiPost<CoincidenciaRestrictiva[]>("/admin/riesgo/listas/verificar", {
      documentos: [{ tipo: t("tipoDocumento"), numero: t("numeroDocumento"), quien: "consulta" }]
    });
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error, "No se pudo verificar.");
  }
}
