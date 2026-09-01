// Genera dos meses de operación completos y coherentes, para recorrer la aplicación
// entera con datos que se parecen a los de verdad: cierres diarios cuadrados,
// inventarios con una merma, cartera con facturas en varios rangos de mora y
// abonos FIFO, y el financiero con su comparativa contra el mes anterior.
//
// NO es la semilla. La semilla (`prisma db seed`) crea el administrador y nada
// más. Esto es para demostrar y probar; se borra con `demo-limpiar.ts`.
//
//   pnpm exec tsx scripts/demo-completa.ts
//
// Se niega a correr si ya hay cierres: no está pensado para mezclarse con datos
// existentes, y menos con los de un cliente real.
import "dotenv/config";
import { crearCierre, guardarCierre, prepararNuevoCierre } from "../src/lib/cierres";
import { obtenerInventarioDia, guardarInventarioDia } from "../src/lib/inventarios";
import { generarFactura, registrarAbono } from "../src/lib/cartera";
import { guardarCostos, agregarGasto } from "../src/lib/financiero";
import { existenciaTeorica } from "../src/lib/calc";
import { prisma } from "../src/lib/db";

// ── Parámetros del escenario ────────────────────────────────────────────────

const HOY = new Date();
const ANIO = HOY.getUTCFullYear();
const MES = HOY.getUTCMonth() + 1;
const DIA_HOY = HOY.getUTCDate();

/** Precio de venta por producto (COP/galón). */
const PRECIOS: Record<string, number> = { Corriente: 16500, Diesel: 15200, Extra: 19800 };
/** Costo y flete del mes actual; el anterior se deriva un poco más barato. */
const COSTOS: Record<string, { compra: number; flete: number }> = {
  Corriente: { compra: 14100, flete: 320 },
  Diesel: { compra: 13050, flete: 320 },
  Extra: { compra: 16900, flete: 380 }
};

const ISLEROS = ["Carlos Pérez", "Marta Ruiz", "Jhon Cárdenas"];

/** Clientes de cartera. `moraCiclo1` = días de antigüedad de su primera factura. */
const CLIENTES = [
  { nombre: "Transportes del Norte S.A.S.", cupo: 8_000_000, vale: 320_000, moraCiclo1: 100 },
  { nombre: "Cootrans Villavicencio", cupo: 6_000_000, vale: 260_000, moraCiclo1: 45 },
  { nombre: "Agrícola La Esperanza", cupo: 4_000_000, vale: 180_000, moraCiclo1: 15 },
  // Cupo corto a propósito: acaba en sobrecupo, que es una de las alertas.
  { nombre: "Volquetas Meta Ltda.", cupo: 600_000, vale: 240_000, moraCiclo1: 200 }
];

