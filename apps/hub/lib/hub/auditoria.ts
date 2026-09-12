import "server-only";

import { db } from "@/lib/db";

/** CA-7: todo lo que el Hub posee deja rastro. Se llama dentro de la misma acción que escribe. */
export async function auditar(args: {
  actor: string;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  detalle?: Record<string, unknown>;
}): Promise<void> {
  const sql = db();
  await sql`insert into hub.auditoria (actor, accion, entidad, entidad_id, detalle)
    values (${args.actor}, ${args.accion}, ${args.entidad}, ${args.entidadId ?? null}, ${sql.json((args.detalle ?? {}) as never)})`;
}

export interface Rastro {
  id: number;
  actor: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  detalle: Record<string, unknown>;
  creadaEn: string;
}

export async function ultimosRastros(limite = 30): Promise<Rastro[]> {
  const filas = await db()<
    {
      id: string;
      actor: string;
      accion: string;
      entidad: string;
      entidad_id: string | null;
      detalle: Record<string, unknown>;
      creada_en: Date;
    }[]
  >`select * from hub.auditoria order by id desc limit ${limite}`;
  return filas.map((f) => ({
    id: Number(f.id),
    actor: f.actor,
    accion: f.accion,
    entidad: f.entidad,
    entidadId: f.entidad_id,
    detalle: f.detalle,
    creadaEn: f.creada_en.toISOString()
  }));
}
