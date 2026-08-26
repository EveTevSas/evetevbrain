// Lógica de servidor del Módulo 3 (cartera).
// Saldos, totales de factura, aging y aplicación FIFO se derivan al leer con
// las funciones puras de calc.ts; solo se persisten clientes, vales, facturas
// y abonos.

import { prisma } from "@/lib/db";
import {
  redondear,
  rangoAging,
  semaforoAging,
  aplicarFifo,
  saldoCliente,
  type RangoAging,
  type Semaforo
} from "@/lib/calc";
import { inputAFecha } from "@/lib/format";

export type ResultadoCartera = { ok: true } | { ok: false; errores: string[] };

const DIA_MS = 24 * 60 * 60 * 1000;

/** Días de mora desde la emisión hasta hoy (ambos en medianoche UTC). */
function diasMora(fechaEmision: Date): number {
  const hoy = new Date();
  const hoyUTC = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  return Math.max(0, Math.floor((hoyUTC - fechaEmision.getTime()) / DIA_MS));
}

interface FacturaConVales {
  id: string;
  fechaEmision: Date;
  vales: { valor: unknown }[];
}

/** Deriva totales, saldo FIFO y aging de las facturas de un cliente. */
function armarFacturas(facturas: FacturaConVales[], totalAbonos: number) {
  const ordenadas = [...facturas].sort(
    (a, b) => a.fechaEmision.getTime() - b.fechaEmision.getTime()
  );
  const totales = ordenadas.map((f) => ({
    id: f.id,
    total: redondear(f.vales.reduce((acc, v) => acc + Number(v.valor), 0))
  }));
  const pendientes = aplicarFifo(totales, totalAbonos);
  return ordenadas.map((f, i) => {
    const total = totales[i].total;
    const pendiente = pendientes.get(f.id) ?? total;
    const dias = pendiente > 0 ? diasMora(f.fechaEmision) : 0;
    return {
      id: f.id,
      fechaEmision: f.fechaEmision,
      total,
      abonado: redondear(total - pendiente),
      pendiente,
      dias,
      rango: rangoAging(dias) as RangoAging,
      semaforo: semaforoAging(dias) as Semaforo
    };
  });
}

/** Peor semáforo entre facturas con saldo pendiente (verde < ámbar < rojo). */
function peorSemaforo(facturas: { pendiente: number; semaforo: Semaforo }[]): Semaforo {
  const orden: Semaforo[] = ["rojo", "ambar", "verde"];
  for (const s of orden) {
    if (facturas.some((f) => f.pendiente > 0 && f.semaforo === s)) return s;
  }
  return "verde";
}

/** Clientes activos para el <select> de vales del cierre. */
export async function listarClientesActivos() {
  const clientes = await prisma.cliente.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true }
  });
  return clientes;
}

/** Resumen de todos los clientes para /cartera. */
export async function resumenCartera() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
    include: {
      vales: true,
      facturas: { include: { vales: true } },
      abonos: true
    }
  });
  return clientes.map((c) => {
    const totalVales = redondear(c.vales.reduce((acc, v) => acc + Number(v.valor), 0));
    const totalAbonos = redondear(c.abonos.reduce((acc, a) => acc + Number(a.valor), 0));
    const saldo = saldoCliente(totalVales, totalAbonos);
    const facturas = armarFacturas(c.facturas, totalAbonos);
    const cupo = Number(c.cupo);
    return {
      id: c.id,
      nombre: c.nombre,
      activo: c.activo,
      cupo,
      saldo,
      usoCupo: cupo > 0 ? saldo / cupo : null,
      sobreCupo: cupo > 0 && saldo > cupo,
      semaforo: peorSemaforo(facturas)
    };
  });
}

/**
 * Cartera vencida por cliente: Σ pendiente de facturas con semáforo rojo
 * (>90 días). Usado por el dashboard gerencial.
 */
export async function resumenVencidos() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
    include: { facturas: { include: { vales: true } }, abonos: true }
  });
  return clientes
    .map((c) => {
      const totalAbonos = redondear(c.abonos.reduce((acc, a) => acc + Number(a.valor), 0));
      const facturas = armarFacturas(c.facturas, totalAbonos);
      const vencido = redondear(
        facturas
          .filter((f) => f.pendiente > 0 && f.semaforo === "rojo")
          .reduce((acc, f) => acc + f.pendiente, 0)
      );
      return { id: c.id, nombre: c.nombre, vencido };
    })
    .filter((c) => c.vencido > 0);
}

