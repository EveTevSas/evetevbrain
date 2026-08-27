// Deja la base como recién sembrada: borra TODOS los datos de operación
// —cierres, inventarios, cartera y financiero— y conserva los usuarios.
//
//   pnpm exec tsx scripts/demo-limpiar.ts --si
//
// El `--si` es obligatorio. Esto no distingue lo que generó `demo-completa.ts`
// de lo que digitó una persona: borra todo. Es para dejar limpia una base de
// demostración antes de entregarla, no para usarse sobre datos reales.
import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  if (!process.argv.includes("--si")) {
    console.error(
      "Esto BORRA todos los datos de operación (cierres, inventarios, cartera, financiero).\n" +
        "Los usuarios se conservan. Si es lo que quieres:\n\n" +
        "  pnpm exec tsx scripts/demo-limpiar.ts --si\n"
    );
    process.exit(1);
  }

  const antes = {
    cierres: await prisma.dailyClose.count(),
    clientes: await prisma.cliente.count(),
    facturas: await prisma.factura.count(),
    productos: await prisma.product.count()
  };
  console.log("Antes:", antes);

  // El orden importa: primero lo que apunta a otra cosa. `DailyClose` arrastra
  // lecturas, pagos, vales y faltantes; los vales cuelgan además de la factura,
  // así que las facturas van después de los cierres.
  await prisma.abono.deleteMany();
  await prisma.creditSale.deleteMany();
  await prisma.factura.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.employeeShortage.deleteMany();
  await prisma.nozzleReading.deleteMany();
  await prisma.dailyClose.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.inventarioFisico.deleteMany();
  await prisma.compra.deleteMany();
  await prisma.costoProductoMes.deleteMany();
  await prisma.gastoOperativo.deleteMany();
  await prisma.nozzle.deleteMany();
  await prisma.product.deleteMany();

  const usuarios = await prisma.user.count();
  console.log("Después: base vacía de operación.");
  console.log(`Usuarios conservados: ${usuarios}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
