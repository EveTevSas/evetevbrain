import "server-only";

import { db } from "@/lib/db";

export type CategoriaCosto = "pagos" | "infra" | "mensajeria" | "ia" | "herramientas" | "otros";

export interface Costo {
  id: string;
  mes: string;
  proveedor: string;
  concepto: string;
  categoria: CategoriaCosto;
  montoMinor: number;
}

export interface CierreMes {
  mes: string;
  cajaMinor: number;
  gastoOperativoMinor: number;
  nota: string | null;
}

export async function listarCostos(mes: string): Promise<Costo[]> {
  const filas = await db()<
    {
      id: string;
      mes: Date;
      proveedor: string;
      concepto: string;
      categoria: CategoriaCosto;
      monto_minor: string;
    }[]
  >`select id, mes, proveedor, concepto, categoria, monto_minor from hub.costos_proveedor where mes=${mes} order by monto_minor desc, proveedor`;
  return filas.map((f) => ({
    id: f.id,
    mes: f.mes.toISOString().slice(0, 10),
    proveedor: f.proveedor,
    concepto: f.concepto,
    categoria: f.categoria,
    montoMinor: Number(f.monto_minor)
  }));
}

export async function guardarCosto(c: Omit<Costo, "id"> & { id?: string | null }): Promise<string> {
  const sql = db();
  if (c.id) {
    await sql`update hub.costos_proveedor set proveedor=${c.proveedor}, concepto=${c.concepto}, categoria=${c.categoria}, monto_minor=${c.montoMinor} where id=${c.id}`;
    return c.id;
  }
  const [f] = await sql<
    { id: string }[]
  >`insert into hub.costos_proveedor (mes, proveedor, concepto, categoria, monto_minor)
    values (${c.mes}, ${c.proveedor}, ${c.concepto}, ${c.categoria}, ${c.montoMinor})
    on conflict (mes, proveedor, concepto) do update set categoria=excluded.categoria, monto_minor=excluded.monto_minor
    returning id`;
  return f!.id;
}

export async function borrarCosto(id: string): Promise<void> {
  await db()`delete from hub.costos_proveedor where id=${id}`;
}

export async function cierreDelMes(mes: string): Promise<CierreMes | null> {
  const [f] = await db()<
    { mes: Date; caja_minor: string; gasto_operativo_minor: string; nota: string | null }[]
  >`
    select mes, caja_minor, gasto_operativo_minor, nota from hub.cierres_mes where mes <= ${mes} order by mes desc limit 1`;
  return f
    ? {
        mes: f.mes.toISOString().slice(0, 10),
        cajaMinor: Number(f.caja_minor),
        gastoOperativoMinor: Number(f.gasto_operativo_minor),
        nota: f.nota
      }
    : null;
}

export async function guardarCierre(c: CierreMes): Promise<void> {
  await db()`insert into hub.cierres_mes (mes, caja_minor, gasto_operativo_minor, nota)
    values (${c.mes}, ${c.cajaMinor}, ${c.gastoOperativoMinor}, ${c.nota})
    on conflict (mes) do update set caja_minor=excluded.caja_minor, gasto_operativo_minor=excluded.gasto_operativo_minor, nota=excluded.nota, actualizado_en=now()`;
}
