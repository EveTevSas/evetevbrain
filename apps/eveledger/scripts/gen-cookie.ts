// Utilidad de verificación: valida las credenciales del seed contra la DB
// (bcrypt) y emite una cookie de sesión firmada para pruebas con curl.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
import { crearValorSesion } from "../src/lib/auth";

async function main() {
  const u = await prisma.user.findUnique({
    where: { email: process.env.ADMIN_EMAIL! }
  });
  const ok = u && (await bcrypt.compare(process.env.ADMIN_PASSWORD!, u.passwordHash));
  if (!ok) {
    console.error("credenciales seed inválidas");
    process.exit(1);
  }
  console.error("bcrypt del seed verificado OK");
  console.log(await crearValorSesion());
}

main().finally(() => prisma.$disconnect());
