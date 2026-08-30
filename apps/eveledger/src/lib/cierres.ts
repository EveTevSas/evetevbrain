import { prisma } from "@/lib/db";
import { validarLectura, totalVentasPesos, arqueoCuadrado, type TipoPago } from "@/lib/calc";
import { inputAFecha } from "@/lib/format";

// Tipos de entrada para guardar un cierre (borrador o cerrado).
export interface LecturaForm {
  nozzleId: string;
  lecturaInicial: number;
  lecturaFinal: number;
  calibracion: number;
  precio: number;
}

export interface PagoForm {
  tipo: TipoPago;
  detalle?: string;
  valor: number;
}

export interface ValeForm {
  clienteId: string;
  valor: number;
}

export interface FaltanteForm {
  empleado: string;
  faltante: number;
  abono: number;
}

export interface CierreFormData {
  lecturas: LecturaForm[];
  pagos: PagoForm[];
  vales: ValeForm[];
  faltantes: FaltanteForm[];
  efectivo: number;
}

export type Resultado = { ok: true; id: string } | { ok: false; errores: string[] };

/** Lectura final de una manguera en el último cierre (cualquier estado) con fecha < fecha. */
async function ultimaLecturaPrevio(nozzleId: string, fecha: Date): Promise<number | null> {
  const lectura = await prisma.nozzleReading.findFirst({
    where: { nozzleId, close: { fecha: { lt: fecha } } },
    orderBy: { close: { fecha: "desc" } }
  });
  return lectura ? Number(lectura.lecturaFinal) : null;
}

/**
 * Datos para armar el formulario de un cierre nuevo:
 * por cada manguera activa, la lectura inicial arrastrada del cierre anterior.
 * `esBase=true` si no hay cierre previo (la inicial se digita una sola vez).
 */
export async function prepararNuevoCierre(fechaStr: string) {
  const fecha = inputAFecha(fechaStr);
  const nozzles = await prisma.nozzle.findMany({
    where: { activa: true },
    include: { product: true },
    orderBy: [{ product: { orden: "asc" } }, { nombre: "asc" }]
  });
  const lecturas = await Promise.all(
    nozzles.map(async (n) => {
      const previa = await ultimaLecturaPrevio(n.id, fecha);
      return {
        nozzleId: n.id,
        nozzleNombre: n.nombre,
        productoNombre: n.product.nombre,
        lecturaInicial: previa ?? 0,
        esBase: previa === null
      };
    })
  );
  return { fecha: fechaStr, lecturas };
}

/** Crea el cierre en DRAFT para una fecha. Rechaza duplicados. */
export async function crearCierre(fechaStr: string): Promise<Resultado> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    return { ok: false, errores: ["Fecha inválida"] };
  }
  const fecha = inputAFecha(fechaStr);
  const existente = await prisma.dailyClose.findUnique({ where: { fecha } });
  if (existente) {
    return { ok: false, errores: ["Ya existe un cierre para esa fecha"] };
  }
  const prep = await prepararNuevoCierre(fechaStr);
  if (prep.lecturas.length === 0) {
    return { ok: false, errores: ["No hay mangueras activas configuradas"] };
  }
  const cierre = await prisma.dailyClose.create({
    data: {
      fecha,
      readings: {
        create: prep.lecturas.map((l) => ({
          nozzleId: l.nozzleId,
          lecturaInicial: l.lecturaInicial,
          lecturaFinal: l.lecturaInicial, // arranque válido: final = inicial
          calibracion: 0,
          precio: 0
        }))
      }
    }
  });
  return { ok: true, id: cierre.id };
}

function validarDatos(data: CierreFormData, lecturas: LecturaForm[]): string[] {
  const errores: string[] = [];
  // Las lecturas se validan DESPUÉS de imponer la inicial fijada por el sistema.
  lecturas.forEach((l, i) => {
    validarLectura(l).forEach((e) => errores.push(`Lectura ${i + 1}: ${e}`));
  });
  data.pagos.forEach((p, i) => {
    if (p.valor < 0) errores.push(`Pago ${i + 1}: el valor no puede ser negativo`);
  });
  data.vales.forEach((v, i) => {
    if (!v.clienteId) errores.push(`Vale ${i + 1}: el cliente es obligatorio`);
    if (v.valor < 0) errores.push(`Vale ${i + 1}: el valor no puede ser negativo`);
  });
  data.faltantes.forEach((f, i) => {
    if (!f.empleado.trim()) errores.push(`Faltante ${i + 1}: el empleado es obligatorio`);
    if (f.faltante < 0) errores.push(`Faltante ${i + 1}: el faltante no puede ser negativo`);
    if (f.abono < 0) errores.push(`Faltante ${i + 1}: el abono no puede ser negativo`);
    if (f.abono > f.faltante)
      errores.push(`Faltante ${i + 1}: el abono no puede superar el faltante`);
  });
  if (data.efectivo < 0) errores.push("El efectivo en caja no puede ser negativo");
  return errores;
}

