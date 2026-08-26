// Script de integración del Módulo 5 (dashboard), sin browser.
// Verifica que los KPIs, la torta de medios de pago, las barras por producto
// y las alertas se derivan correctamente de los módulos 1 a 4.
import "dotenv/config";
import { crearCierre, guardarCierre, prepararNuevoCierre } from "../src/lib/cierres";
import { guardarCostos, margenMensual } from "../src/lib/financiero";
import { generarFactura, resumenCartera } from "../src/lib/cartera";
import { guardarInventarioDia } from "../src/lib/inventarios";
import { dashboardMensual } from "../src/lib/dashboard";
import { redondear } from "../src/lib/calc";
import { prisma } from "../src/lib/db";

const DIA1 = "2026-05-09";
const DIA2 = "2026-05-10";
const ANIO = 2026;
const MES = 5;
const CLIENTE = "TEST DASHBOARD SAS";
const fechas = [new Date(`${DIA1}T00:00:00Z`), new Date(`${DIA2}T00:00:00Z`)];

let fallas = 0;
function check(nombre: string, cond: boolean) {
  console.log(`${cond ? "✔" : "✘"} ${nombre}`);
  if (!cond) fallas++;
}

async function limpiar() {
  const cliente = await prisma.cliente.findUnique({ where: { nombre: CLIENTE } });
  await prisma.dailyClose.deleteMany({ where: { fecha: { in: fechas } } });
  await prisma.costoProductoMes.deleteMany({ where: { anio: ANIO, mes: MES } });
  await prisma.compra.deleteMany({ where: { fecha: { in: fechas } } });
  await prisma.inventarioFisico.deleteMany({ where: { fecha: { in: fechas } } });
  if (cliente) {
    await prisma.abono.deleteMany({ where: { clienteId: cliente.id } });
    await prisma.creditSale.updateMany({
      where: { clienteId: cliente.id },
      data: { facturaId: null }
    });
    await prisma.factura.deleteMany({ where: { clienteId: cliente.id } });
    await prisma.creditSale.deleteMany({ where: { clienteId: cliente.id } });
    await prisma.cliente.delete({ where: { id: cliente.id } });
  }
}

