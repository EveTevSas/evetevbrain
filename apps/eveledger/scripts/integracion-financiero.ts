// Script de integración del Módulo 4 (financiero), sin browser.
// Verifica: P/VENTA ponderado desde cierres CLOSED, margen y utilidad
// derivados de los costos digitados, gastos y comparativa mes a mes.
import "dotenv/config";
import { crearCierre, guardarCierre, prepararNuevoCierre } from "../src/lib/cierres";
import {
  margenMensual,
  guardarCostos,
  gastosMensual,
  agregarGasto,
  eliminarGasto
} from "../src/lib/financiero";
import { redondear, margenPorGalon, utilidadBruta } from "../src/lib/calc";
import { prisma } from "../src/lib/db";

const DIA = "2026-04-10";
const ANIO = 2026;
const MES = 4;
const fecha = new Date(`${DIA}T00:00:00Z`);

let fallas = 0;
function check(nombre: string, cond: boolean) {
  console.log(`${cond ? "✔" : "✘"} ${nombre}`);
  if (!cond) fallas++;
}

async function limpiar() {
  await prisma.dailyClose.deleteMany({ where: { fecha } });
  await prisma.costoProductoMes.deleteMany({ where: { anio: ANIO, mes: MES } });
  await prisma.gastoOperativo.deleteMany({
    where: {
      OR: [
        { anio: ANIO, mes: MES },
        { anio: ANIO, mes: MES - 1 }
      ]
    }
  });
}

async function main() {
  await limpiar();

  // --- Cierre CLOSED: 100 gal por manguera; precio distinto por producto ---
  const c1 = await crearCierre(DIA);
  if (!c1.ok) throw new Error("no se pudo crear el cierre");
  const prep = await prepararNuevoCierre(DIA);
  const productos = await prisma.product.findMany({ orderBy: { orden: "asc" } });
  // Precio por índice de manguera en el prep (2 mangueras por producto en el seed).
  const lecturas = prep.lecturas.map((l, idx) => ({
    nozzleId: l.nozzleId,
    lecturaInicial: l.lecturaInicial,
    lecturaFinal: l.lecturaInicial + 100,
    calibracion: 0,
    precio: 15000 + idx * 500
  }));
  const total = lecturas.reduce((a, l) => a + 100 * l.precio, 0);
  const cerrado = await guardarCierre(
    c1.id,
    {
      lecturas,
      pagos: [],
      vales: [],
      faltantes: [],
      efectivo: total
    },
    true
  );
  check("cerrar día de prueba", cerrado.ok);

  // --- P/VENTA ponderado: Σ pesos ÷ Σ galones por producto ---
  let margenes = await margenMensual(ANIO, MES);
  check("margenMensual devuelve todos los productos", margenes.length === productos.length);
  for (const m of margenes) {
    const nozzlesProd = prep.lecturas
      .map((l, idx) => ({ ...l, idx }))
      .filter((l) => l.productoNombre === m.nombre);
    const galEsp = nozzlesProd.length * 100;
    const pesosEsp = nozzlesProd.reduce((a, l) => a + 100 * (15000 + l.idx * 500), 0);
    check(
      `${m.nombre}: galones y P/VENTA ponderado correctos`,
      m.galones === galEsp && m.pVenta === redondear(pesosEsp / galEsp)
    );
  }

  // --- Costos digitados → margen y utilidad derivados ---
  const p0 = margenes[0];
  const malos = await guardarCostos(ANIO, MES, [
    { productId: p0.productId, precioCompra: -1, flete: 0 }
  ]);
  check("servidor rechaza precio de compra negativo", !malos.ok);

  const guardados = await guardarCostos(ANIO, MES, [
    { productId: p0.productId, precioCompra: 14000, flete: 140 }
  ]);
  check("guardar costos", guardados.ok);

  margenes = await margenMensual(ANIO, MES);
  const m0 = margenes.find((m) => m.productId === p0.productId)!;
  const margenEsp = margenPorGalon(m0.pVenta!, 14000, 140);
  check("margen = P/VENTA − P/COMPRA − FLETE", m0.margen === margenEsp);
  check("utilidad = margen × galones", m0.utilidad === utilidadBruta(margenEsp, m0.galones));
  // Producto sin costos digitados: margen = P/VENTA − 0 − 0.
  const m1 = margenes.find((m) => m.productId !== p0.productId)!;
  check("producto sin costos: margen = P/VENTA", m1.margen === m1.pVenta);

  // Mes sin ventas: P/VENTA, margen y utilidad en null.
  const margenesMayo = await margenMensual(ANIO, 5);
  check(
    "mes sin ventas: P/VENTA y margen en null",
    margenesMayo.every((m) => m.pVenta === null && m.margen === null && m.utilidad === null)
  );

  // --- Gastos operativos ---
  const gastoMalo = await agregarGasto(ANIO, MES, "NOMINA", 0, null, "");
  check("servidor rechaza gasto en cero", !gastoMalo.ok);
  const categoriaMala = await agregarGasto(ANIO, MES, "VIATICOS", 100, null, "");
  check("servidor rechaza categoría inválida", !categoriaMala.ok);

  await agregarGasto(ANIO, MES, "NOMINA", 8000000, 12, "8 isleros, 4 administrativos");
  await agregarGasto(ANIO, MES, "SERVICIOS", 1200000, 4500, "energía");
  await agregarGasto(ANIO, MES - 1, "NOMINA", 7000000, 11, "mes anterior");

  const gastos = await gastosMensual(ANIO, MES);
  check("gastos del mes listados", gastos.gastos.length === 2);
  check("total del mes = $9.200.000", gastos.totalMes === 9200000);
  const nomina = gastos.comparativa.find((c) => c.categoria === "NOMINA")!;
  check(
    "comparativa nómina: actual 8M vs anterior 7M (delta +1M)",
    nomina.actual === 8000000 && nomina.anterior === 7000000
  );
  const servicios = gastos.comparativa.find((c) => c.categoria === "SERVICIOS")!;
  check(
    "comparativa servicios: actual 1,2M vs anterior 0",
    servicios.actual === 1200000 && servicios.anterior === 0
  );

  const quitado = await eliminarGasto(gastos.gastos[1].id);
  check("eliminar gasto", quitado.ok);
  const gastos2 = await gastosMensual(ANIO, MES);
  check("total tras eliminar = $8.000.000", gastos2.totalMes === 8000000);
  const noExiste = await eliminarGasto("no-existe");
  check("eliminar gasto inexistente falla", !noExiste.ok);

  await limpiar();
  console.log("Datos de prueba eliminados.");
}

main()
  .then(() => {
    console.log(fallas === 0 ? "\nINTEGRACIÓN FINANCIERO OK" : `\n${fallas} FALLAS`);
    process.exit(fallas === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
