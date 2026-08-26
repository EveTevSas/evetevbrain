"use server";

import { revalidatePath } from "next/cache";
import { guardarInventarioDia, type FisicoForm, type CompraForm } from "@/lib/inventarios";
import { sesionActiva } from "@/lib/auth";

export type InventarioState = { errores: string[] };

export async function guardarInventarioDiaAction(
  fecha: string,
  fisicos: FisicoForm[],
  compras: CompraForm[]
): Promise<InventarioState> {
  if (!(await sesionActiva())) return { errores: ["Sesión expirada"] };
  const res = await guardarInventarioDia(fecha, fisicos, compras);
  if (!res.ok) return { errores: res.errores };
  revalidatePath("/inventarios");
  revalidatePath(`/inventarios/${fecha}`);
  return { errores: [] };
}
