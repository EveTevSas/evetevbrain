import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  date,
  foreignKey,
  index,
  integer,
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

export const tipoParqueadero = conjuntosSchema.enum("tipo_parqueadero", ["zona", "unidad"]);
export const estadoParqueadero = conjuntosSchema.enum("estado_parqueadero", [
  "disponible",
  "asignado",
  "mantenimiento"
]);
export const claseVehiculo = conjuntosSchema.enum("clase_vehiculo", [
  "automovil",
  "motocicleta",
  "otro"
]);
export const estadoAccesoVehiculo = conjuntosSchema.enum("estado_acceso_vehiculo", [
  "autorizado",
  "suspendido",
  "vencido"
]);
export const direccionAccesoVehicular = conjuntosSchema.enum("direccion_acceso_vehicular", [
  "ingreso",
  "salida"
]);
export const decisionAccesoVehicular = conjuntosSchema.enum("decision_acceso_vehicular", [
  "autorizado",
  "denegado"
]);
export const origenAccesoVehicular = conjuntosSchema.enum("origen_acceso_vehicular", [
  "permanente",
  "visitante",
  "desconocido"
]);
export const tipoMascota = conjuntosSchema.enum("tipo_mascota", ["perro", "gato"]);
export const tamanoMascota = conjuntosSchema.enum("tamano_mascota", [
  "grande",
  "mediano",
  "pequeno"
]);
export const estadoMascota = conjuntosSchema.enum("estado_mascota", ["activo", "inactivo"]);
export const estadoComunicado = conjuntosSchema.enum("estado_comunicado", [
  "borrador",
  "programado",
  "publicado"
]);
export const tipoAsamblea = conjuntosSchema.enum("tipo_asamblea", [
  "ordinaria",
  "extraordinaria",
  "informativa"
]);
export const modalidadAsamblea = conjuntosSchema.enum("modalidad_asamblea", [
  "presencial",
  "virtual",
  "hibrida"
]);
export const estadoAsamblea = conjuntosSchema.enum("estado_asamblea", [
  "programada",
  "en_curso",
  "cerrada"
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
    funcionalidadesAsamblea: jsonb("funcionalidades_asamblea")
      .default({
        document_repository: true,
        delivery_tracking: true,
        proxy_management: true,
        identity_accreditation: true,
        continuous_quorum: true,
        unit_voting: true,
        coefficient_voting: true,
        qualified_majorities: true,
        secret_ballots: true,
        hybrid_participation: true,
        resident_questions: true,
        minutes_workflow: true,
        decision_tracking: true
      })
      .notNull(),
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

export const comunicados = conjuntosSchema.table(
  "comunicados",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    titulo: text("titulo").notNull(),
    mensaje: text("mensaje").notNull(),
    audiencia: text("audiencia").notNull(),
    canales: text("canales").array().notNull(),
    publicadoEn: timestamp("publicado_en", { withTimezone: true }).notNull(),
    entregaPorcentaje: integer("entrega_porcentaje").default(0).notNull(),
    estado: estadoComunicado("estado").notNull(),
    creadoPorUsuarioId: uuid("creado_por_usuario_id").notNull(),
    ...auditColumns
  },
  (table) => [
    index("comunicados_conjunto_publicacion_idx").on(table.conjuntoId, table.publicadoEn),
    check("comunicados_titulo_no_vacio", sql`length(trim(${table.titulo})) >= 5`),
    check("comunicados_mensaje_no_vacio", sql`length(trim(${table.mensaje})) >= 10`),
    check("comunicados_entrega_valida", sql`${table.entregaPorcentaje} between 0 and 100`)
  ]
);

export const asambleas = conjuntosSchema.table(
  "asambleas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    titulo: text("titulo").notNull(),
    tipo: tipoAsamblea("tipo").notNull(),
    modalidad: modalidadAsamblea("modalidad").notNull(),
    iniciaEn: timestamp("inicia_en", { withTimezone: true }).notNull(),
    ubicacion: text("ubicacion").notNull(),
    ordenDelDia: text("orden_del_dia").notNull(),
    estado: estadoAsamblea("estado").default("programada").notNull(),
    expediente: jsonb("expediente").default({}).notNull(),
    creadoPorUsuarioId: uuid("creado_por_usuario_id").notNull(),
    ...auditColumns
  },
  (table) => [
    index("asambleas_conjunto_fecha_idx").on(table.conjuntoId, table.iniciaEn),
    check("asambleas_titulo_valido", sql`length(trim(${table.titulo})) between 5 and 140`),
    check("asambleas_ubicacion_valida", sql`length(trim(${table.ubicacion})) between 3 and 240`),
    check("asambleas_orden_valido", sql`length(trim(${table.ordenDelDia})) between 10 and 3000`)
  ]
);

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
    tipoIdentificacion: text("tipo_identificacion"),
    numeroIdentificacion: text("numero_identificacion"),
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
    uniqueIndex("personas_conjunto_identificacion_unica")
      .on(table.conjuntoId, table.tipoIdentificacion, table.numeroIdentificacion)
      .where(sql`${table.numeroIdentificacion} is not null and ${table.anonimizadaEn} is null`),
    check(
      "personas_identificacion_completa",
      sql`(${table.tipoIdentificacion} is null and ${table.numeroIdentificacion} is null)
        or (${table.tipoIdentificacion} is not null and ${table.numeroIdentificacion} is not null)`
    ),
    check(
      "personas_tipo_identificacion_valido",
      sql`${table.tipoIdentificacion} is null or ${table.tipoIdentificacion} in
        ('cc', 'ti', 'ce', 'passport', 'ppt', 'civil_registry', 'nit', 'other')`
    ),
    check(
      "personas_anonimizacion_consistente",
      sql`${table.anonimizadaEn} is null or (
        ${table.nombre} is null
        and ${table.tipoIdentificacion} is null
        and ${table.numeroIdentificacion} is null
        and ${table.email} is null
        and ${table.telefono} is null
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

export const mascotas = conjuntosSchema.table(
  "mascotas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    personaId: uuid("persona_id").notNull(),
    unidadId: uuid("unidad_id").notNull(),
    tipo: tipoMascota("tipo").notNull(),
    anioNacimiento: integer("anio_nacimiento").notNull(),
    tamano: tamanoMascota("tamano").notNull(),
    nombre: text("nombre").notNull(),
    estado: estadoMascota("estado").default("activo").notNull(),
    fotoPath: text("foto_path"),
    ...auditColumns
  },
  (table) => [
    foreignKey({
      columns: [table.conjuntoId, table.personaId],
      foreignColumns: [personas.conjuntoId, personas.id],
      name: "mascotas_persona_fk"
    }),
    foreignKey({
      columns: [table.conjuntoId, table.unidadId],
      foreignColumns: [unidades.conjuntoId, unidades.id],
      name: "mascotas_unidad_fk"
    }),
    uniqueIndex("mascotas_conjunto_id_unico").on(table.conjuntoId, table.id),
    index("mascotas_unidad_estado_idx").on(table.conjuntoId, table.unidadId, table.estado),
    index("mascotas_persona_idx").on(table.conjuntoId, table.personaId),
    check("mascotas_nombre_no_vacio", sql`length(trim(${table.nombre})) >= 2`),
    check(
      "mascotas_anio_nacimiento_valido",
      sql`${table.anioNacimiento} between 1900 and extract(year from current_date)::integer`
    )
  ]
);

export const parqueaderos = conjuntosSchema.table(
  "parqueaderos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    codigo: text("codigo").notNull(),
    codigoNormalizado: text("codigo_normalizado").notNull(),
    tipo: tipoParqueadero("tipo").notNull(),
    sector: text("sector"),
    numero: text("numero").notNull(),
    unidadBaseId: uuid("unidad_base_id"),
    estado: estadoParqueadero("estado").default("disponible").notNull(),
    ...auditColumns
  },
  (table) => [
    foreignKey({
      columns: [table.conjuntoId, table.unidadBaseId],
      foreignColumns: [unidades.conjuntoId, unidades.id],
      name: "parqueaderos_unidad_base_fk"
    }),
    uniqueIndex("parqueaderos_conjunto_id_unico").on(table.conjuntoId, table.id),
    uniqueIndex("parqueaderos_conjunto_codigo_unico").on(table.conjuntoId, table.codigoNormalizado),
    index("parqueaderos_unidad_base_idx")
      .on(table.conjuntoId, table.unidadBaseId)
      .where(sql`${table.unidadBaseId} is not null`),
    check("parqueaderos_codigo_no_vacio", sql`length(trim(${table.codigo})) > 0`),
    check(
      "parqueaderos_codigo_normalizado_valido",
      sql`${table.codigoNormalizado} = upper(regexp_replace(${table.codigo}, '[^A-Za-z0-9]', '', 'g'))`
    ),
    check(
      "parqueaderos_tipo_consistente",
      sql`(${table.tipo} = 'zona' and ${table.sector} is not null and ${table.unidadBaseId} is null)
        or (${table.tipo} = 'unidad' and ${table.sector} is null and ${table.unidadBaseId} is not null)`
    )
  ]
);

export const vehiculos = conjuntosSchema.table(
  "vehiculos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    personaId: uuid("persona_id").notNull(),
    unidadId: uuid("unidad_id").notNull(),
    placa: text("placa").notNull(),
    placaNormalizada: text("placa_normalizada").notNull(),
    clase: claseVehiculo("clase").notNull(),
    marca: text("marca").notNull(),
    color: text("color").notNull(),
    estadoAcceso: estadoAccesoVehiculo("estado_acceso").default("autorizado").notNull(),
    vigenteDesde: timestamp("vigente_desde", { withTimezone: true }).defaultNow().notNull(),
    vigenteHasta: date("vigente_hasta"),
    ...auditColumns
  },
  (table) => [
    foreignKey({
      columns: [table.conjuntoId, table.personaId],
      foreignColumns: [personas.conjuntoId, personas.id],
      name: "vehiculos_persona_fk"
    }),
    foreignKey({
      columns: [table.conjuntoId, table.unidadId],
      foreignColumns: [unidades.conjuntoId, unidades.id],
      name: "vehiculos_unidad_fk"
    }),
    uniqueIndex("vehiculos_conjunto_id_unico").on(table.conjuntoId, table.id),
    uniqueIndex("vehiculos_placa_activa_unica")
      .on(table.conjuntoId, table.placaNormalizada)
      .where(sql`${table.estadoAcceso} <> 'vencido'`),
    index("vehiculos_unidad_idx").on(table.conjuntoId, table.unidadId),
    check(
      "vehiculos_placa_normalizada_valida",
      sql`${table.placaNormalizada} = upper(regexp_replace(${table.placa}, '[^A-Za-z0-9]', '', 'g'))
        and ${table.placaNormalizada} ~ '^[A-Z0-9]{5,8}$'`
    ),
    check(
      "vehiculos_vigencia_valida",
      sql`${table.vigenteHasta} is null or ${table.vigenteHasta} >= ${table.vigenteDesde}::date`
    )
  ]
);

export const asignacionesParqueadero = conjuntosSchema.table(
  "asignaciones_parqueadero",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    parqueaderoId: uuid("parqueadero_id").notNull(),
    unidadId: uuid("unidad_id").notNull(),
    vehiculoId: uuid("vehiculo_id"),
    vigenteDesde: date("vigente_desde")
      .default(sql`current_date`)
      .notNull(),
    vigenteHasta: date("vigente_hasta"),
    activa: boolean("activa").default(true).notNull(),
    ...auditColumns
  },
  (table) => [
    foreignKey({
      columns: [table.conjuntoId, table.parqueaderoId],
      foreignColumns: [parqueaderos.conjuntoId, parqueaderos.id],
      name: "asignaciones_parqueadero_parqueadero_fk"
    }),
    foreignKey({
      columns: [table.conjuntoId, table.unidadId],
      foreignColumns: [unidades.conjuntoId, unidades.id],
      name: "asignaciones_parqueadero_unidad_fk"
    }),
    foreignKey({
      columns: [table.conjuntoId, table.vehiculoId],
      foreignColumns: [vehiculos.conjuntoId, vehiculos.id],
      name: "asignaciones_parqueadero_vehiculo_fk"
    }),
    uniqueIndex("asignaciones_parqueadero_conjunto_id_unico").on(table.conjuntoId, table.id),
    uniqueIndex("asignaciones_parqueadero_activa_unica")
      .on(table.conjuntoId, table.parqueaderoId)
      .where(sql`${table.activa}`),
    uniqueIndex("asignaciones_vehiculo_activa_unica")
      .on(table.conjuntoId, table.vehiculoId)
      .where(sql`${table.activa} and ${table.vehiculoId} is not null`),
    index("asignaciones_parqueadero_unidad_idx")
      .on(table.conjuntoId, table.unidadId)
      .where(sql`${table.activa}`),
    check(
      "asignaciones_parqueadero_vigencia_valida",
      sql`${table.vigenteHasta} is null or ${table.vigenteHasta} >= ${table.vigenteDesde}`
    )
  ]
);

export const eventosAccesoVehicular = conjuntosSchema.table(
  "eventos_acceso_vehicular",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conjuntoId: uuid("conjunto_id")
      .notNull()
      .references(() => conjuntos.id),
    vehiculoId: uuid("vehiculo_id"),
    placaNormalizada: text("placa_normalizada").notNull(),
    direccion: direccionAccesoVehicular("direccion").notNull(),
    decision: decisionAccesoVehicular("decision").notNull(),
    motivo: text("motivo").notNull(),
    origen: origenAccesoVehicular("origen").notNull(),
    unidadId: uuid("unidad_id"),
    parqueaderoId: uuid("parqueadero_id"),
    actorUsuarioId: uuid("actor_usuario_id"),
    ocurridoEn: timestamp("ocurrido_en", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.conjuntoId, table.vehiculoId],
      foreignColumns: [vehiculos.conjuntoId, vehiculos.id],
      name: "eventos_acceso_vehicular_vehiculo_fk"
    }),
    foreignKey({
      columns: [table.conjuntoId, table.unidadId],
      foreignColumns: [unidades.conjuntoId, unidades.id],
      name: "eventos_acceso_vehicular_unidad_fk"
    }),
    foreignKey({
      columns: [table.conjuntoId, table.parqueaderoId],
      foreignColumns: [parqueaderos.conjuntoId, parqueaderos.id],
      name: "eventos_acceso_vehicular_parqueadero_fk"
    }),
    index("eventos_acceso_vehicular_fecha_idx").on(table.conjuntoId, table.ocurridoEn),
    check(
      "eventos_acceso_vehicular_placa_valida",
      sql`${table.placaNormalizada} = upper(regexp_replace(${table.placaNormalizada}, '[^A-Za-z0-9]', '', 'g'))
        and ${table.placaNormalizada} ~ '^[A-Z0-9]{5,8}$'`
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
