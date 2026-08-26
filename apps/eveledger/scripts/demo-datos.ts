// Crea datos de demostración temporal para screenshots (se limpian después).
import "dotenv/config";
import { crearCierre, guardarCierre, prepararNuevoCierre } from "../src/lib/cierres";
import { prisma } from "../src/lib/db";

const AYER = "2026-02-10";
const HOY = "2026-02-11";

async function main() {
  await prisma.dailyClose.deleteMany({
    where: { fecha: { in: [new Date(`${AYER}T00:00:00Z`), new Date(`${HOY}T00:00:00Z`)] } }
  });

  const c1 = await crearCierre(AYER);
  if (!c1.ok) throw new Error(c1.errores.join());
  const prep1 = await prepararNuevoCierre(AYER);
  const cliente =
    (await prisma.cliente.findFirst({ where: { nombre: "Transportes del Norte S.A.S." } })) ??
    (await prisma.cliente.create({
      data: { nombre: "Transportes del Norte S.A.S.", cupo: 5000000 }
    }));
  const lecturas1 = prep1.lecturas.map((l, idx) => ({
    nozzleId: l.nozzleId,
    lecturaInicial: 125000 + idx * 4000,
    lecturaFinal: 125000 + idx * 4000 + 320 + idx * 15,
    calibracion: 5,
    precio: 16500 + (idx % 3) * 1200
  }));
  const total1 = lecturas1.reduce(
    (a, l) =>
      a + Math.round((l.lecturaFinal - l.lecturaInicial - l.calibracion) * l.precio * 100) / 100,
    0
  );
  const r1 = await guardarCierre(
    c1.id,
    {
      lecturas: lecturas1,
      pagos: [
        { tipo: "CREDIBANCO", detalle: "Datáfono isla 1", valor: 850000 },
        { tipo: "REDEBAN", detalle: "", valor: 430000 },
        { tipo: "TRANSPORTADORA", detalle: "Flota Cootrans", valor: 1200000 }
      ],
      vales: [{ clienteId: cliente.id, valor: 650000 }],
      faltantes: [{ empleado: "Carlos Pérez", faltante: 45000, abono: 15000 }],
      efectivo: total1 - 850000 - 430000 - 1200000 - 650000 - 30000
    },
    true
  );
  if (!r1.ok) throw new Error(r1.errores.join());

  const c2 = await crearCierre(HOY);
  if (!c2.ok) throw new Error(c2.errores.join());
  const prep2 = await prepararNuevoCierre(HOY);
  const lecturas2 = prep2.lecturas.map((l, idx) => ({
    nozzleId: l.nozzleId,
    lecturaInicial: l.lecturaInicial,
    lecturaFinal: l.lecturaInicial + 280 + idx * 10,
    calibracion: 0,
    precio: 16500 + (idx % 3) * 1200
  }));
  const r2 = await guardarCierre(
    c2.id,
    {
      lecturas: lecturas2,
      pagos: [{ tipo: "CREDIBANCO", detalle: "", valor: 500000 }],
      vales: [],
      faltantes: [],
      efectivo: 0
    },
    false
  );
  if (!r2.ok) throw new Error(r2.errores.join());
  console.log(JSON.stringify({ cerrado: c1.id, borrador: c2.id }));
}

main().finally(() => prisma.$disconnect());
