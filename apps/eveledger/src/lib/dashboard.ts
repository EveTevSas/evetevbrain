// Lógica de servidor del Módulo 5 (dashboard gerencial).
// Todo se deriva de los módulos existentes; no hay nada que persistir.

import { prisma } from "@/lib/db";
import { margenMensual } from "@/lib/financiero";
import { resumenCartera, resumenVencidos } from "@/lib/cartera";
import { inventarioMensual } from "@/lib/inventarios";
import { galonesPorDiaProducto } from "@/lib/cierres";
import { redondear } from "@/lib/calc";

export interface SegmentoPago {
  clave: string;
  etiqueta: string;
  valor: number;
}

export interface DashboardMes {
  kpis: {
    ventasMes: number;
    utilidadBruta: number | null;
    totalCartera: number;
    carteraVencida: number;
    transportadora: number;
    faltantesNetos: number;
  };
  /** Torta: composición de las ventas del mes por medio de pago. */
  mediosPago: SegmentoPago[];
  /** Barras: galones vendidos por producto. */
  galonesPorProducto: { nombre: string; galones: number }[];
  alertas: { tipo: "cartera" | "merma"; texto: string }[];
}

/** Resumen gerencial del mes (solo cierres CLOSED). */
export async function dashboardMensual(anio: number, mes: number): Promise<DashboardMes> {
  const desde = new Date(Date.UTC(anio, mes - 1, 1));
  const hasta = new Date(Date.UTC(anio, mes, 1));

  const cierres = await prisma.dailyClose.findMany({
    where: { fecha: { gte: desde, lt: hasta }, estado: "CLOSED" },
    include: { readings: true, payments: true, credits: true, shortages: true }
  });

  // Ventas y medios de pago (misma ecuación del arqueo del Módulo 1).
  let ventasMes = 0;
  let tarjetas = 0;
  let transportadora = 0;
  let vales = 0;
  let faltantesNetos = 0;
  for (const c of cierres) {
    for (const r of c.readings) {
      const gal = Number(r.lecturaFinal) - Number(r.lecturaInicial) - Number(r.calibracion);
      ventasMes += redondear(gal * Number(r.precio));
    }
    for (const p of c.payments) {
      const v = Number(p.valor);
      if (p.tipo === "TRANSPORTADORA") transportadora += v;
      else if (p.tipo === "CREDIBANCO" || p.tipo === "REDEBAN") tarjetas += v;
      // OTRO queda registrado pero no hace parte del arqueo (regla de negocio).
    }
    for (const v of c.credits) vales += Number(v.valor);
    for (const f of c.shortages) faltantesNetos += Number(f.faltante) - Number(f.abono);
  }
  ventasMes = redondear(ventasMes);
  tarjetas = redondear(tarjetas);
  transportadora = redondear(transportadora);
  vales = redondear(vales);
  faltantesNetos = redondear(faltantesNetos);
  const efectivo = redondear(ventasMes - tarjetas - transportadora - vales - faltantesNetos);

  // Utilidad bruta del mes (Módulo 4).
  const margenes = await margenMensual(anio, mes);
  const utilidades = margenes.map((m) => m.utilidad).filter((u) => u !== null);
  const utilidadBrutaTotal =
    utilidades.length > 0 ? redondear(utilidades.reduce((a, u) => a + u, 0)) : null;

  // Cartera (Módulo 3).
  const cartera = await resumenCartera();
  const totalCartera = redondear(cartera.reduce((acc, c) => acc + c.saldo, 0));
  const vencidos = await resumenVencidos();
  const carteraVencida = redondear(vencidos.reduce((acc, v) => acc + v.vencido, 0));

  // Barras: galones por producto.
  const matriz = await galonesPorDiaProducto(desde, hasta);
  const productos = await prisma.product.findMany({ orderBy: { orden: "asc" } });
  const galPorProducto = new Map<string, number>();
  for (const fila of matriz.values()) {
    for (const [pid, gal] of fila) {
      galPorProducto.set(pid, (galPorProducto.get(pid) ?? 0) + gal);
    }
  }
  const galonesPorProducto = productos
    .map((p) => ({ nombre: p.nombre, galones: galPorProducto.get(p.id) ?? 0 }))
    .filter((p) => p.galones > 0);

  // Alertas de merma del mes (Módulo 2).
  const inv = await inventarioMensual(anio, mes);
  const alertas: DashboardMes["alertas"] = [];
  for (const v of vencidos) {
    alertas.push({
      tipo: "cartera",
      texto: `${v.nombre}: cartera vencida (>90 días) por ${v.vencido.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })}`
    });
  }
  for (const p of inv.productos) {
    for (const [dia, fila] of p.dias) {
      if (fila.alerta) {
        alertas.push({
          tipo: "merma",
          texto: `${p.nombre}, día ${dia}: variación de inventario de ${(fila.variacion ?? 0).toLocaleString("es-CO", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} gal`
        });
      }
    }
  }

  return {
    kpis: {
      ventasMes,
      utilidadBruta: utilidadBrutaTotal,
      totalCartera,
      carteraVencida,
      transportadora,
      faltantesNetos
    },
    mediosPago: [
      { clave: "efectivo", etiqueta: "Efectivo", valor: efectivo },
      { clave: "tarjetas", etiqueta: "Tarjetas", valor: tarjetas },
      { clave: "transportadora", etiqueta: "Transportadora", valor: transportadora },
      { clave: "vales", etiqueta: "Vales (cartera)", valor: vales },
      { clave: "faltantes", etiqueta: "Faltante isleros", valor: faltantesNetos }
    ].filter((s) => s.valor > 0),
    galonesPorProducto,
    alertas
  };
}
