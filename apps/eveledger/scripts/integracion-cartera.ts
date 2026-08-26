// Script de integración del Módulo 3 (cartera), sin browser.
// Verifica: creación de clientes, vales del cierre alimentando cartera,
// ciclo vale → factura (solo cierres CLOSED), aging y recaudo FIFO.
import "dotenv/config";
import { crearCierre, guardarCierre, prepararNuevoCierre } from "../src/lib/cierres";
import {
  crearCliente,
  actualizarCliente,
  generarFactura,
  registrarAbono,
  resumenCartera,
  detalleCliente
} from "../src/lib/cartera";
import { prisma } from "../src/lib/db";

const DIA = "2026-03-10";
const CLIENTE = "TEST CARTERA SAS";
const fecha = new Date(`${DIA}T00:00:00Z`);

let fallas = 0;
function check(nombre: string, cond: boolean) {
  console.log(`${cond ? "✔" : "✘"} ${nombre}`);
  if (!cond) fallas++;
}

async function limpiar() {
  const cliente = await prisma.cliente.findUnique({ where: { nombre: CLIENTE } });
  await prisma.dailyClose.deleteMany({ where: { fecha } });
  await prisma.dailyClose.deleteMany({ where: { fecha: new Date("2026-03-11T00:00:00Z") } });
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
  // Limpieza previa.
  await limpiar();

  // --- Clientes ---
  const malo = await crearCliente("", -5);
  check("rechaza cliente sin nombre y cupo negativo", !malo.ok);

  const creado = await crearCliente(CLIENTE, 1000000);
  check("crear cliente", creado.ok);
  const dup = await crearCliente(CLIENTE, 0);
  check("rechaza nombre duplicado", !dup.ok);

  const cliente = await prisma.cliente.findUnique({ where: { nombre: CLIENTE } });
  if (!cliente) throw new Error("no se creó el cliente");

  // --- Cierre DRAFT con vales: alimentan cartera pero no son facturables ---
  const c1 = await crearCierre(DIA);
  if (!c1.ok) throw new Error("no se pudo crear el cierre");
  const prep = await prepararNuevoCierre(DIA);
  const lecturas = prep.lecturas.map((l) => ({
    nozzleId: l.nozzleId,
    lecturaInicial: l.lecturaInicial,
    lecturaFinal: l.lecturaInicial + 100,
    calibracion: 0,
    precio: 10000
  }));
  const totalVentas = lecturas.length * 100 * 10000;

  const valeFantasma = await guardarCierre(
    c1.id,
    {
      lecturas,
      pagos: [],
      vales: [{ clienteId: "no-existe", valor: 100 }],
      faltantes: [],
      efectivo: 0
    },
    false
  );
  check("servidor rechaza vale con cliente inexistente", !valeFantasma.ok);

  const borrador = await guardarCierre(
    c1.id,
    {
      lecturas,
      pagos: [],
      vales: [{ clienteId: cliente.id, valor: 400000 }],
      faltantes: [],
      efectivo: 0
    },
    false
  );
  check("guardar borrador con vale", borrador.ok);

  const sinFacturar = await generarFactura(cliente.id);
  check("no se puede facturar un vale de cierre DRAFT", !sinFacturar.ok);

  // --- Cerrar el día y facturar ---
  const cerrado = await guardarCierre(
    c1.id,
    {
      lecturas,
      pagos: [],
      vales: [
        { clienteId: cliente.id, valor: 400000 },
        { clienteId: cliente.id, valor: 200000 }
      ],
      faltantes: [],
      efectivo: totalVentas - 600000
    },
    true
  );
  check("cerrar día con vales", cerrado.ok);

  const facturada = await generarFactura(cliente.id);
  check("generar factura con los vales del cierre cerrado", facturada.ok);

  let detalle = await detalleCliente(cliente.id);
  check(
    "factura creada con total $600.000",
    detalle?.facturas.length === 1 && detalle.facturas[0].total === 600000
  );
  check("sin vales pendientes tras facturar", detalle?.valesSinFacturar.length === 0);
  check("saldo = $600.000", detalle?.saldo === 600000);
  const f1 = detalle!.facturas[0];
  check(
    "factura nueva: rango 0-30 y semáforo verde",
    f1.rango === "0-30" && f1.semaforo === "verde" && f1.dias === 0
  );

  // Antigua la factura para probar el aging (45 días → 31-60 ámbar).
  const ahora = new Date();
  const hoyUTC = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate());
  const hace45 = new Date(hoyUTC - 45 * 24 * 60 * 60 * 1000);
  await prisma.factura.update({
    where: { id: f1.id },
    data: { fechaEmision: hace45 }
  });
  detalle = await detalleCliente(cliente.id);
  const f1v = detalle!.facturas[0];
  check(
    "a los 45 días: rango 31-60 y semáforo ámbar",
    f1v.rango === "31-60" && f1v.semaforo === "ambar" && f1v.dias === 45
  );

  // --- Recaudo FIFO ---
  const abonoMalo = await registrarAbono(cliente.id, DIA, 0, "");
  check("rechaza abono en cero", !abonoMalo.ok);
  const abono1 = await registrarAbono(cliente.id, DIA, 250000, "transferencia");
  check("registrar abono", abono1.ok);

  detalle = await detalleCliente(cliente.id);
  check("saldo tras abono = $350.000", detalle?.saldo === 350000);
  check(
    "FIFO: la factura queda con $350.000 pendiente",
    detalle?.facturas[0].pendiente === 350000 && detalle.facturas[0].abonado === 250000
  );

  // --- Resumen y cupo ---
  const resumen = await resumenCartera();
  const fila = resumen.find((c) => c.id === cliente.id);
  check(
    "resumen: saldo y semáforo del cliente",
    fila?.saldo === 350000 && fila?.semaforo === "ambar"
  );
  check("resumen: sin sobrecupo (350k de 1M)", fila?.sobreCupo === false);

  const sobre = await actualizarCliente(cliente.id, {
    nombre: CLIENTE,
    cupo: 300000,
    activo: true
  });
  check("actualizar cupo", sobre.ok);
  const resumen2 = await resumenCartera();
  check(
    "resumen: sobre el cupo cuando saldo > cupo",
    resumen2.find((c) => c.id === cliente.id)?.sobreCupo === true
  );

  const inactivo = await actualizarCliente(cliente.id, {
    nombre: CLIENTE,
    cupo: 300000,
    activo: false
  });
  check("desactivar cliente", inactivo.ok);
  const cierre2 = await crearCierre("2026-03-11");
  if (cierre2.ok) {
    const prep2 = await prepararNuevoCierre("2026-03-11");
    const valeInactivo = await guardarCierre(
      cierre2.id,
      {
        lecturas: prep2.lecturas.map((l) => ({
          nozzleId: l.nozzleId,
          lecturaInicial: l.lecturaInicial,
          lecturaFinal: l.lecturaInicial,
          calibracion: 0,
          precio: 0
        })),
        pagos: [],
        vales: [{ clienteId: cliente.id, valor: 100 }],
        faltantes: [],
        efectivo: 0
      },
      false
    );
    check("servidor rechaza vale de cliente inactivo", !valeInactivo.ok);
    await prisma.dailyClose.delete({ where: { id: cierre2.id } });
  }

  // Limpieza final.
  await limpiar();
  console.log("Datos de prueba eliminados.");
}

main()
  .then(() => {
    console.log(fallas === 0 ? "\nINTEGRACIÓN CARTERA OK" : `\n${fallas} FALLAS`);
    process.exit(fallas === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
