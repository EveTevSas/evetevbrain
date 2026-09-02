// Lógica de servidor del Módulo 2 (inventarios).
// Solo se persiste lo digitado (compras y físico); inicial, ventas, teórica,
// variación y alerta se derivan con las funciones puras de calc.ts.

import { prisma } from "@/lib/db";
import { galonesPorDiaProducto } from "@/lib/cierres";
import { armarFilaInventario, type FilaInventario } from "@/lib/calc";
import { inputAFecha } from "@/lib/format";

export type { FilaInventario };

export interface InventarioDiaData {
  fecha: string;
  /** true si el cierre del día está CLOSED (las ventas son definitivas). */
  cierreCerrado: boolean;
  productos: {
    productId: string;
    nombre: string;
    inicial: number | null;
    ventas: number | null;
    fisico: number | null;
    compras: number[]; // descargas digitadas (galones por descargue)
  }[];
}

/** Físico registrado el día anterior a `fecha` para un producto (o null). */
async function fisicoDiaAnterior(productId: string, fecha: Date): Promise<number | null> {
  const anterior = new Date(fecha.getTime() - 24 * 60 * 60 * 1000);
  const reg = await prisma.inventarioFisico.findUnique({
    where: { fecha_productId: { fecha: anterior, productId } }
  });
  return reg ? Number(reg.galones) : null;
}

/**
 * Datos del formulario de inventario de un día: por producto, inicial
 * (físico de ayer), ventas del cierre CLOSED, físico y descargas digitadas.
 */
export async function obtenerInventarioDia(fechaStr: string): Promise<InventarioDiaData | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) return null;
  const fecha = inputAFecha(fechaStr);

  const productos = await prisma.product.findMany({ orderBy: { orden: "asc" } });
  const cierre = await prisma.dailyClose.findUnique({
    where: { fecha },
    include: { readings: { include: { nozzle: true } } }
  });
  const compras = await prisma.compra.findMany({
    where: { fecha },
    orderBy: { createdAt: "asc" }
  });
  const fisicos = await prisma.inventarioFisico.findMany({ where: { fecha } });

  const ventasPorProducto = new Map<string, number>();
  if (cierre?.estado === "CLOSED") {
    for (const r of cierre.readings) {
      const gal = Number(r.lecturaFinal) - Number(r.lecturaInicial) - Number(r.calibracion);
      ventasPorProducto.set(
        r.nozzle.productId,
        (ventasPorProducto.get(r.nozzle.productId) ?? 0) + gal
      );
    }
  }

  const lista = await Promise.all(
    productos.map(async (p) => {
      const fisico = fisicos.find((f) => f.productId === p.id);
      return {
        productId: p.id,
        nombre: p.nombre,
        inicial: await fisicoDiaAnterior(p.id, fecha),
        ventas: cierre?.estado === "CLOSED" ? (ventasPorProducto.get(p.id) ?? 0) : null,
        fisico: fisico ? Number(fisico.galones) : null,
        compras: compras.filter((c) => c.productId === p.id).map((c) => Number(c.galones))
      };
    })
  );

  return {
    fecha: fechaStr,
    cierreCerrado: cierre?.estado === "CLOSED",
    productos: lista
  };
}

