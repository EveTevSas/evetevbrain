#!/usr/bin/env node
/* Dice si `.env.local` quedó bien, sin mostrar ni un carácter de las llaves.
 *
 *   pnpm --filter @evetev/eve-store creds
 *
 * Existe porque el fallo típico no es teclear mal la llave: es pegar la cadena
 * de conexión sin sustituir [YOUR-PASSWORD], o confundir la llave publishable
 * con la secret. Las dos cosas fallan más tarde y con un error que no explica
 * nada.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

const ruta = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
if (!existsSync(ruta)) {
  console.error("No existe apps/eve-store/.env.local — cópialo de .env.example.");
  process.exit(1);
}

const env = {};
for (const linea of readFileSync(ruta, "utf8").split("\n")) {
  const l = linea.trim();
  if (!l || l.startsWith("#") || !l.includes("=")) continue;
  const [k, ...resto] = l.split("=");
  env[k.trim()] = resto.join("=").trim();
}

const problemas = [];
const ok = [];

function revisar(clave, comprobaciones) {
  const v = env[clave];
  if (!v) return problemas.push(`${clave}: vacía`);
  if (v.startsWith("PEGA_AQUI")) return problemas.push(`${clave}: sigue con el marcador`);
  for (const [falla, mensaje] of comprobaciones) {
    if (falla(v)) return problemas.push(`${clave}: ${mensaje}`);
  }
  ok.push(`${clave}: con aspecto correcto (${v.length} caracteres)`);
}

revisar("DATABASE_URL", [
  [(v) => !/^postgres(ql)?:\/\//.test(v), "no empieza por postgres:// o postgresql://"],
  [(v) => v.includes("[YOUR-PASSWORD]"), "falta sustituir [YOUR-PASSWORD] por la contraseña real"],
  [(v) => v.includes("usuario:clave@host"), "sigue siendo el ejemplo"]
]);

revisar("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", [
  [
    (v) => v.startsWith("sb_secret_") || v.includes("service_role"),
    "parece la llave SECRET, no la publishable — están cambiadas"
  ]
]);

revisar("SUPABASE_SECRET_KEY", [
  [
    (v) => v.startsWith("sb_publishable_") || v.includes('"role":"anon"'),
    "parece la llave PUBLISHABLE, no la secret — están cambiadas"
  ]
]);

for (const o of ok) console.log(`  ✓ ${o}`);
for (const p of problemas) console.log(`  ✗ ${p}`);

if (problemas.length) {
  console.error(
    "\nFalta completar el archivo. Cada línea de .env.local dice de dónde sale su valor."
  );
  process.exit(1);
}

// La única prueba que vale: conectarse de verdad.
console.log("\nProbando la conexión…");
try {
  const sql = postgres(env.DATABASE_URL, { connect_timeout: 12, onnotice: () => {} });
  const [{ version, existe }] = await sql`
    select split_part(version(), ' ', 2) as version,
           exists (select 1 from information_schema.schemata where schema_name = 'tienda') as existe`;
  await sql.end();
  console.log(`  ✓ conectado a Postgres ${version}`);
  console.log(
    existe
      ? "  ✓ el schema `tienda` ya existe"
      : "  · el schema `tienda` todavía no existe: corre `pnpm --filter @evetev/eve-store db:migrar`"
  );
  console.log("\nCredenciales correctas.");
} catch (e) {
  console.error(`  ✗ no se pudo conectar: ${e.message}`);
  console.error(
    "\nSi dice «password authentication failed», la contraseña de la cadena no es la de la base:\n" +
      "se genera una nueva en Project Settings → Database → Reset database password.\n" +
      "Si dice «Tenant or user not found», copiaste la cadena de otro proyecto."
  );
  process.exit(1);
}
