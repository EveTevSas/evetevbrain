#!/usr/bin/env node
/* Comprueba que la base real coincide con lo que la aplicación espera.
 *
 * Existen dos descripciones del schema —`db/0001_tienda.sql`, que es la fuente,
 * y `db/schema.ts`, que le da tipos a la aplicación— y separarse es cuestión de
 * tiempo. Este script las confronta con la base y falla si no cuadran.
 *
 * Comprueba además que el disparador de publicación SIGUE VIVO, intentando
 * publicar un producto con avisos bloqueantes. Una regla que solo se verifica
 * el día que se escribe no está verificada: puede desaparecer en una migración
 * futura sin que nada se ponga en rojo.
 *
 *   DATABASE_URL=postgres://… node apps/eve-store/scripts/comprobar-schema.mjs
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL.");
  process.exit(1);
}

const ESPERADO = {
  producto: [
    "slug",
    "nombre",
    "marca",
    "gtin",
    "gtin_historicos",
    "precio_minor",
    "moneda",
    "contenido",
    "imagen",
    "descripcion",
    "descripcion_por_confirmar",
    "atributos",
    "existencias",
    "publicado",
    "creado_en",
    "actualizado_en",
    "busqueda"
  ],
  aviso: [
    "id",
    "producto_slug",
    "texto",
    "bloqueante",
    "origen",
    "resuelto_en",
    "resuelto_por",
    "creado_en"
  ],
  origen_publicacion: ["producto_slug", "publicacion_ml", "estado_ml", "vendidas"]
};

const sql = postgres(url, { onnotice: () => {} });
const fallos = [];

for (const [tabla, columnas] of Object.entries(ESPERADO)) {
  const filas = await sql`
    select column_name from information_schema.columns
     where table_schema = 'tienda' and table_name = ${tabla}`;
  const reales = new Set(filas.map((f) => f.column_name));
  const faltan = columnas.filter((c) => !reales.has(c));
  const sobran = [...reales].filter((c) => !columnas.includes(c));
  if (faltan.length) fallos.push(`tienda.${tabla}: faltan columnas ${faltan.join(", ")}`);
  if (sobran.length)
    fallos.push(
      `tienda.${tabla}: la base tiene columnas que la app no conoce: ${sobran.join(", ")}`
    );
  if (!faltan.length && !sobran.length)
    console.log(`  ✓ tienda.${tabla} (${columnas.length} columnas)`);
}

/* La búsqueda tiene que PODER usar el índice GIN. Sin él funciona igual con 25
 * productos y se derrumba con 2.000, que es cuando nadie lo está mirando.
 *
 * Se comprueba forzando `enable_seqscan = off`, no mirando el plan por defecto:
 * con una tabla de 25 filas el planificador elige escaneo secuencial porque de
 * verdad es más rápido, y exigirle lo contrario haría fallar esta comprobación
 * por una decisión correcta suya. Lo que importa es que el índice exista y sea
 * utilizable, no cuál prefiera hoy. */
const plan = await sql
  .begin(async (t) => {
    await t`set local enable_seqscan = off`;
    return t`explain (format json) select slug from tienda.producto p,
      websearch_to_tsquery('tienda.espanol', 'aceite') q where p.busqueda @@ q`;
  })
  .then((r) => JSON.stringify(r));
if (plan.includes("producto_busqueda_idx"))
  console.log("  ✓ el índice GIN de búsqueda existe y es utilizable");
else fallos.push("la búsqueda no puede usar el índice GIN ni forzándolo");

// El precio debe ser entero, no decimal. Si alguien lo cambia a numeric para
// «guardar los centavos», los importes que viajan a EvePay dejan de cuadrar.
const [{ data_type: tipoPrecio }] = await sql`
  select data_type from information_schema.columns
   where table_schema='tienda' and table_name='producto' and column_name='precio_minor'`;
if (tipoPrecio !== "bigint") fallos.push(`precio_minor es ${tipoPrecio}; debe ser bigint`);
else console.log("  ✓ precio_minor es bigint (unidad mínima, como EvePay)");

// El disparador, probado de verdad y no leído del catálogo del sistema.
const [victima] = await sql`
  select p.slug from tienda.producto p
   where not p.publicado
     and exists (select 1 from tienda.aviso a
                  where a.producto_slug = p.slug and a.bloqueante and a.resuelto_en is null)
   limit 1`;
if (!victima) {
  console.log("  · sin producto bloqueado con el que probar el disparador");
} else {
  let bloqueo = false;
  try {
    await sql.begin(async (t) => {
      await t`update tienda.producto set publicado = true where slug = ${victima.slug}`;
      throw new Error("__deshacer__");
    });
  } catch (e) {
    if (String(e.message).includes("aviso(s) bloqueante(s)")) bloqueo = true;
    else if (e.message !== "__deshacer__") throw e;
  }
  if (bloqueo) console.log("  ✓ el disparador impide publicar con avisos bloqueantes");
  else fallos.push("el disparador NO impidió publicar un producto con avisos bloqueantes");
}

await sql.end();

if (fallos.length) {
  console.error("\nLa base y la aplicación no coinciden:");
  for (const f of fallos) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log("\nLa base coincide con lo que la aplicación espera.");