/**
 * Guarda el contenido de un cierre DRAFT (reemplaza lecturas, pagos, vales
 * y faltantes). Si `cerrar=true` exige comprobación exacta en $0 y marca el
 * cierre como CLOSED (solo lectura desde entonces).
 */
export async function guardarCierre(
  closeId: string,
  data: CierreFormData,
  cerrar: boolean
): Promise<Resultado> {
  const cierre = await prisma.dailyClose.findUnique({
    where: { id: closeId },
    include: { readings: true }
  });
  if (!cierre) return { ok: false, errores: ["El cierre no existe"] };
  if (cierre.estado === "CLOSED") {
    return { ok: false, errores: ["El cierre ya está cerrado y es de solo lectura"] };
  }

  // Regla 1: la lectura inicial la fija el sistema. Solo es editable cuando la
  // manguera no tiene lecturas en cierres anteriores (primer cierre / base).
  const nozzleIds = cierre.readings.map((r) => r.nozzleId);
  const inicialesFijas = new Map<string, number>();
  for (const nozzleId of nozzleIds) {
    const previa = await ultimaLecturaPrevio(nozzleId, cierre.fecha);
    if (previa !== null) inicialesFijas.set(nozzleId, previa);
  }
  const lecturasFinales = data.lecturas.map((l) => {
    const fija = inicialesFijas.get(l.nozzleId);
    return fija !== undefined ? { ...l, lecturaInicial: fija } : l;
  });

  const errores = validarDatos(data, lecturasFinales);

  // Los vales referencian clientes activos del módulo de cartera.
  const clienteIds = [...new Set(data.vales.map((v) => v.clienteId).filter(Boolean))];
  if (clienteIds.length > 0) {
    const clientes = await prisma.cliente.findMany({
      where: { id: { in: clienteIds } }
    });
    const porId = new Map(clientes.map((c) => [c.id, c]));
    data.vales.forEach((v, i) => {
      if (!v.clienteId) return;
      const c = porId.get(v.clienteId);
      if (!c) errores.push(`Vale ${i + 1}: el cliente no existe`);
      else if (!c.activo) errores.push(`Vale ${i + 1}: el cliente ${c.nombre} está inactivo`);
    });
  }
  if (errores.length > 0) return { ok: false, errores };

  if (cerrar) {
    const total = totalVentasPesos(lecturasFinales);
    const cuadrado = arqueoCuadrado(total, {
      efectivo: data.efectivo,
      pagos: data.pagos,
      vales: data.vales.map((v) => v.valor),
      faltantes: data.faltantes
    });
    if (!cuadrado) {
      return {
        ok: false,
        errores: ["La comprobación del arqueo no es $0. Ajusta los valores antes de cerrar el día."]
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.nozzleReading.deleteMany({ where: { closeId } });
    await tx.payment.deleteMany({ where: { closeId } });
    await tx.creditSale.deleteMany({ where: { closeId } });
    await tx.employeeShortage.deleteMany({ where: { closeId } });

    await tx.nozzleReading.createMany({
      data: lecturasFinales.map((l) => ({
        closeId,
        nozzleId: l.nozzleId,
        lecturaInicial: l.lecturaInicial,
        lecturaFinal: l.lecturaFinal,
        calibracion: l.calibracion,
        precio: l.precio
      }))
    });
    if (data.pagos.length > 0) {
      await tx.payment.createMany({
        data: data.pagos.map((p) => ({
          closeId,
          tipo: p.tipo,
          detalle: p.detalle?.trim() || null,
          valor: p.valor
        }))
      });
    }
    if (data.vales.length > 0) {
      await tx.creditSale.createMany({
        data: data.vales.map((v) => ({ closeId, clienteId: v.clienteId, valor: v.valor }))
      });
    }
    if (data.faltantes.length > 0) {
      await tx.employeeShortage.createMany({
        data: data.faltantes.map((f) => ({
          closeId,
          empleado: f.empleado.trim(),
          faltante: f.faltante,
          abono: f.abono
        }))
      });
    }
    if (cerrar) {
      await tx.dailyClose.update({
        where: { id: closeId },
        data: { estado: "CLOSED", closedAt: new Date() }
      });
    }
  });

  return { ok: true, id: closeId };
}

/** Detalle completo de un cierre para mostrar/editar. */
export async function obtenerCierre(closeId: string) {
  const cierre = await prisma.dailyClose.findUnique({
    where: { id: closeId },
    include: {
      readings: { include: { nozzle: { include: { product: true } } } },
      payments: true,
      credits: { include: { cliente: true } },
      shortages: true
    }
  });
  if (!cierre) return null;

  // Marca qué lecturas tienen la inicial bloqueada (hay cierre previo).
  const lecturas = await Promise.all(
    cierre.readings.map(async (r) => {
      const previa = await ultimaLecturaPrevio(r.nozzleId, cierre.fecha);
      return {
        nozzleId: r.nozzleId,
        nozzleNombre: r.nozzle.nombre,
        productoNombre: r.nozzle.product.nombre,
        ordenProducto: r.nozzle.product.orden,
        lecturaInicial: Number(r.lecturaInicial),
        lecturaFinal: Number(r.lecturaFinal),
        calibracion: Number(r.calibracion),
        precio: Number(r.precio),
        esBase: previa === null
      };
    })
  );
  lecturas.sort(
    (a, b) => a.ordenProducto - b.ordenProducto || a.nozzleNombre.localeCompare(b.nozzleNombre)
  );

  return {
    id: cierre.id,
    fecha: cierre.fecha,
    estado: cierre.estado,
    closedAt: cierre.closedAt,
    lecturas,
    pagos: cierre.payments.map((p) => ({
      tipo: p.tipo as TipoPago,
      detalle: p.detalle ?? "",
      valor: Number(p.valor)
    })),
    vales: cierre.credits.map((v) => ({
      clienteId: v.clienteId,
      clienteNombre: v.cliente.nombre,
      valor: Number(v.valor)
    })),
    faltantes: cierre.shortages.map((f) => ({
      empleado: f.empleado,
      faltante: Number(f.faltante),
      abono: Number(f.abono)
    }))
  };
}

/** Total de ventas en pesos de un cierre (derivado, no persistido). */
export async function totalVentasCierre(closeId: string): Promise<number> {
  const readings = await prisma.nozzleReading.findMany({ where: { closeId } });
  return totalVentasPesos(
    readings.map((r) => ({
      lecturaInicial: Number(r.lecturaInicial),
      lecturaFinal: Number(r.lecturaFinal),
      calibracion: Number(r.calibracion),
      precio: Number(r.precio)
    }))
  );
}

/**
 * Galones vendidos por día (día del mes UTC) y producto, solo cierres CLOSED
 * en [desde, hasta). Compartido entre el consolidado mensual y el módulo de
 * inventarios.
 */
export async function galonesPorDiaProducto(
  desde: Date,
  hasta: Date
): Promise<Map<number, Map<string, number>>> {
  const cierres = await prisma.dailyClose.findMany({
    where: { fecha: { gte: desde, lt: hasta }, estado: "CLOSED" },
    include: { readings: { include: { nozzle: true } } },
    orderBy: { fecha: "asc" }
  });

  // matriz[dia][productId] = galones
  const matriz = new Map<number, Map<string, number>>();
  for (const c of cierres) {
    const dia = c.fecha.getUTCDate();
    const fila = matriz.get(dia) ?? new Map<string, number>();
    for (const r of c.readings) {
      const gal = Number(r.lecturaFinal) - Number(r.lecturaInicial) - Number(r.calibracion);
      fila.set(r.nozzle.productId, (fila.get(r.nozzle.productId) ?? 0) + gal);
    }
    matriz.set(dia, fila);
  }
  return matriz;
}

/** Consolidado mensual de galones: días 1..N × productos (solo CLOSED). */
export async function consolidadoMensual(anio: number, mes: number) {
  const desde = new Date(Date.UTC(anio, mes - 1, 1));
  const hasta = new Date(Date.UTC(anio, mes, 1));
  const diasEnMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();

  const productos = await prisma.product.findMany({ orderBy: { orden: "asc" } });
  const matriz = await galonesPorDiaProducto(desde, hasta);

  return { anio, mes, diasEnMes, productos, matriz };
}
