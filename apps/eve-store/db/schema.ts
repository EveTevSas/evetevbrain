/* Schema `tienda` en Drizzle.
 *
 * Espeja `0001_tienda.sql`, que es la fuente: la migración se aplica con psql y
 * esto le da tipos a la aplicación. Si los dos se separan, manda el SQL — y el
 * script `db:check` lo detecta comparando contra la base real.
 *
 * El disparador que impide publicar con avisos bloqueantes NO está aquí: vive
 * solo en la base, a propósito. Una regla que se pueda saltar cambiando de
 * cliente no es una regla.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  char,
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp
} from "drizzle-orm/pg-core";

export const tiendaSchema = pgSchema("tienda");

export const producto = tiendaSchema.table(
  "producto",
  {
    slug: text("slug").primaryKey(),
    nombre: text("nombre").notNull(),
    marca: text("marca").notNull(),

    /** Identidad del producto entre sitios. Sin él somos un producto anónimo. */
    gtin: text("gtin").unique(),
    gtinHistoricos: text("gtin_historicos")
      .array()
      .notNull()
      .default(sql`'{}'`),

    /**
     * Entero en la unidad mínima, igual que `montoMinor` en EvePay. Para COP la
     * unidad mínima ES el valor face: $52.000 se guarda como 52000. Guardarlo
     * como pesos×100 mandaría a EvePay pedidos cien veces mayores.
     */
    precioMinor: bigint("precio_minor", { mode: "number" }).notNull(),
    moneda: char("moneda", { length: 3 }).notNull().default("COP"),

    contenido: text("contenido"),
    imagen: text("imagen"),

    descripcion: text("descripcion"),
    descripcionPorConfirmar: boolean("descripcion_por_confirmar").notNull().default(true),

    /** Variables por categoría; son los campos que un agente compara. */
    atributos: jsonb("atributos")
      .notNull()
      .default(sql`'{}'::jsonb`),

    existencias: integer("existencias").notNull().default(0),

    /** Nada sale a producción por defecto. Lo custodia un disparador. */
    publicado: boolean("publicado").notNull().default(false),

    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    check("producto_precio_positivo", sql`${t.precioMinor} > 0`),
    check("producto_existencias_no_negativas", sql`${t.existencias} >= 0`)
  ]
);

/**
 * La cola de trabajo del panel. No son notas: los bloqueantes impiden publicar,
 * y llevan responsable porque resolverlos es trabajo de alguien.
 */
export const aviso = tiendaSchema.table(
  "aviso",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    productoSlug: text("producto_slug")
      .notNull()
      .references(() => producto.slug, { onDelete: "cascade" }),
    texto: text("texto").notNull(),
    bloqueante: boolean("bloqueante").notNull().default(true),
    /** `automatico` lo deduce la base del dato; `importacion` lo aporta el origen. */
    origen: text("origen").notNull().default("importacion"),
    resueltoEn: timestamp("resuelto_en", { withTimezone: true }),
    resueltoPor: text("resuelto_por"),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index("aviso_pendiente_idx")
      .on(t.productoSlug)
      .where(sql`${t.resueltoEn} is null`)
  ]
);

/** Trazabilidad hacia Mercado Libre: de dónde salió cada dato. */
export const origenPublicacion = tiendaSchema.table("origen_publicacion", {
  productoSlug: text("producto_slug")
    .notNull()
    .references(() => producto.slug, { onDelete: "cascade" }),
  publicacionMl: text("publicacion_ml").notNull(),
  estadoMl: text("estado_ml"),
  vendidas: integer("vendidas").notNull().default(0)
});

export type Producto = typeof producto.$inferSelect;
export type Aviso = typeof aviso.$inferSelect;
