"use server";

import { revalidatePath } from "next/cache";
import {
  apiPost,
  ErrorApi,
  type Consignacion,
  type CorridaConciliacion,
  type CuadreCustodia
} from "@/lib/api/evepay";
import { montoDigitado } from "@/lib/tarifas";

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

export type ResultadoConsignacion =
  | { ok: true; datos: Pick<Consignacion, "id" | "referenciaBancaria" | "montoMinor"> }
  | { ok: false; error: string };

/**
 * Registra una consignación del proveedor (ledger-custodia CA-4 a CA-7). La
 * regla de dinero —que el monto cuadre con lo que el proveedor debía por los
 * cobros marcados— la aplica la base y rechaza todo si no; el formulario ya
 * lo comprobó en vivo, así que llegar aquí con un error es raro y se muestra
 * tal cual.
 */
export async function registrarConsignacion(formulario: FormData): Promise<ResultadoConsignacion> {
  const paymentIds = formulario.getAll("paymentIds").map(String).filter(Boolean);
  const cuerpo = {
    provider: String(formulario.get("provider") ?? "").trim(),
    referenciaBancaria: String(formulario.get("referenciaBancaria") ?? "").trim(),
    fecha: String(formulario.get("fecha") ?? "").trim(),
    montoMinor: montoDigitado(String(formulario.get("montoMinor") ?? "")),
    paymentIds,
    nota: String(formulario.get("nota") ?? "").trim() || undefined
  };

  if (paymentIds.length === 0) return { ok: false, error: "Marca al menos un cobro." };
  if (!(cuerpo.montoMinor > 0))
    return { ok: false, error: "El monto consignado debe ser mayor que cero." };

  try {
    const datos = await apiPost<{ id: string; referenciaBancaria: string; montoMinor: number }>(
      "/admin/consignaciones",
      cuerpo
    );
    revalidatePath("/conciliacion");
    revalidatePath("/pagos");
    revalidatePath("/comercios");
    return { ok: true, datos };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof ErrorApi ? error.message : "No se pudo registrar la consignación."
    };
  }
}

export type ResultadoSaldo =
  { ok: true; datos: { id: string; cuadre: CuadreCustodia } } | { ok: false; error: string };

/** Registra el saldo del banco a una fecha, del extracto (CA-8). */
export async function registrarSaldoRecaudo(formulario: FormData): Promise<ResultadoSaldo> {
  const saldoMinor = montoDigitado(String(formulario.get("saldoMinor") ?? ""));
  if (!(saldoMinor >= 0)) return { ok: false, error: "El saldo debe ser un número de pesos." };

  try {
    const datos = await apiPost<{ id: string; cuadre: CuadreCustodia }>("/admin/recaudo/saldos", {
      fecha: String(formulario.get("fecha") ?? "").trim(),
      saldoMinor,
      nota: String(formulario.get("nota") ?? "").trim() || undefined
    });
    revalidatePath("/conciliacion");
    return { ok: true, datos };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof ErrorApi ? error.message : "No se pudo registrar el saldo."
    };
  }
}
