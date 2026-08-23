#!/usr/bin/env node
/* Carga `catalogo/catalogo.json` en el schema `tienda`.
 *
 * Es la travesía de la puerta de un solo sentido: después de esto la fuente de
 * verdad es la base y el JSON queda como artefacto de importación. Por eso el
 * script es idempotente —se puede volver a correr sin duplicar— pero NO pisa lo
 * que una persona haya editado desde el panel: si un producto ya está publicado
 * o tiene avisos resueltos, se respeta.
 *
 *   DATABASE_URL=postgres://… node apps/eve-store/scripts/importar.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

const aqui = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL.");
  process.exit(1);
}

const { productos } = JSON.parse(
  readFileSync(join(aqui, "..", "catalogo", "catalogo.json"), "utf8")
);
const sql = postgres(url, { onnotice: () => {} });

let nuevos = 0;
let actualizados = 0;

for (const p of productos) {
  const [fila] = await sql`
    insert into tienda.producto (
      slug, nombre, marca, gtin, gtin_historicos, precio_minor, moneda,
      contenido, imagen, descripcion, descripcion_por_confirmar, atributos, existencias
    ) values (
      ${p.slug}, ${p.nombre}, ${p.marca}, ${p.gtin},
      ${p.gtin_historicos ?? []}, ${Number(p.precio)}, ${p.moneda},
      ${p.contenido || null}, ${p.imagen}, ${p.descripcion},
      ${p.descripcion_por_confirmar ?? true}, ${sql.json(p.atributos)}, ${p.existencias}
    )
    on conflict (slug) do update set
      nombre = excluded.nombre,
      marca = excluded.marca,
      precio_minor = excluded.precio_minor,
      contenido = excluded.contenido,
      imagen = excluded.imagen,
      existencias = excluded.existencias
    returning (xmax = 0) as insertado`;
  if (fila.insertado) nuevos++;
  else actualizados++;

  // Los avisos ya resueltos no vuelven: resolverlos es trabajo hecho.
  for (const texto of p.avisos ?? []) {
    await sql`
      insert into tienda.aviso (producto_slug, texto)
      select ${p.slug}, ${texto}
       where not exists (
         select 1 from tienda.aviso
          where producto_slug = ${p.slug} and texto = ${texto})`;
  }

  for (const pub of p.origen?.publicaciones_ml ?? []) {
    await sql`
      insert into tienda.origen_publicacion (producto_slug, publicacion_ml, estado_ml, vendidas)
      values (${p.slug}, ${pub}, ${(p.origen.estado_ml ?? []).join("/")},
              ${p.origen.vendidas_historico ?? 0})
      on conflict do nothing`;
  }
}

const [r] = await sql`
  select
    (select count(*) from tienda.producto)                        as productos,
    (select count(*) from tienda.producto where publicado)        as publicados,
    (select count(*) from tienda.aviso where resuelto_en is null) as avisos,
    (select coalesce(sum(precio_minor * existencias), 0) from tienda.producto) as inventario`;

console.log(`${nuevos} nuevos · ${actualizados} actualizados`);
console.log(
  `${r.productos} productos · ${r.publicados} publicados · ${r.avisos} avisos pendientes · ` +
    `inventario $${Number(r.inventario).toLocaleString("es-CO")}`
);
await sql.end();
