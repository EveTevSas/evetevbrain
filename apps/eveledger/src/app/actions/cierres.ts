"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { crearCierre, guardarCierre, type CierreFormData } from "@/lib/cierres";
import { sesionActiva } from "@/lib/auth";

export type ActionState = { errores: string[] };

export async function crearCierreAction(fecha: string): Promise<ActionState> {
  if (!(await sesionActiva())) return { errores: ["Sesión expirada"] };
  const res = await crearCierre(fecha);
  if (!res.ok) return { errores: res.errores };
  revalidatePath("/cierres");
  redirect(`/cierres/${res.id}`);
}

export async function guardarBorradorAction(
  closeId: string,
  data: CierreFormData
): Promise<ActionState> {
  if (!(await sesionActiva())) return { errores: ["Sesión expirada"] };
  const res = await guardarCierre(closeId, data, false);
  if (!res.ok) return { errores: res.errores };
  revalidatePath("/cierres");
  revalidatePath(`/cierres/${closeId}`);
  return { errores: [] };
}

export async function cerrarDiaAction(closeId: string, data: CierreFormData): Promise<ActionState> {
  if (!(await sesionActiva())) return { errores: ["Sesión expirada"] };
  const res = await guardarCierre(closeId, data, true);
  if (!res.ok) return { errores: res.errores };
  revalidatePath("/cierres");
  revalidatePath(`/cierres/${closeId}`);
  revalidatePath("/consolidado");
  return { errores: [] };
}
