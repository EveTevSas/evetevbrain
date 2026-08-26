import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Usuario administrador único (credenciales desde env, con defaults documentados).
  const email = (process.env.ADMIN_EMAIL ?? "admin@eveledger.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "admin123";
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash }
  });
  console.log(`Admin listo: ${email}`);

  // Productos y mangueras de ejemplo (idempotente por nombre).
  const productos = [
    { nombre: "Corriente", orden: 1 },
    { nombre: "ACPM", orden: 2 },
    { nombre: "Extra", orden: 3 }
  ];
  for (const p of productos) {
    let producto = await prisma.product.findFirst({ where: { nombre: p.nombre } });
    if (!producto) {
      producto = await prisma.product.create({ data: p });
    }
    for (let i = 1; i <= 2; i++) {
      const nombreManguera = `${p.nombre} ${i}`;
      const existe = await prisma.nozzle.findFirst({
        where: { nombre: nombreManguera, productId: producto.id }
      });
      if (!existe) {
        await prisma.nozzle.create({
          data: { nombre: nombreManguera, productId: producto.id }
        });
      }
    }
  }
  console.log("Productos y mangueras de ejemplo listos");

  // Clientes de cartera de ejemplo (idempotente por nombre).
  const clientes = [
    { nombre: "ACUAEXPRESS", cupo: 5000000 },
    { nombre: "Transportes SA", cupo: 3000000 }
  ];
  for (const c of clientes) {
    const existe = await prisma.cliente.findUnique({ where: { nombre: c.nombre } });
    if (!existe) {
      await prisma.cliente.create({ data: c });
    }
  }
  console.log("Clientes de cartera de ejemplo listos");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
