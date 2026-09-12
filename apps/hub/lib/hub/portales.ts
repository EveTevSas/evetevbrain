import "server-only";

import { db } from "@/lib/db";

export interface Portal {
  id: string;
  nombre: string;
  url: string;
  descripcion: string;
  color: string;
  estado: "operando" | "beta" | "inactivo";
  rolAcceso: string;
  orden: number;
}

export async function listarPortales(): Promise<Portal[]> {
  const filas = await db()<
    {
      id: string;
      nombre: string;
      url: string;
      descripcion: string;
      color: string;
      estado: Portal["estado"];
      rol_acceso: string;
      orden: number;
    }[]
  >`select id, nombre, url, descripcion, color, estado, rol_acceso, orden from hub.portales order by orden, nombre`;
  return filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    url: f.url,
    descripcion: f.descripcion,
    color: f.color,
    estado: f.estado,
    rolAcceso: f.rol_acceso,
    orden: f.orden
  }));
}

export async function guardarPortal(
  p: Omit<Portal, "id" | "orden"> & { id?: string | null; orden?: number }
): Promise<string> {
  const sql = db();
  if (p.id) {
    await sql`update hub.portales set nombre=${p.nombre}, url=${p.url}, descripcion=${p.descripcion}, color=${p.color},
      estado=${p.estado}, rol_acceso=${p.rolAcceso}, orden=${p.orden ?? 100} where id=${p.id}`;
    return p.id;
  }
  const [f] = await sql<
    { id: string }[]
  >`insert into hub.portales (nombre, url, descripcion, color, estado, rol_acceso, orden)
    values (${p.nombre}, ${p.url}, ${p.descripcion}, ${p.color}, ${p.estado}, ${p.rolAcceso}, ${p.orden ?? 100}) returning id`;
  return f!.id;
}

export async function borrarPortal(id: string): Promise<void> {
  await db()`delete from hub.portales where id=${id}`;
}
