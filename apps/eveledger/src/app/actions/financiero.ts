"use server";

import { revalidatePath } from "next/cache";
import { guardarCostos, agregarGasto, eliminarGasto, type CostoForm } from "@/lib/financiero";
import { sesionActiva } from "@/lib/auth";

export type FinancieroState = { errores: string[] };

export async function guardarCostosAction(
  anio: number,
  mes: number,
  costos: CostoForm[]
): Promise<FinancieroState> {
  if (!(await sesionActiva())) return { errores: ["Sesión expirada"] };
  const res = await guardarCostos(anio, mes, costos);
  if (!res.ok) return { errores: res.errores };
  revalidatePath("/financiero");
  return { errores: [] };
}

export async function agregarGastoAction(
  anio: number,
  mes: number,
  categoria: string,
  valor: number,
  cantidad: number | null,
  detalle: string
): Promise<FinancieroState> {
  if (!(await sesionActiva())) return { errores: ["Sesión expirada"] };
  const res = await agregarGasto(anio, mes, categoria, valor, cantidad, detalle);
  if (!res.ok) return { errores: res.errores };
  revalidatePath("/financiero");
  return { errores: [] };
}

export async function eliminarGastoAction(id: string): Promise<FinancieroState> {
  if (!(await sesionActiva())) return { errores: ["Sesión expirada"] };
  const res = await eliminarGasto(id);
  if (!res.ok) return { errores: res.errores };
  revalidatePath("/financiero");
  return { errores: [] };
}
