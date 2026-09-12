import "server-only";

import type { EnlaceProducto, EstadoCuenta, ProductoEvetev } from "@evetev/shared";
import { db } from "@/lib/db";

export interface CuentaConEnlaces {
  id: string;
  nombreLegal: string;
  nit: string;
  estado: EstadoCuenta;
  ciudad: string | null;
  creadaEn: string;
  enlaces: (EnlaceProducto & { id: string })[];
}

interface FilaEnlace {
  id: string;
  cuenta_id: string;
  producto: ProductoEvetev;
  suscripcion_estado: "activa" | "morosa" | "cancelada" | null;
  mrr_minor: string | null;
  evepay_tenant_id: string | null;
  origen: EnlaceProducto["origen"];
}

function aEnlace(f: FilaEnlace): EnlaceProducto & { id: string } {
  return {
    id: f.id,
    accountId: f.cuenta_id,
    producto: f.producto,
    origen: f.origen,
    ...(f.suscripcion_estado
      ? { suscripcion: { estado: f.suscripcion_estado, mrrMinor: Number(f.mrr_minor ?? 0) } }
      : {}),
    ...(f.evepay_tenant_id ? { evepayTenantId: f.evepay_tenant_id } : {})
  };
}

export async function listarCuentas(): Promise<CuentaConEnlaces[]> {
  const sql = db();
  const [cuentas, enlaces] = await Promise.all([
    sql<
      {
        id: string;
        nombre_legal: string;
        nit: string;
        estado: EstadoCuenta;
        ciudad: string | null;
        creada_en: Date;
      }[]
    >`
      select id, nombre_legal, nit, estado, ciudad, creada_en from hub.cuentas order by nombre_legal`,
    sql<FilaEnlace[]>`select * from hub.enlaces_producto order by creado_en`
  ]);
  return cuentas.map((c) => ({
    id: c.id,
    nombreLegal: c.nombre_legal,
    nit: c.nit,
    estado: c.estado,
    ciudad: c.ciudad,
    creadaEn: c.creada_en.toISOString(),
    enlaces: enlaces.filter((e) => e.cuenta_id === c.id).map(aEnlace)
  }));
}

/** CA-6: si el NIT ya tiene cuenta, se usa esa. Devuelve el id y si fue nueva. */
export async function cuentaPorNit(args: {
  nit: string;
  nombreLegal: string;
  ciudad: string | null;
}): Promise<{ id: string; nueva: boolean }> {
  const sql = db();
  const [existe] = await sql<{ id: string }[]>`select id from hub.cuentas where nit=${args.nit}`;
  if (existe) return { id: existe.id, nueva: false };
  const [f] = await sql<
    { id: string }[]
  >`insert into hub.cuentas (nombre_legal, nit, ciudad) values (${args.nombreLegal}, ${args.nit}, ${args.ciudad}) returning id`;
  return { id: f!.id, nueva: true };
}

export async function cambiarEstadoCuenta(id: string, estado: EstadoCuenta): Promise<void> {
  await db()`update hub.cuentas set estado=${estado} where id=${id}`;
}

export async function guardarEnlace(e: EnlaceProducto): Promise<string> {
  const [f] = await db()<
    { id: string }[]
  >`insert into hub.enlaces_producto (cuenta_id, producto, suscripcion_estado, mrr_minor, evepay_tenant_id, origen)
    values (${e.accountId}, ${e.producto}, ${e.suscripcion?.estado ?? null}, ${e.suscripcion?.mrrMinor ?? null}, ${e.evepayTenantId ?? null}, ${e.origen})
    on conflict (cuenta_id, producto) do update set suscripcion_estado=excluded.suscripcion_estado, mrr_minor=excluded.mrr_minor,
      evepay_tenant_id=excluded.evepay_tenant_id, origen=excluded.origen
    returning id`;
  return f!.id;
}

export async function borrarEnlace(id: string): Promise<void> {
  await db()`delete from hub.enlaces_producto where id=${id}`;
}

/** MRR activo por producto: lo que el Hub sabe de mensualidades hoy. */
export async function mrrPorProducto(): Promise<
  Record<ProductoEvetev, { mrrMinor: number; suscriptores: number }>
> {
  const filas = await db()<{ producto: ProductoEvetev; mrr: string; n: string }[]>`
    select producto, coalesce(sum(mrr_minor),0) as mrr, count(*) as n
    from hub.enlaces_producto where suscripcion_estado='activa' group by producto`;
  const out: Record<ProductoEvetev, { mrrMinor: number; suscriptores: number }> = {
    evepay: { mrrMinor: 0, suscriptores: 0 },
    eveconecta: { mrrMinor: 0, suscriptores: 0 },
    eveledger: { mrrMinor: 0, suscriptores: 0 }
  };
  for (const f of filas) out[f.producto] = { mrrMinor: Number(f.mrr), suscriptores: Number(f.n) };
  return out;
}
