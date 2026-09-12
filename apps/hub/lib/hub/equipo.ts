import "server-only";

import { db } from "@/lib/db";

export interface Meta {
  id: string;
  titulo: string;
  avance: number;
  trimestre: string;
}
export interface Logro {
  id: string;
  texto: string;
  trimestre: string;
  fecha: string;
}
export interface Miembro {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  iniciales: string;
  activo: boolean;
  metas: Meta[];
  logros: Logro[];
}

export async function listarEquipo(trimestre: string): Promise<Miembro[]> {
  const sql = db();
  const [miembros, metas, logros] = await Promise.all([
    sql<
      {
        id: string;
        email: string;
        nombre: string;
        rol: string;
        iniciales: string;
        activo: boolean;
      }[]
    >`
      select id, email, nombre, rol, iniciales, activo from hub.miembros order by orden, nombre`,
    sql<{ id: string; miembro_id: string; titulo: string; avance: number; trimestre: string }[]>`
      select id, miembro_id, titulo, avance, trimestre from hub.metas where trimestre=${trimestre} order by creada_en`,
    sql<{ id: string; miembro_id: string; texto: string; trimestre: string; fecha: Date }[]>`
      select id, miembro_id, texto, trimestre, fecha from hub.logros where trimestre=${trimestre} order by fecha desc`
  ]);
  return miembros.map((m) => ({
    ...m,
    metas: metas.filter((x) => x.miembro_id === m.id).map(({ miembro_id: _m, ...r }) => r),
    logros: logros
      .filter((x) => x.miembro_id === m.id)
      .map((x) => ({
        id: x.id,
        texto: x.texto,
        trimestre: x.trimestre,
        fecha: x.fecha.toISOString().slice(0, 10)
      }))
  }));
}

export async function guardarMiembro(m: {
  id?: string | null;
  email: string;
  nombre: string;
  rol: string;
  iniciales: string;
  activo: boolean;
}): Promise<string> {
  const sql = db();
  const email = m.email.trim().toLowerCase();
  if (m.id) {
    await sql`update hub.miembros set email=${email}, nombre=${m.nombre}, rol=${m.rol}, iniciales=${m.iniciales}, activo=${m.activo} where id=${m.id}`;
    return m.id;
  }
  const [f] = await sql<
    { id: string }[]
  >`insert into hub.miembros (email, nombre, rol, iniciales, activo)
    values (${email}, ${m.nombre}, ${m.rol}, ${m.iniciales}, ${m.activo}) returning id`;
  return f!.id;
}

export async function guardarMeta(x: {
  id?: string | null;
  miembroId: string;
  titulo: string;
  avance: number;
  trimestre: string;
}): Promise<string> {
  const sql = db();
  if (x.id) {
    await sql`update hub.metas set titulo=${x.titulo}, avance=${x.avance}, actualizada_en=now() where id=${x.id}`;
    return x.id;
  }
  const [f] = await sql<
    { id: string }[]
  >`insert into hub.metas (miembro_id, titulo, avance, trimestre)
    values (${x.miembroId}, ${x.titulo}, ${x.avance}, ${x.trimestre}) returning id`;
  return f!.id;
}

export async function borrarMeta(id: string): Promise<void> {
  await db()`delete from hub.metas where id=${id}`;
}

export async function agregarLogro(x: {
  miembroId: string;
  texto: string;
  trimestre: string;
}): Promise<string> {
  const [f] = await db()<{ id: string }[]>`insert into hub.logros (miembro_id, texto, trimestre)
    values (${x.miembroId}, ${x.texto}, ${x.trimestre}) returning id`;
  return f!.id;
}

export async function borrarLogro(id: string): Promise<void> {
  await db()`delete from hub.logros where id=${id}`;
}