async function main() {
  await limpiar();

  const productos = await prisma.product.findMany({ orderBy: { orden: "asc" } });
  const cliente = await prisma.cliente.create({ data: { nombre: CLIENTE, cupo: 0 } });

  // Físico del día 1 (inicial del día 2) para la alerta de merma.
  await guardarInventarioDia(
    DIA1,
    productos.map((p) => ({ productId: p.id, galones: 5000 })),
    []
  );

  // --- Cierre CLOSED del día 2: 100 gal × 6 mangueras a $10.000 ---
  const c2 = await crearCierre(DIA2);
  if (!c2.ok) throw new Error("no se pudo crear el cierre");
  const prep = await prepararNuevoCierre(DIA2);
  const lecturas = prep.lecturas.map((l) => ({
    nozzleId: l.nozzleId,
    lecturaInicial: l.lecturaInicial,
    lecturaFinal: l.lecturaInicial + 100,
    calibracion: 0,
    precio: 10000
  }));
  const totalVentas = lecturas.length * 100 * 10000; // 6.000.000
  const cerrado = await guardarCierre(
    c2.id,
    {
      lecturas,
      pagos: [
        { tipo: "CREDIBANCO", valor: 100000 },
        { tipo: "REDEBAN", valor: 50000 },
        { tipo: "TRANSPORTADORA", valor: 25000 },
        { tipo: "OTRO", valor: 9999 } // no entra al arqueo
      ],
      vales: [{ clienteId: cliente.id, valor: 200000 }],
      faltantes: [{ empleado: "Islero Test", faltante: 30000, abono: 10000 }],
      efectivo: totalVentas - 150000 - 25000 - 200000 - 20000
    },
    true
  );
  check("cerrar día de prueba", cerrado.ok);

  // Costos del primer producto (para la utilidad) y merma en el primero.
  await guardarCostos(ANIO, MES, [{ productId: productos[0].id, precioCompra: 9000, flete: 140 }]);
  const nozzlesP0 = await prisma.nozzle.count({ where: { productId: productos[0].id } });
  const teoricaP0 = 5000 - nozzlesP0 * 100;
  await guardarInventarioDia(
    DIA2,
    [
      { productId: productos[0].id, galones: teoricaP0 + 50 },
      ...productos.slice(1).map((p) => ({ productId: p.id, galones: null }))
    ],
    []
  );

  // Factura con 100 días de mora → cartera vencida roja.
  await generarFactura(cliente.id);
  const factura = await prisma.factura.findFirst({ where: { clienteId: cliente.id } });
  const ahora = new Date();
  const hoyUTC = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate());
  await prisma.factura.update({
    where: { id: factura!.id },
    data: { fechaEmision: new Date(hoyUTC - 100 * 24 * 60 * 60 * 1000) }
  });

  // --- Dashboard del mes ---
  const d = await dashboardMensual(ANIO, MES);
  check("KPI ventas del mes = $6.000.000", d.kpis.ventasMes === totalVentas);
  check("KPI transportadora = $25.000", d.kpis.transportadora === 25000);
  check("KPI faltantes netos = $20.000", d.kpis.faltantesNetos === 20000);
  const carteraEsp = redondear((await resumenCartera()).reduce((a, c) => a + c.saldo, 0));
  check(
    "KPI total cartera = Σ saldos de clientes (incluye datos previos)",
    d.kpis.totalCartera === carteraEsp && carteraEsp >= 200000
  );
  check("KPI cartera vencida = $200.000 (factura roja)", d.kpis.carteraVencida === 200000);

  const margenes = await margenMensual(ANIO, MES);
  const utilidadEsp = redondear(margenes.reduce((a, m) => a + (m.utilidad ?? 0), 0));
  check("KPI utilidad bruta = Σ utilidades del margen", d.kpis.utilidadBruta === utilidadEsp);

  // Torta: los segmentos suman exactamente las ventas (efectivo = residual).
  const seg = Object.fromEntries(d.mediosPago.map((s) => [s.clave, s.valor]));
  check("torta: tarjetas = $150.000", seg.tarjetas === 150000);
  check("torta: transportadora = $25.000", seg.transportadora === 25000);
  check("torta: vales = $200.000", seg.vales === 200000);
  check("torta: faltantes = $20.000", seg.faltantes === 20000);
  check("torta: OTRO no aparece como segmento", seg.otro === undefined);
  const sumaSeg = redondear(d.mediosPago.reduce((a, s) => a + s.valor, 0));
  check("torta: los segmentos suman las ventas del mes", sumaSeg === totalVentas);
  check("torta: efectivo = residual del arqueo", seg.efectivo === totalVentas - 395000);

  // Barras: 200 gal por producto (2 mangueras × 100 gal).
  check(
    "barras: 200 gal por producto",
    d.galonesPorProducto.length === productos.length &&
      d.galonesPorProducto.every((p) => p.galones === 200)
  );

  // Alertas: cartera vencida + merma del primer producto.
  check(
    "alertas: cartera vencida del cliente",
    d.alertas.some((a) => a.tipo === "cartera" && a.texto.includes(CLIENTE))
  );
  check(
    "alertas: merma del primer producto día 10",
    d.alertas.some(
      (a) =>
        a.tipo === "merma" && a.texto.includes(productos[0].nombre) && a.texto.includes("día 10")
    )
  );

  // Mes sin datos: todo en cero/null sin romper.
  const vacio = await dashboardMensual(ANIO, 6);
  check(
    "mes sin datos: KPIs en cero y sin alertas propias",
    vacio.kpis.ventasMes === 0 &&
      vacio.kpis.transportadora === 0 &&
      vacio.kpis.faltantesNetos === 0 &&
      vacio.mediosPago.length === 0 &&
      vacio.galonesPorProducto.length === 0 &&
      !vacio.alertas.some((a) => a.tipo === "merma")
  );

  await limpiar();
  console.log("Datos de prueba eliminados.");
}

main()
  .then(() => {
    console.log(fallas === 0 ? "\nINTEGRACIÓN DASHBOARD OK" : `\n${fallas} FALLAS`);
    process.exit(fallas === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