function f(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function mesAnterior(): { anio: number; mes: number } {
  return MES === 1 ? { anio: ANIO - 1, mes: 12 } : { anio: ANIO, mes: MES - 1 };
}

/**
 * Todas las fechas del periodo: desde el 1 del mes anterior hasta hoy.
 *
 * Cubrir dos meses no es capricho. Casi todas las pantallas abren en el mes
 * corriente, así que generar solo el mes actual dejaba la aplicación en blanco
 * cada día 1 —y el día 1 es justo cuando alguien la abre para enseñarla—. Con el
 * mes anterior completo siempre hay un periodo con operación de verdad, y la
 * comparativa de gastos deja de compararse contra la nada.
 */
function fechasDelPeriodo(): Date[] {
  const ant = mesAnterior();
  const fin = new Date(Date.UTC(ANIO, MES - 1, DIA_HOY));
  const fechas: Date[] = [];
  const d = new Date(Date.UTC(ant.anio, ant.mes - 1, 1));
  while (d <= fin) {
    fechas.push(new Date(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return fechas;
}

function comoTexto(d: Date): string {
  return f(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Galones vendidos por manguera y día: variación suave + más venta en fin de semana. */
function galonesDelDia(fecha: Date, i: number, idx: number): number {
  const finde = [0, 6].includes(fecha.getUTCDay());
  const base = 260 + idx * 18;
  const onda = Math.round(38 * Math.sin((i + idx) / 2.4));
  return base + onda + (finde ? 55 : 0);
}

async function main() {
  const yaHay = await prisma.dailyClose.count();
  if (yaHay > 0) {
    console.error(
      `Hay ${yaHay} cierres en la base. Este script solo corre sobre una base sin cierres.\n` +
        `Si son datos de demostración, bórralos antes:  pnpm exec tsx scripts/demo-limpiar.ts --si`
    );
    process.exit(1);
  }

  // ── 1. Configuración: productos y mangueras ───────────────────────────────
  const productos: { id: string; nombre: string }[] = [];
  // Nombres tal como aparecen en el Excel del cliente: las columnas de producto
  // dicen CORRIENTE / DIESEL / EXTRA, y las mangueras van numeradas con la
  // abreviatura del combustible (2 CTE, 3 ACPM…). Que coincida importa: es lo
  // que la gerencia compara contra su hoja.
  const ABREV: Record<string, string> = { Corriente: "CTE", Diesel: "ACPM", Extra: "EXTRA" };
  let numeroManguera = 0;
  for (const [orden, nombre] of ["Corriente", "Diesel", "Extra"].entries()) {
    let p = await prisma.product.findFirst({ where: { nombre } });
    p ??= await prisma.product.create({ data: { nombre, orden: orden + 1 } });
    productos.push({ id: p.id, nombre: p.nombre });
    for (let i = 1; i <= 2; i++) {
      numeroManguera++;
      const nombreManguera = `${numeroManguera} ${ABREV[nombre]}`;
      const existe = await prisma.nozzle.findFirst({
        where: { nombre: nombreManguera, productId: p.id }
      });
      if (!existe) {
        await prisma.nozzle.create({ data: { nombre: nombreManguera, productId: p.id } });
      }
    }
  }
  console.log(`Configuración: ${productos.length} productos, ${productos.length * 2} mangueras`);

  // ── 2. Clientes de cartera ────────────────────────────────────────────────
  const clientes: { id: string; vale: number; moraCiclo1: number }[] = [];
  for (const c of CLIENTES) {
    let cli = await prisma.cliente.findUnique({ where: { nombre: c.nombre } });
    cli ??= await prisma.cliente.create({ data: { nombre: c.nombre, cupo: c.cupo } });
    clientes.push({ id: cli.id, vale: c.vale, moraCiclo1: c.moraCiclo1 });
  }
  console.log(`Cartera: ${clientes.length} clientes`);

  // ── 3. Existencia de apertura ─────────────────────────────────────────────
  // El inicial de un día es el físico del anterior. Sin esto, el día 1 arrancaría
  // en cero y la teórica saldría negativa en cuanto hubiera ventas.
  const ant = mesAnterior();
  const fechas = fechasDelPeriodo();
  const anteayer = new Date(fechas[0]);
  anteayer.setUTCDate(anteayer.getUTCDate() - 1);
  const vispera = comoTexto(anteayer);
  await guardarInventarioDia(
    vispera,
    productos.map((p) => ({ productId: p.id, galones: 9000 })),
    []
  );
  console.log(`Existencia de apertura (${vispera}): 9.000 gal por producto`);

  // ── 4. Cierres diarios ────────────────────────────────────────────────────
  // Todos cerrados salvo el de hoy, que queda en borrador para que se vean los
  // dos estados. Los vales se reparten en dos tandas para poder facturar dos
  // veces por cliente y que el FIFO de los abonos tenga contra qué aplicarse.
  // Dos cortes de facturación repartidos por el periodo, para que cada cliente
  // acumule factura vieja y reciente y el FIFO tenga contra qué aplicarse.
  const CORTE_CICLO1 = Math.floor(fechas.length * 0.45);
  let cerrados = 0;

  for (let i = 0; i < fechas.length; i++) {
    const dia = i + 1; // posición en el periodo, no del mes
    const fecha = comoTexto(fechas[i]);
    const esHoy = i === fechas.length - 1;

    const creado = await crearCierre(fecha);
    if (!creado.ok) throw new Error(`${fecha}: ${creado.errores.join(", ")}`);
    const prep = await prepararNuevoCierre(fecha);

    const lecturas = prep.lecturas.map((l, idx) => {
      const inicial = i === 0 ? 125_000 + idx * 4_000 : l.lecturaInicial;
      const calibracion = dia % 7 === 0 ? 4 : 0;
      return {
        nozzleId: l.nozzleId,
        lecturaInicial: inicial,
        lecturaFinal: inicial + galonesDelDia(fechas[i], i, idx) + calibracion,
        calibracion,
        precio: PRECIOS[l.productoNombre] ?? 16_000
      };
    });

    const totalVentas = Math.round(
      lecturas.reduce(
        (a, l) => a + (l.lecturaFinal - l.lecturaInicial - l.calibracion) * l.precio,
        0
      )
    );

    // Vales: un cliente distinto cada día, saltando el de sobrecupo salvo en el
    // primer ciclo (para que quede vencido y por encima del cupo).
    const vales =
      esHoy || dia % 2 === 1
        ? []
        : [
            {
              clienteId: clientes[(dia / 2) % clientes.length].id,
              valor: clientes[(dia / 2) % clientes.length].vale
            }
          ];

    const faltantes =
      dia % 5 === 0 && !esHoy
        ? [{ empleado: ISLEROS[dia % ISLEROS.length], faltante: 45_000, abono: 15_000 }]
        : [];

    const tarjetas = Math.round(totalVentas * 0.34);
    const transportadora = dia % 3 === 0 ? Math.round(totalVentas * 0.12) : 0;
    const pagos = [
      {
        tipo: "CREDIBANCO" as const,
        detalle: "Datáfono isla 1",
        valor: Math.round(tarjetas * 0.6)
      },
      { tipo: "REDEBAN" as const, detalle: "", valor: tarjetas - Math.round(tarjetas * 0.6) },
      ...(transportadora > 0
        ? [{ tipo: "TRANSPORTADORA" as const, detalle: "Flota Cootrans", valor: transportadora }]
        : [])
    ];

    // Regla 5: el efectivo es el residual que hace la comprobación exactamente $0.
    const totalVales = vales.reduce((a, v) => a + v.valor, 0);
    const faltantesNetos = faltantes.reduce((a, x) => a + (x.faltante - x.abono), 0);
    const efectivo = totalVentas - tarjetas - transportadora - totalVales - faltantesNetos;

    const guardado = await guardarCierre(
      creado.id,
      { lecturas, pagos, vales, faltantes, efectivo },
      !esHoy // hoy queda en borrador
    );
    if (!guardado.ok) throw new Error(`${fecha}: ${guardado.errores.join(", ")}`);
    if (!esHoy) cerrados++;

    // Facturación del primer ciclo, en cuanto se pasa el corte.
    if (i === CORTE_CICLO1) {
      for (const c of clientes) {
        const r = await generarFactura(c.id);
        if (r.ok) {
          // generarFactura emite con fecha de hoy; se retrasa para que el aging
          // caiga en rangos distintos y el semáforo muestre los tres colores.
          const factura = await prisma.factura.findFirst({
            where: { clienteId: c.id },
            orderBy: { fechaEmision: "desc" }
          });
          if (factura) {
            const emision = new Date(HOY);
            emision.setUTCDate(emision.getUTCDate() - c.moraCiclo1);
            await prisma.factura.update({
              where: { id: factura.id },
              data: {
                fechaEmision: new Date(
                  Date.UTC(emision.getUTCFullYear(), emision.getUTCMonth(), emision.getUTCDate())
                )
              }
            });
          }
        }
      }
      console.log(`Ciclo 1 facturado (corte en ${comoTexto(fechas[CORTE_CICLO1])})`);
    }
  }
  console.log(
    `Cierres: ${cerrados} cerrados + 1 borrador (hoy) · ${comoTexto(fechas[0])} → ${comoTexto(fechas[fechas.length - 1])}`
  );

  // ── 5. Facturación del segundo ciclo ──────────────────────────────────────
  // Sin retrasar: quedan recientes (rango 0-30, verde), que es lo que deja ver
  // el FIFO matando primero la vieja cuando entra un abono.
  let facturasCiclo2 = 0;
  for (const c of clientes) {
    const r = await generarFactura(c.id);
    if (r.ok) facturasCiclo2++;
  }
  console.log(`Ciclo 2 facturado: ${facturasCiclo2} facturas`);

  // ── 6. Abonos ─────────────────────────────────────────────────────────────
  // Parciales a propósito: si cubrieran todo, no quedaría cartera que mostrar.
  const abonos = [
    { i: 0, dias: 20, valor: 400_000, detalle: "Consignación Bancolombia" },
    { i: 1, dias: 10, valor: 300_000, detalle: "Transferencia PSE" },
    { i: 2, dias: 5, valor: 150_000, detalle: "Efectivo en caja" }
  ];
  for (const a of abonos) {
    const fechaAbono = new Date(HOY);
    fechaAbono.setUTCDate(fechaAbono.getUTCDate() - a.dias);
    const r = await registrarAbono(
      clientes[a.i].id,
      f(fechaAbono.getUTCFullYear(), fechaAbono.getUTCMonth() + 1, fechaAbono.getUTCDate()),
      a.valor,
      a.detalle
    );
    if (!r.ok) console.warn(`Abono ${a.i}: ${r.errores.join(", ")}`);
  }
  console.log(`Abonos: ${abonos.length} (aplicación FIFO)`);

  // ── 7. Inventarios ────────────────────────────────────────────────────────
  // Dos pasadas por día: primero las compras, luego se lee la teórica que
  // resulta y se digita el físico encima. El físico se pega a la teórica salvo
  // en dos días, donde se hunde lo bastante para disparar la alerta de merma
  // (umbral: 0,5 % de la teórica, mínimo 1 gal).
  // Una merma en cada mes, para que la alerta se vea mire donde mire.
  const DIAS_CON_MERMA = [Math.floor(fechas.length * 0.22), Math.floor(fechas.length * 0.78)];
  let diasConAlerta = 0;

  for (let i = 0; i < fechas.length - 1; i++) {
    const dia = i + 1;
    const fecha = comoTexto(fechas[i]);
    const hayDescarga = dia % 4 === 0;
    const compras = hayDescarga
      ? productos.map((p) => ({ productId: p.id, galones: p.nombre === "Extra" ? 2_000 : 5_000 }))
      : [];

    await guardarInventarioDia(fecha, [], compras);
    const leido = await obtenerInventarioDia(fecha);
    if (!leido) continue;

    const conMerma = DIAS_CON_MERMA.includes(i);
    const fisicos = leido.productos.map((fila, idx) => {
      // La teórica no viene dada: se deriva igual que en la aplicación.
      const teorica = existenciaTeorica(
        fila.inicial ?? 0,
        fila.compras.reduce((a, c) => a + c, 0),
        fila.ventas ?? 0
      );
      // Diferencia normal de varilla: ±0,1 %. En los días marcados, −1,2 %.
      const desvio = conMerma && idx === 0 ? -0.012 : idx % 2 === 0 ? 0.0008 : -0.0006;
      return {
        productId: fila.productId,
        galones: Math.round(teorica * (1 + desvio) * 100) / 100
      };
    });
    if (conMerma) diasConAlerta++;

    const r = await guardarInventarioDia(fecha, fisicos, compras);
    if (!r.ok) console.warn(`Inventario ${fecha}: ${r.errores.join(", ")}`);
  }
  console.log(
    `Inventarios: ${fechas.length - 1} días digitados, ${diasConAlerta} con alerta de merma`
  );

  // ── 8. Financiero ─────────────────────────────────────────────────────────
  const costosMes = productos.map((p) => ({
    productId: p.id,
    precioCompra: COSTOS[p.nombre].compra,
    flete: COSTOS[p.nombre].flete
  }));
  await guardarCostos(ANIO, MES, costosMes);
  await guardarCostos(
    ant.anio,
    ant.mes,
    // El mes pasado se compraba algo más barato: así el margen no sale plano.
    costosMes.map((c) => ({ ...c, precioCompra: Math.round(c.precioCompra * 0.97) }))
  );

  // Gastos de los dos meses, para que la comparativa tenga contra qué medir.
  const gastos: [number, number, string, number, number | null, string][] = [
    [ANIO, MES, "NOMINA", 8_400_000, 6, "6 empleados"],
    [ANIO, MES, "SERVICIOS", 1_950_000, 4_200, "Energía 4.200 KW"],
    [ANIO, MES, "FLETES", 2_300_000, null, "Transporte de combustible"],
    [ANIO, MES, "OTROS", 640_000, null, "Mantenimiento de surtidores"],
    [ant.anio, ant.mes, "NOMINA", 7_900_000, 6, "6 empleados"],
    [ant.anio, ant.mes, "SERVICIOS", 2_180_000, 4_650, "Energía 4.650 KW"],
    [ant.anio, ant.mes, "FLETES", 2_050_000, null, "Transporte de combustible"],
    [ant.anio, ant.mes, "OTROS", 410_000, null, "Papelería y aseo"]
  ];
  for (const [a, m, cat, valor, cant, det] of gastos) {
    const r = await agregarGasto(a, m, cat, valor, cant, det);
    if (!r.ok) console.warn(`Gasto ${cat}: ${r.errores.join(", ")}`);
  }
  console.log(`Financiero: costos de 2 meses y ${gastos.length} gastos operativos`);

  console.log("\nListo. Recorrido sugerido: /dashboard → /cartera → /inventarios → /financiero");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
