import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  date,
  foreignKey,
  index,
  jsonb,
  numeric,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const conjuntosSchema = pgSchema("conjuntos");

export const rolMiembro = conjuntosSchema.enum("rol_miembro", [
  "super_admin",
  "admin_conjunto",
  "consejo",
  "residente"
]);

export const tipoUnidad = conjuntosSchema.enum("tipo_unidad", [
  "apartamento",
  "casa",
  "local",
  "parqueadero",
  "deposito",
  "otro"
]);

export const relacionPersonaUnidad = conjuntosSchema.enum("relacion_persona_unidad", [
  "propietario",
  "residente"
]);

export const tipoCuota = conjuntosSchema.enum("tipo_cuota", [
  "administracion",
  "extraordinaria",
  "multa"
]);

export const tipoMovimiento = conjuntosSchema.enum("tipo_movimiento_cuenta", [
  "cuota_generada",
  "interes_causado",
  "pago_aplicado",
  "ajuste_debito",
  "ajuste_credito",
  "reversion"
]);

const auditColumns = {
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull()
};

export const conjuntos = conjuntosSchema.table(
  "conjuntos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nombre: text("nombre").notNull(),
    nit: text("nit"),
    ciudad: text("ciudad"),
    zonaHoraria: text("zona_horaria").default("America/Bogota").notNull(),
    moneda: char("moneda", { length: 3 }).default("COP").notNull(),
    activo: boolean("activo").default(true).notNull(),
    ...auditColumns
  },
  (table) => [
    check("conjuntos_nombre_no_vacio", sql`length(trim(${table.nombre})) > 0`),
    check("conjuntos_moneda_cop", sql`${table.moneda} = 'COP'`)
  ]
);

export const escenariosDemo = conjuntosSchema.table("escenarios_demo", {
  conjuntoId: uuid("conjunto_id")
    .primaryKey()
    .references(() => conjuntos.id, { onDelete: "cascade" }),
  snapshot: jsonb("snapshot").notNull(),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).defaultNow().notNull()
});

export const miembrosConjunto = conjuntosSchema.table(
  "miembros_conjunto",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    usuarioId: uuid("usuario_id").notNull(),
    rol: rolMiembro("rol").notNull(),
    activo: boolean("activo").default(true).notNull(),
    ...auditColumns
  },
  (table) => [
    uniqueIndex("miembros_conjunto_usuario_unico").on(table.conjuntoId, table.usuarioId),
    index("miembros_conjunto_usuario_idx").on(table.usuarioId)
  ]
);

export const unidades = conjuntosSchema.table(
  "unidades",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    codigo: text("codigo").notNull(),
    tipo: tipoUnidad("tipo").notNull(),
    coeficiente: numeric("coeficiente", { precision: 9, scale: 6 }).notNull(),
    activa: boolean("activa").default(true).notNull(),
    ...auditColumns
  },
  (table) => [
    uniqueIndex("unidades_conjunto_codigo_unico").on(table.conjuntoId, table.codigo),
    uniqueIndex("unidades_conjunto_id_unico").on(table.conjuntoId, table.id),
    check(
      "unidades_coeficiente_valido",
      sql`${table.coeficiente} > 0 and ${table.coeficiente} <= 100`
    )
  ]
);

export const personas = conjuntosSchema.table(
  "personas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    authUsuarioId: uuid("auth_usuario_id"),
    nombre: text("nombre"),
    email: text("email"),
    telefono: text("telefono"),
    autorizacionTratamientoEn: timestamp("autorizacion_tratamiento_en", {
      withTimezone: true
    }),
    finalidadAutorizada: text("finalidad_autorizada"),
    anonimizadaEn: timestamp("anonimizada_en", { withTimezone: true }),
    ...auditColumns
  },
  (table) => [
    uniqueIndex("personas_conjunto_id_unico").on(table.conjuntoId, table.id),
    uniqueIndex("personas_conjunto_auth_usuario_unico")
      .on(table.conjuntoId, table.authUsuarioId)
      .where(sql`${table.authUsuarioId} is not null`),
    check(
      "personas_anonimizacion_consistente",
      sql`${table.anonimizadaEn} is null or (
        ${table.nombre} is null and ${table.email} is null and ${table.telefono} is null
      )`
    )
  ]
);

export const personasUnidades = conjuntosSchema.table(
  "personas_unidades",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conjuntoId: uuid("conjunto_id").notNull(),
    personaId: uuid("persona_id").notNull(),
    unidadId: uuid("unidad_id").notNull(),
    relacion: relacionPersonaUnidad("relacion").notNull(),
    responsablePago: boolean("responsable_pago").default(false).notNull(),
    vigenteDesde: date("vigente_desde")
      .default(sql`current_date`)
      .notNull(),
    vigenteHasta: date("vigente_hasta"),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.conjuntoId, table.personaId],
      foreignColumns: [personas.conjuntoId, personas.id],
      name: "personas_unidades_persona_fk"
    }),
    foreignKey({
      columns: [table.conjuntoId, table.unidadId],
      foreignColumns: [unidades.conjuntoId, unidades.id],
      name: "personas_unidades_unidad_fk"
    }),
    uniqueIndex("personas_unidades_vinculo_unico").on(
      table.conjuntoId,
      table.personaId,
      table.unidadId,
      table.relacion,
      table.vigenteDesde
    ),
    index("personas_unidades_unidad_idx").on(table.conjuntoId, table.unidadId),
    check(
      "personas_unidades_vigencia_valida",
      sql`${table.vigenteHasta} is null or ${table.vigenteHasta} >= ${table.vigenteDesde}`
    )
  ]
);

