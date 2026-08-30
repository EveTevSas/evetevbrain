// Script de integración (sin browser): ejercita la lógica de servidor igual
// que las server actions. Verifica el arrastre de lecturas iniciales entre
// cierres, el bloqueo por comprobación ≠ $0, duplicados y el consolidado.
import "dotenv/config";
import {
  crearCierre,
  guardarCierre,
  prepararNuevoCierre,
  consolidadoMensual
} from "../src/lib/cierres";
import { prisma } from "../src/lib/db";

const DIA1 = "2026-01-15";
const DIA2 = "2026-01-16";
const CLIENTE = "TEST INTEGRACION CIERRES";

let fallas = 0;
function check(nombre: string, cond: boolean) {
  console.log(`${cond ? "✔" : "✘"} ${nombre}`);
  if (!cond) fallas++;
}

async function limpiar() {
  const cliente = await prisma.cliente.findUnique({ where: { nombre: CLIENTE } });
  await prisma.dailyClose.deleteMany({
    where: { fecha: { in: [new Date(`${DIA1}T00:00:00Z`), new Date(`${DIA2}T00:00:00Z`)] } }
  });
  if (cliente) {
    await prisma.creditSale.deleteMany({ where: { clienteId: cliente.id } });
    await prisma.cliente.delete({ where: { id: cliente.id } });
  }
}

async function main() {
  // Limpieza previa por si el script ya corrió.
  await limpiar();

  // Cliente de cartera para los vales de prueba.
  const cliente = await prisma.cliente.create({ data: { nombre: CLIENTE, cupo: 0 } });

  // --- Día 1: crear, guardar y cerrar cuadrado en $0 ---
  const c1 = await crearCierre(DIA1);
  check("crear cierre día 1", c1.ok);
  if (!c1.ok) throw new Error("no se pudo crear cierre día 1");

  const prep1 = await prepararNuevoCierre(DIA1);
  check(
    "día 1: todas las lecturas son base (sin cierre previo)",
    prep1.lecturas.every((l) => l.esBase)
  );

  const lecturas1 = prep1.lecturas.map((l) => ({
    nozzleId: l.nozzleId,
    lecturaInicial: 1000, // lectura base digitada una sola vez
    lecturaFinal: 1100,
    calibracion: 0,
    precio: 10000
  }));
  const total1 = lecturas1.length * 100 * 10000; // 100 gal × $10.000 por manguera

  // Cierre descuadrado debe ser rechazado por el servidor.
  const malo = await guardarCierre(
    c1.id,
    {
      lecturas: lecturas1,
      pagos: [],
      vales: [],
      faltantes: [],
      efectivo: total1 - 500
    },
    true
  );
  check("servidor rechaza cerrar con comprobación ≠ $0", !malo.ok);

  // Cierre cuadrado: efectivo + un vale + un faltante neto.
  const bueno = await guardarCierre(
    c1.id,
    {
      lecturas: lecturas1,
      pagos: [
        { tipo: "CREDIBANCO", detalle: "datafono 1", valor: 100000 },
        { tipo: "REDEBAN", valor: 50000 },
        { tipo: "TRANSPORTADORA", detalle: "flota", valor: 25000 },
        { tipo: "OTRO", detalle: "no entra al arqueo", valor: 9999 }
      ],
      vales: [{ clienteId: cliente.id, valor: 200000 }],
      faltantes: [{ empleado: "Islero Pérez", faltante: 30000, abono: 10000 }],
      efectivo: total1 - 150000 - 25000 - 200000 - 20000 // cuadra exacto
    },
    true
  );
  check("cerrar día 1 con comprobación $0", bueno.ok);

  // Día cerrado es solo lectura.
  const editarCerrado = await guardarCierre(
    c1.id,
    {
      lecturas: lecturas1,
      pagos: [],
      vales: [],
      faltantes: [],
      efectivo: 0
    },
    false
  );
  check("no se puede editar un cierre CLOSED", !editarCerrado.ok);

  // Fecha duplicada rechazada.
  const dup = await crearCierre(DIA1);
  check("rechaza cierre duplicado para la misma fecha", !dup.ok);

  // --- Día 2: las lecturas iniciales arrastran las finales del día 1 ---
  const prep2 = await prepararNuevoCierre(DIA2);
  check(
    "día 2: lectura inicial = 1100 (final del día 1) en todas las mangueras",
    prep2.lecturas.every((l) => l.lecturaInicial === 1100)
  );
  check(
    "día 2: ninguna lectura es base (quedan bloqueadas)",
    prep2.lecturas.every((l) => !l.esBase)
  );

  const c2 = await crearCierre(DIA2);
  check("crear cierre día 2", c2.ok);
  if (!c2.ok) throw new Error("no se pudo crear cierre día 2");

  // Aunque el cliente intente alterar la inicial, el servidor impone 1100.
  const lecturas2Alteradas = prep2.lecturas.map((l) => ({
    nozzleId: l.nozzleId,
    lecturaInicial: 9999, // intento de manipulación
    lecturaFinal: 1180,
    calibracion: 5,
    precio: 10000
  }));
  const g2 = await guardarCierre(
    c2.id,
    {
      lecturas: lecturas2Alteradas,
      pagos: [],
      vales: [],
      faltantes: [],
      efectivo: 0
    },
    false
  );
  check("guardar borrador día 2", g2.ok);
  const lecturasDb = await prisma.nozzleReading.findMany({ where: { closeId: c2.id } });
  check(
    "servidor impone lectura inicial 1100 aunque el cliente envíe otra",
    lecturasDb.length === lecturas2Alteradas.length &&
      lecturasDb.every((r) => Number(r.lecturaInicial) === 1100 && Number(r.lecturaFinal) === 1180)
  );

  // --- Consolidado mensual (solo CLOSED) ---
  const cons = await consolidadoMensual(2026, 1);
  let totalDia1 = 0;
  const filaDia1 = cons.matriz.get(15);
  if (filaDia1) for (const gal of filaDia1.values()) totalDia1 += gal;
  check("consolidado: día 15 acumula 600 gal (6 mangueras × 100 gal)", totalDia1 === 600);
  check("consolidado: día 16 sin datos (borrador no cuenta)", !cons.matriz.has(16));

  // Limpieza final.
  await limpiar();
  console.log("Datos de prueba eliminados.");
}

main()
  .then(() => {
    console.log(fallas === 0 ? "\nINTEGRACIÓN OK" : `\n${fallas} FALLAS`);
    process.exit(fallas === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
