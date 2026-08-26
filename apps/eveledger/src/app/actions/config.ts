"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { sesionActiva } from "@/lib/auth";

export type ConfigState = { errores: string[] };

const nombreSchema = z.string().trim().min(1, "El nombre es obligatorio").max(80);

async function proteger(): Promise<boolean> {
  return sesionActiva();
}

export async function crearProducto(nombre: string): Promise<ConfigState> {
  if (!(await proteger())) return { errores: ["Sesión expirada"] };
  const parsed = nombreSchema.safeParse(nombre);
  if (!parsed.success) return { errores: [parsed.error.issues[0].message] };
  const max = await prisma.product.aggregate({ _max: { orden: true } });
  await prisma.product.create({
    data: { nombre: parsed.data, orden: (max._max.orden ?? 0) + 1 }
  });
  revalidatePath("/config");
  return { errores: [] };
}

export async function renombrarProducto(id: string, nombre: string): Promise<ConfigState> {
  if (!(await proteger())) return { errores: ["Sesión expirada"] };
  const parsed = nombreSchema.safeParse(nombre);
  if (!parsed.success) return { errores: [parsed.error.issues[0].message] };
  await prisma.product.update({ where: { id }, data: { nombre: parsed.data } });
  revalidatePath("/config");
  return { errores: [] };
}

export async function eliminarProducto(id: string): Promise<ConfigState> {
  if (!(await proteger())) return { errores: ["Sesión expirada"] };
  const lecturas = await prisma.nozzleReading.count({
    where: { nozzle: { productId: id } }
  });
  if (lecturas > 0) {
    return { errores: ["No se puede eliminar: el producto tiene lecturas asociadas"] };
  }
  await prisma.nozzle.deleteMany({ where: { productId: id } });
  await prisma.product.delete({ where: { id } });
  revalidatePath("/config");
  return { errores: [] };
}

export async function crearManguera(nombre: string, productId: string): Promise<ConfigState> {
  if (!(await proteger())) return { errores: ["Sesión expirada"] };
  const parsed = nombreSchema.safeParse(nombre);
  if (!parsed.success) return { errores: [parsed.error.issues[0].message] };
  const producto = await prisma.product.findUnique({ where: { id: productId } });
  if (!producto) return { errores: ["Producto inválido"] };
  await prisma.nozzle.create({ data: { nombre: parsed.data, productId } });
  revalidatePath("/config");
  return { errores: [] };
}

export async function renombrarManguera(id: string, nombre: string): Promise<ConfigState> {
  if (!(await proteger())) return { errores: ["Sesión expirada"] };
  const parsed = nombreSchema.safeParse(nombre);
  if (!parsed.success) return { errores: [parsed.error.issues[0].message] };
  await prisma.nozzle.update({ where: { id }, data: { nombre: parsed.data } });
  revalidatePath("/config");
  return { errores: [] };
}

export async function cambiarEstadoManguera(id: string, activa: boolean): Promise<ConfigState> {
  if (!(await proteger())) return { errores: ["Sesión expirada"] };
  await prisma.nozzle.update({ where: { id }, data: { activa } });
  revalidatePath("/config");
  return { errores: [] };
}

export async function eliminarManguera(id: string): Promise<ConfigState> {
  if (!(await proteger())) return { errores: ["Sesión expirada"] };
  const lecturas = await prisma.nozzleReading.count({ where: { nozzleId: id } });
  if (lecturas > 0) {
    return { errores: ["No se puede eliminar: la manguera tiene lecturas asociadas"] };
  }
  await prisma.nozzle.delete({ where: { id } });
  revalidatePath("/config");
  return { errores: [] };
}