export const generacionesCuotas = conjuntosSchema.table(
  "generaciones_cuotas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    periodo: date("periodo").notNull(),
    tipo: tipoCuota("tipo").notNull(),
    concepto: text("concepto").notNull(),
    presupuestoMinor: bigint("presupuesto_minor", { mode: "bigint" }).notNull(),
    idempotenciaClave: text("idempotencia_clave").notNull(),
    creadoPorUsuarioId: uuid("creado_por_usuario_id").notNull(),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex("generaciones_cuotas_conjunto_id_unico").on(table.conjuntoId, table.id),
    uniqueIndex("generaciones_cuotas_idempotencia_unica").on(
      table.conjuntoId,
      table.idempotenciaClave
    ),
    uniqueIndex("generaciones_cuotas_administracion_periodo_unica")
      .on(table.conjuntoId, table.periodo)
      .where(sql`${table.tipo} = 'administracion'`),
    check("generaciones_cuotas_periodo_valido", sql`extract(day from ${table.periodo}) = 1`),
    check("generaciones_cuotas_presupuesto_valido", sql`${table.presupuestoMinor} >= 0`)
  ]
);

export const cuotas = conjuntosSchema.table(
  "cuotas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conjuntoId: uuid("conjunto_id").notNull(),
    generacionId: uuid("generacion_id").notNull(),
    unidadId: uuid("unidad_id").notNull(),
    concepto: text("concepto").notNull(),
    montoMinor: bigint("monto_minor", { mode: "bigint" }).notNull(),
    coeficienteAplicado: numeric("coeficiente_aplicado", {
      precision: 9,
      scale: 6
    }),
    venceEn: date("vence_en").notNull(),
    evepayCobroId: uuid("evepay_cobro_id"),
    creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.conjuntoId, table.generacionId],
      foreignColumns: [generacionesCuotas.conjuntoId, generacionesCuotas.id],
      name: "cuotas_generacion_fk"
    }),
    foreignKey({
      columns: [table.conjuntoId, table.unidadId],
      foreignColumns: [unidades.conjuntoId, unidades.id],
      name: "cuotas_unidad_fk"
    }),
    uniqueIndex("cuotas_conjunto_id_unico").on(table.conjuntoId, table.id),
    uniqueIndex("cuotas_generacion_unidad_unica").on(
      table.conjuntoId,
      table.generacionId,
      table.unidadId
    ),
    uniqueIndex("cuotas_evepay_cobro_unico")
      .on(table.evepayCobroId)
      .where(sql`${table.evepayCobroId} is not null`),
    check("cuotas_monto_valido", sql`${table.montoMinor} > 0`)
  ]
);

export const movimientosCuenta = conjuntosSchema.table(
  "movimientos_cuenta",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conjuntoId: uuid("conjunto_id").notNull(),
    unidadId: uuid("unidad_id").notNull(),
    cuotaId: uuid("cuota_id"),
    tipo: tipoMovimiento("tipo").notNull(),
    montoMinor: bigint("monto_minor", { mode: "bigint" }).notNull(),
    idempotenciaClave: text("idempotencia_clave").notNull(),
    evepayCobroId: uuid("evepay_cobro_id"),
    actorUsuarioId: uuid("actor_usuario_id"),
    motivo: text("motivo").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    ocurridoEn: timestamp("ocurrido_en", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.conjuntoId, table.unidadId],
      foreignColumns: [unidades.conjuntoId, unidades.id],
      name: "movimientos_cuenta_unidad_fk"
    }),
    foreignKey({
      columns: [table.conjuntoId, table.cuotaId],
      foreignColumns: [cuotas.conjuntoId, cuotas.id],
      name: "movimientos_cuenta_cuota_fk"
    }),
    uniqueIndex("movimientos_cuenta_idempotencia_unica").on(
      table.conjuntoId,
      table.idempotenciaClave
    ),
    index("movimientos_cuenta_unidad_fecha_idx").on(
      table.conjuntoId,
      table.unidadId,
      table.ocurridoEn
    ),
    check("movimientos_cuenta_monto_no_cero", sql`${table.montoMinor} <> 0`)
  ]
);

export const eventosAuditoria = conjuntosSchema.table(
  "eventos_auditoria",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    actorUsuarioId: uuid("actor_usuario_id"),
    accion: text("accion").notNull(),
    recursoTipo: text("recurso_tipo").notNull(),
    recursoId: uuid("recurso_id"),
    datos: jsonb("datos")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    ocurridoEn: timestamp("ocurrido_en", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index("eventos_auditoria_conjunto_fecha_idx").on(table.conjuntoId, table.ocurridoEn)]
);

export type Conjunto = typeof conjuntos.$inferSelect;
export type NuevaUnidad = typeof unidades.$inferInsert;
export type Persona = typeof personas.$inferSelect;
export type Cuota = typeof cuotas.$inferSelect;
export type MovimientoCuenta = typeof movimientosCuenta.$inferSelect;