/** Detalle completo de un cliente para /cartera/[id]. */
export async function detalleCliente(clienteId: string) {
  const c = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: {
      vales: { where: { facturaId: null }, include: { close: true } },
      facturas: { include: { vales: true } },
      abonos: { orderBy: { fecha: "desc" } }
    }
  });
  if (!c) return null;

  const totalValesTodos = await prisma.creditSale.aggregate({
    where: { clienteId },
    _sum: { valor: true }
  });
  const totalAbonos = redondear(c.abonos.reduce((acc, a) => acc + Number(a.valor), 0));
  const saldo = saldoCliente(Number(totalValesTodos._sum.valor ?? 0), totalAbonos);
  const facturas = armarFacturas(c.facturas, totalAbonos);
  const cupo = Number(c.cupo);

  return {
    id: c.id,
    nombre: c.nombre,
    activo: c.activo,
    cupo,
    saldo,
    usoCupo: cupo > 0 ? saldo / cupo : null,
    sobreCupo: cupo > 0 && saldo > cupo,
    valesSinFacturar: c.vales
      .map((v) => ({
        id: v.id,
        fecha: v.close.fecha,
        cerrado: v.close.estado === "CLOSED",
        valor: Number(v.valor)
      }))
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime()),
    facturas,
    abonos: c.abonos.map((a) => ({
      id: a.id,
      fecha: a.fecha,
      valor: Number(a.valor),
      detalle: a.detalle ?? ""
    }))
  };
}

function validarCliente(nombre: string, cupo: number): string[] {
  const errores: string[] = [];
  if (!nombre.trim()) errores.push("El nombre es obligatorio");
  if (nombre.trim().length > 120) errores.push("El nombre es demasiado largo");
  if (cupo < 0 || !Number.isFinite(cupo)) errores.push("El cupo no puede ser negativo");
  return errores;
}

export async function crearCliente(nombre: string, cupo: number): Promise<ResultadoCartera> {
  const errores = validarCliente(nombre, cupo);
  if (errores.length > 0) return { ok: false, errores };
  const existente = await prisma.cliente.findUnique({ where: { nombre: nombre.trim() } });
  if (existente) return { ok: false, errores: ["Ya existe un cliente con ese nombre"] };
  await prisma.cliente.create({ data: { nombre: nombre.trim(), cupo } });
  return { ok: true };
}

export async function actualizarCliente(
  id: string,
  data: { nombre: string; cupo: number; activo: boolean }
): Promise<ResultadoCartera> {
  const errores = validarCliente(data.nombre, data.cupo);
  if (errores.length > 0) return { ok: false, errores };
  const duplicado = await prisma.cliente.findFirst({
    where: { nombre: data.nombre.trim(), id: { not: id } }
  });
  if (duplicado) return { ok: false, errores: ["Ya existe otro cliente con ese nombre"] };
  await prisma.cliente.update({
    where: { id },
    data: { nombre: data.nombre.trim(), cupo: data.cupo, activo: data.activo }
  });
  return { ok: true };
}

/**
 * Convierte en factura todos los vales sin facturar de cierres CLOSED del
 * cliente (ciclo ERP: vale → factura; el reloj de mora arranca hoy).
 */
export async function generarFactura(clienteId: string): Promise<ResultadoCartera> {
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) return { ok: false, errores: ["El cliente no existe"] };

  const vales = await prisma.creditSale.findMany({
    where: { clienteId, facturaId: null, close: { estado: "CLOSED" } }
  });
  if (vales.length === 0) {
    return { ok: false, errores: ["No hay vales de cierres cerrados por facturar"] };
  }

  const hoy = new Date();
  const fechaEmision = new Date(
    Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate())
  );
  await prisma.$transaction(async (tx) => {
    const factura = await tx.factura.create({ data: { clienteId, fechaEmision } });
    await tx.creditSale.updateMany({
      where: { id: { in: vales.map((v) => v.id) } },
      data: { facturaId: factura.id }
    });
  });
  return { ok: true };
}

export async function registrarAbono(
  clienteId: string,
  fechaStr: string,
  valor: number,
  detalle: string
): Promise<ResultadoCartera> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    return { ok: false, errores: ["Fecha inválida"] };
  }
  if (valor <= 0 || !Number.isFinite(valor)) {
    return { ok: false, errores: ["El abono debe ser mayor que cero"] };
  }
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) return { ok: false, errores: ["El cliente no existe"] };

  await prisma.abono.create({
    data: {
      clienteId,
      fecha: inputAFecha(fechaStr),
      valor,
      detalle: detalle.trim() || null
    }
  });
  return { ok: true };
}
