"use server";

import { revalidatePath } from "next/cache";
import { crearCliente, actualizarCliente, generarFactura, registrarAbono } from "@/lib/cartera";
import { sesionActiva } from "@/lib/auth";

export type CarteraState = { errores: string[] };

export async function crearClienteAction(nombre: string, cupo: number): Promise<CarteraState> {
  if (!(await sesionActiva())) return { errores: ["Sesión expirada"] };
  const res = await crearCliente(nombre, cupo);
  if (!res.ok) return { errores: res.errores };
  revalidatePath("/cartera");
  return { errores: [] };
}

export async function actualizarClienteAction(
  id: string,
  data: { nombre: string; cupo: number; activo: boolean }
): Promise<CarteraState> {
  if (!(await sesionActiva())) return { errores: ["Sesión expirada"] };
  const res = await actualizarCliente(id, data);
  if (!res.ok) return { errores: res.errores };
  revalidatePath("/cartera");
  revalidatePath(`/cartera/${id}`);
  return { errores: [] };
}

export async function generarFacturaAction(clienteId: string): Promise<CarteraState> {
  if (!(await sesionActiva())) return { errores: ["Sesión expirada"] };
  const res = await generarFactura(clienteId);
  if (!res.ok) return { errores: res.errores };
  revalidatePath("/cartera");
  revalidatePath(`/cartera/${clienteId}`);
  return { errores: [] };
}

export async function registrarAbonoAction(
  clienteId: string,
  fecha: string,
  valor: number,
  detalle: string
): Promise<CarteraState> {
  if (!(await sesionActiva())) return { errores: ["Sesión expirada"] };
  const res = await registrarAbono(clienteId, fecha, valor, detalle);
  if (!res.ok) return { errores: res.errores };
  revalidatePath("/cartera");
  revalidatePath(`/cartera/${clienteId}`);
  return { errores: [] };
}
