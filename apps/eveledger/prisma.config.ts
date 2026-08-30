import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// La fuente de datos solo se declara si `DATABASE_URL` está puesta.
//
// `prisma generate` no toca la base —solo lee el schema— pero si el config
// resuelve `env("DATABASE_URL")` incondicionalmente, generar sin base falla con
// `PrismaConfigEnvError`. Y generar sin base es justo lo que pasa en CI y en el
// arranque de un clon nuevo. Los comandos que sí la necesitan (`migrate`,
// `db seed`) siguen fallando sin ella, con su propio mensaje.
const conBase = process.env.DATABASE_URL ? { datasource: { url: env("DATABASE_URL") } } : {};

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  ...conBase
});
