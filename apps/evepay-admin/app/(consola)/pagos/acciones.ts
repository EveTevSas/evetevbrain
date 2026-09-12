"use server";

import { revalidatePath } from "next/cache";
import {
  apiPost,
  ErrorApi,
  type Contracargo,
  type Reembolso,
  type ResultadoReverificacion
} from "@/lib/api/evepay";
import { montoDigitado } from "@/lib/tarifas";

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

export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string };
function comoResultado<T>(error: unknown, generico: string): Resultado<T> {
  return { ok: false, error: error instanceof ErrorApi ? error.message : generico };
}
function refrescar(paymentId: string) {
  revalidatePath(`/pagos/${paymentId}`);
  revalidatePath("/pagos");
  revalidatePath("/riesgo");
  revalidatePath("/dispersion");
  revalidatePath("/comercios");
}

/** Reembolso asistido (finanzas): ya se pagó desde el banco; la base lo reparte y asienta. */
export async function registrarReembolso(
  paymentId: string,
  formulario: FormData
): Promise<Resultado<Reembolso>> {
  const t = (k: string) => String(formulario.get(k) ?? "").trim();
  try {
    const datos = await apiPost<Reembolso>(`/admin/pagos/${paymentId}/reembolsos`, {
      montoMinor: montoDigitado(t("monto")),
      motivo: t("motivo"),
      fecha: t("fecha"),
      referenciaPago: t("referenciaPago"),
      comprobante: t("comprobante") || undefined
    });
    refrescar(paymentId);
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error, "No se pudo registrar el reembolso.");
  }
}

export async function registrarContracargo(
  paymentId: string,
  formulario: FormData
): Promise<Resultado<Contracargo>> {
  const t = (k: string) => String(formulario.get(k) ?? "").trim();
  try {
    const datos = await apiPost<Contracargo>(`/admin/pagos/${paymentId}/contracargos`, {
      montoMinor: montoDigitado(t("monto")),
      motivoRed: t("motivoRed"),
      referenciaRed: t("referenciaRed") || undefined,
      fechaLimiteEvidencia: t("fechaLimiteEvidencia")
    });
    refrescar(paymentId);
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error, "No se pudo registrar el contracargo.");
  }
}

export async function evidenciaContracargo(
  id: string,
  paymentId: string,
  evidencia: string
): Promise<Resultado<Contracargo>> {
  try {
    const datos = await apiPost<Contracargo>(`/admin/contracargos/${id}/evidencia`, { evidencia });
    refrescar(paymentId);
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error, "No se pudo guardar la evidencia.");
  }
}

export async function resolverContracargo(
  id: string,
  paymentId: string,
  formulario: FormData
): Promise<Resultado<Contracargo>> {
  const t = (k: string) => String(formulario.get(k) ?? "").trim();
  try {
    const datos = await apiPost<Contracargo>(`/admin/contracargos/${id}/resolver`, {
      resultado: t("resultado"),
      nota: t("nota") || undefined,
      fecha: t("fecha") || undefined,
      referenciaPago: t("referenciaPago") || undefined
    });
    refrescar(paymentId);
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error, "No se pudo resolver el contracargo.");
  }
}