/** Matriz mensual de inventario: productos × días con todo lo derivado. */
export async function inventarioMensual(anio: number, mes: number) {
  const desde = new Date(Date.UTC(anio, mes - 1, 1));
  const hasta = new Date(Date.UTC(anio, mes, 1));
  const diasEnMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();

  const productos = await prisma.product.findMany({ orderBy: { orden: "asc" } });
  const ventasMatriz = await galonesPorDiaProducto(desde, hasta);

  // Trae físicos y compras del mes más el último día del mes anterior (para
  // el inicial del día 1).
  const compras = await prisma.compra.findMany({
    where: { fecha: { gte: desde, lt: hasta } }
  });
  const fisicos = await prisma.inventarioFisico.findMany({
    where: { fecha: { gte: new Date(desde.getTime() - 24 * 60 * 60 * 1000), lt: hasta } }
  });

  const comprasPorDia = new Map<number, Map<string, number>>();
  for (const c of compras) {
    const dia = c.fecha.getUTCDate();
    const fila = comprasPorDia.get(dia) ?? new Map<string, number>();
    fila.set(c.productId, (fila.get(c.productId) ?? 0) + Number(c.galones));
    comprasPorDia.set(dia, fila);
  }

  const fisicoPorClave = new Map<string, number>();
  for (const f of fisicos) {
    fisicoPorClave.set(`${f.fecha.toISOString().slice(0, 10)}|${f.productId}`, Number(f.galones));
  }

  const resultado = productos.map((p) => {
    const dias = new Map<number, FilaInventario>();
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fecha = new Date(Date.UTC(anio, mes - 1, dia));
      const clave = (f: Date) => `${f.toISOString().slice(0, 10)}|${p.id}`;
      const inicial =
        fisicoPorClave.get(clave(new Date(fecha.getTime() - 24 * 60 * 60 * 1000))) ?? null;
      const fisico = fisicoPorClave.get(clave(fecha)) ?? null;
      const comprasDia = comprasPorDia.get(dia)?.get(p.id) ?? 0;
      const ventas = ventasMatriz.get(dia)?.get(p.id) ?? null;
      dias.set(dia, armarFilaInventario(inicial, comprasDia, ventas, fisico));
    }
    return { id: p.id, nombre: p.nombre, dias };
  });

  return { anio, mes, diasEnMes, productos: resultado };
}

export interface FisicoForm {
  productId: string;
  galones: number | null; // null = no digitado
}

export interface CompraForm {
  productId: string;
  galones: number;
}

export type ResultadoInventario = { ok: true } | { ok: false; errores: string[] };

/**
 * Guarda la digitación de un día: reemplaza las compras (descargas) y hace
 * upsert del físico por producto. Filas con físico null se eliminan (no
 * digitado ≠ 0). Editable cualquier día, sin bloqueo por el cierre.
 */
export async function guardarInventarioDia(
  fechaStr: string,
  fisicosForm: FisicoForm[],
  comprasForm: CompraForm[]
): Promise<ResultadoInventario> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    return { ok: false, errores: ["Fecha inválida"] };
  }
  const fecha = inputAFecha(fechaStr);

  const productos = await prisma.product.findMany({ select: { id: true, nombre: true } });
  const nombrePorId = new Map(productos.map((p) => [p.id, p.nombre]));
  const errores: string[] = [];

  for (const f of fisicosForm) {
    if (!nombrePorId.has(f.productId)) {
      errores.push("Producto inválido en inventario físico");
    } else if (f.galones !== null && (f.galones < 0 || !Number.isFinite(f.galones))) {
      errores.push(`${nombrePorId.get(f.productId)}: el físico no puede ser negativo`);
    }
  }
  comprasForm.forEach((c, i) => {
    if (!nombrePorId.has(c.productId)) {
      errores.push(`Descarga ${i + 1}: producto inválido`);
    } else if (c.galones < 0 || !Number.isFinite(c.galones)) {
      errores.push(
        `Descarga ${i + 1} (${nombrePorId.get(c.productId)}): los galones no pueden ser negativos`
      );
    }
  });
  if (errores.length > 0) return { ok: false, errores };

  await prisma.$transaction(async (tx) => {
    await tx.compra.deleteMany({ where: { fecha } });
    if (comprasForm.length > 0) {
      await tx.compra.createMany({
        data: comprasForm.map((c) => ({
          fecha,
          productId: c.productId,
          galones: c.galones
        }))
      });
    }
    for (const f of fisicosForm) {
      if (f.galones === null) {
        await tx.inventarioFisico.deleteMany({
          where: { fecha, productId: f.productId }
        });
      } else {
        await tx.inventarioFisico.upsert({
          where: { fecha_productId: { fecha, productId: f.productId } },
          update: { galones: f.galones },
          create: { fecha, productId: f.productId, galones: f.galones }
        });
      }
    }
  });

  return { ok: true };
}
