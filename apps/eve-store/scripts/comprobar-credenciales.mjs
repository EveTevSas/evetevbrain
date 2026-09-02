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
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

/* Con `--arreglar` no solo revisa: normaliza la cadena y la reescribe.
 *
 * Existe porque las tres formas de equivocarse al copiarla ya nos pasaron las
 * tres, y ninguna es culpa de quien copia:
 *
 *   1. Supabase envuelve el marcador en corchetes y es natural escribir dentro
 *      sin borrarlos. Postgres se los traga como parte de la contraseña.
 *   2. La «Direct connection» que ofrece el panel solo resuelve por IPv6, y una
 *      máquina sin IPv6 falla con ENOTFOUND sin explicar por qué.
 *   3. Los caracteres especiales de la contraseña hay que escaparlos en la URL.
 *
 * Arreglarlo a mano cada vez es pedirle a alguien que recuerde tres trampas.
 */
const ARREGLAR = process.argv.includes("--arreglar");

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
  // Cualquier corchete entre ':' y '@' es un marcador sin sustituir —o una
  // contraseña real a la que se le dejaron los corchetes encima, que es lo que
  // pasó de verdad: Supabase los pone alrededor y es fácil escribir dentro sin
  // borrarlos. Postgres los toma como parte de la contraseña y rechaza.
  [
    (v) => /:\/\/[^:]+:[^@]*[[\]][^@]*@/.test(v),
    "la contraseña lleva corchetes: son del marcador de Supabase y hay que quitarlos"
  ],
  [(v) => /YOUR.?PASSWORD/i.test(v), "falta sustituir el marcador de contraseña por la real"],
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

/** Devuelve variantes de la cadena, de la más probable a la menos. */
function variantes(cruda) {
  const limpia = cruda.replace(/(:\/\/[^:]+:)\[([^\]]*)\](@)/, "$1$2$3");
  const m = limpia.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^:/]+):(\d+)(\/.*)$/);
  if (!m) return [cruda];
  const [, usuario, pass, host, puerto, base] = m;
  const escapada = encodeURIComponent(decodeURIComponent(pass));
  const salida = [`postgresql://${usuario}:${escapada}@${host}:${puerto}${base}`];

  // Si es el host directo (solo IPv6), se proponen los poolers equivalentes.
  const ref = host.match(/^db\.(.+)\.supabase\.co$/)?.[1];
  if (ref) {
    for (const region of ["aws-0-us-east-1", "aws-1-us-east-1", "aws-0-us-west-1"]) {
      salida.push(
        `postgresql://postgres.${ref}:${escapada}@${region}.pooler.supabase.com:5432${base}`
      );
    }
  }
  return salida;
}

if (ARREGLAR) {
  console.log("\nBuscando una variante que conecte…");
  let buena = null;
  for (const url of variantes(env.DATABASE_URL)) {
    const donde = url.match(/@([^:]+)/)?.[1] ?? "?";
    try {
      const sql = postgres(url, { connect_timeout: 12, onnotice: () => {} });
      await sql`select 1`;
      await sql.end();
      console.log(`  ✓ ${donde}`);
      buena = url;
      break;
    } catch (e) {
      console.log(`  ✗ ${donde} — ${String(e.message).slice(0, 52)}`);
    }
  }
  if (buena && buena !== env.DATABASE_URL) {
    const texto = readFileSync(ruta, "utf8");
    writeFileSync(ruta, texto.replace(/^DATABASE_URL=.+$/m, `DATABASE_URL=${buena}`));
    console.log("  · .env.local actualizado con la variante que funciona");
    env.DATABASE_URL = buena;
  } else if (!buena) {
    console.error(
      "\nNinguna variante conectó. Si todas dicen «password authentication failed»,\n" +
        "la contraseña no es la de la base: cópiala de las variables de entorno del\n" +
        "proyecto eveconecta en Vercel, donde ya está la que funciona."
    );
    process.exit(1);
  }
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
      : "  · el schema `tienda` todavía no existe: corre `pnpm --filter @evetev/eve-store db:migrate`"
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
