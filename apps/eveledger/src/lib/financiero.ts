// Lógica de servidor del Módulo 4 (financiero: margen y gastos operativos).
// Solo se persisten los inputs (costos y gastos); P/VENTA, márgenes,
// utilidades y comparativas se derivan al leer con funciones puras de calc.ts.

import { prisma } from "@/lib/db";
import { redondear, margenPorGalon, utilidadBruta } from "@/lib/calc";

export type ResultadoFinanciero = { ok: true } | { ok: false; errores: string[] };

export const CATEGORIAS_GASTO = ["NOMINA", "SERVICIOS", "FLETES", "OTROS"] as const;
export type CategoriaGasto = (typeof CATEGORIAS_GASTO)[number];

function rangoMes(anio: number, mes: number): { desde: Date; hasta: Date } {
  return {
    desde: new Date(Date.UTC(anio, mes - 1, 1)),
    hasta: new Date(Date.UTC(anio, mes, 1))
  };
}

function mesAnterior(anio: number, mes: number): { anio: number; mes: number } {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

export interface MargenProducto {
  productId: string;
  nombre: string;
  galones: number;
  ventasPesos: number;
  /** P/VENTA ponderado = Σ pesos ÷ Σ galones (null si no hubo ventas). */
  pVenta: number | null;
  precioCompra: number;
  flete: number;
  margen: number | null;
  utilidad: number | null;
}

/** Margen y rentabilidad del mes por producto (cierres CLOSED + costos). */
export async function margenMensual(anio: number, mes: number): Promise<MargenProducto[]> {
  const { desde, hasta } = rangoMes(anio, mes);
  const productos = await prisma.product.findMany({ orderBy: { orden: "asc" } });
  const cierres = await prisma.dailyClose.findMany({
    where: { fecha: { gte: desde, lt: hasta }, estado: "CLOSED" },
    include: { readings: { include: { nozzle: true } } }
  });
  const costos = await prisma.costoProductoMes.findMany({ where: { anio, mes } });

  const galPorProducto = new Map<string, number>();
  const pesosPorProducto = new Map<string, number>();
  for (const c of cierres) {
    for (const r of c.readings) {
      const gal = Number(r.lecturaFinal) - Number(r.lecturaInicial) - Number(r.calibracion);
      const pid = r.nozzle.productId;
      galPorProducto.set(pid, (galPorProducto.get(pid) ?? 0) + gal);
      pesosPorProducto.set(
        pid,
        (pesosPorProducto.get(pid) ?? 0) + redondear(gal * Number(r.precio))
      );
    }
  }

  return productos.map((p) => {
    const galones = galPorProducto.get(p.id) ?? 0;
    const ventasPesos = redondear(pesosPorProducto.get(p.id) ?? 0);
    const pVenta = galones > 0 ? redondear(ventasPesos / galones) : null;
    const costo = costos.find((c) => c.productId === p.id);
    const precioCompra = Number(costo?.precioCompra ?? 0);
    const flete = Number(costo?.flete ?? 0);
    const margen = pVenta !== null ? margenPorGalon(pVenta, precioCompra, flete) : null;
    return {
      productId: p.id,
      nombre: p.nombre,
      galones,
      ventasPesos,
      pVenta,
      precioCompra,
      flete,
      margen,
      utilidad: margen !== null ? utilidadBruta(margen, galones) : null
    };
  });
}

export interface CostoForm {
  productId: string;
  precioCompra: number;
  flete: number;
}

/** Guarda (upsert) los costos digitados del mes por producto. */
export async function guardarCostos(
  anio: number,
  mes: number,
  costosForm: CostoForm[]
): Promise<ResultadoFinanciero> {
  const productos = await prisma.product.findMany({ select: { id: true, nombre: true } });
  const nombrePorId = new Map(productos.map((p) => [p.id, p.nombre]));
  const errores: string[] = [];
  for (const c of costosForm) {
    if (!nombrePorId.has(c.productId)) {
      errores.push("Producto inválido en costos");
    } else {
      if (c.precioCompra < 0 || !Number.isFinite(c.precioCompra))
        errores.push(`${nombrePorId.get(c.productId)}: el precio de compra no puede ser negativo`);
      if (c.flete < 0 || !Number.isFinite(c.flete))
        errores.push(`${nombrePorId.get(c.productId)}: el flete no puede ser negativo`);
    }
  }
  if (errores.length > 0) return { ok: false, errores };

  await prisma.$transaction(
    costosForm.map((c) =>
      prisma.costoProductoMes.upsert({
        where: { anio_mes_productId: { anio, mes, productId: c.productId } },
        update: { precioCompra: c.precioCompra, flete: c.flete },
        create: {
          anio,
          mes,
          productId: c.productId,
          precioCompra: c.precioCompra,
          flete: c.flete
        }
      })
    )
  );
  return { ok: true };
}

export interface GastosMes {
  gastos: {
    id: string;
    categoria: CategoriaGasto;
    valor: number;
    cantidad: number | null;
    detalle: string;
  }[];
  totalMes: number;
  /** Totales por categoría: [mes actual, mes anterior] para la comparativa. */
  comparativa: { categoria: CategoriaGasto; actual: number; anterior: number }[];
}

/** Gastos del mes y comparativa contra el mes anterior. */
export async function gastosMensual(anio: number, mes: number): Promise<GastosMes> {
  const gastos = await prisma.gastoOperativo.findMany({
    where: { anio, mes },
    orderBy: [{ categoria: "asc" }, { createdAt: "asc" }]
  });
  const prev = mesAnterior(anio, mes);
  const gastosPrev = await prisma.gastoOperativo.findMany({
    where: { anio: prev.anio, mes: prev.mes }
  });

  const suma = (lista: { categoria: string; valor: unknown }[], cat: string) =>
    redondear(
      lista.filter((g) => g.categoria === cat).reduce((acc, g) => acc + Number(g.valor), 0)
    );

  return {
    gastos: gastos.map((g) => ({
      id: g.id,
      categoria: g.categoria as CategoriaGasto,
      valor: Number(g.valor),
      cantidad: g.cantidad !== null ? Number(g.cantidad) : null,
      detalle: g.detalle ?? ""
    })),
    totalMes: redondear(gastos.reduce((acc, g) => acc + Number(g.valor), 0)),
    comparativa: CATEGORIAS_GASTO.map((c) => ({
      categoria: c,
      actual: suma(gastos, c),
      anterior: suma(gastosPrev, c)
    }))
  };
}

export async function agregarGasto(
  anio: number,
  mes: number,
  categoria: string,
  valor: number,
  cantidad: number | null,
  detalle: string
): Promise<ResultadoFinanciero> {
  if (!CATEGORIAS_GASTO.includes(categoria as CategoriaGasto)) {
    return { ok: false, errores: ["Categoría inválida"] };
  }
  if (valor <= 0 || !Number.isFinite(valor)) {
    return { ok: false, errores: ["El valor del gasto debe ser mayor que cero"] };
  }
  if (cantidad !== null && (cantidad < 0 || !Number.isFinite(cantidad))) {
    return { ok: false, errores: ["La cantidad no puede ser negativa"] };
  }
  await prisma.gastoOperativo.create({
    data: {
      anio,
      mes,
      categoria: categoria as CategoriaGasto,
      valor,
      cantidad,
      detalle: detalle.trim() || null
    }
  });
  return { ok: true };
}

export async function eliminarGasto(id: string): Promise<ResultadoFinanciero> {
  const gasto = await prisma.gastoOperativo.findUnique({ where: { id } });
  if (!gasto) return { ok: false, errores: ["El gasto no existe"] };
  await prisma.gastoOperativo.delete({ where: { id } });
  return { ok: true };
}
