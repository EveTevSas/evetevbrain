import { sql } from "drizzle-orm";
import type { ReglaRiesgo, ResultadoRiesgo, SenalesRiesgo } from "@evetev/shared";
import type { Db } from "../../database/drizzle";
import { traducirErrorDeBase } from "../../database/errores";
import type {
  CasoRiesgo,
  Coincidencia,
  DocumentoAVerificar,
  EntradaLista,
  Evaluacion,
  ReglaGuardada,
  ResumenRiesgo,
  RiesgoRepository
} from "./riesgo.repository";

type Fila = Record<string, unknown>;
const texto = (v: unknown) => (v == null ? null : String(v));
const fecha = (v: unknown) => new Date(String(v)).toISOString();

function aRegla(f: Fila): ReglaGuardada {
  return {
    id: String(f.id),
    nombre: String(f.nombre),
    tipo: String(f.tipo) as ReglaRiesgo["tipo"],
    tenantId: texto(f.tenant_id),
    tenantNombre: texto(f.tenant_nombre),
    parametros: (f.parametros ?? {}) as ReglaRiesgo["parametros"],
    accion: String(f.accion) as ReglaRiesgo["accion"],
    modo: String(f.modo) as ReglaRiesgo["modo"],
    prioridad: Number(f.prioridad),
    creadaPor: String(f.creada_por),
    creadaEn: fecha(f.creada_en),
    actualizadaPor: String(f.actualizada_por),
    actualizadaEn: fecha(f.actualizada_en),
    disparos30d: Number(f.disparos_30d ?? 0),
    disparosHoy: Number(f.disparos_hoy ?? 0),
    retenciones30d: Number(f.retenciones_30d ?? 0),
    liberadas30d: Number(f.liberadas_30d ?? 0)
  };
}

function aSenales(s: unknown): SenalesRiesgo {
  const o = (s ?? {}) as Partial<Record<keyof SenalesRiesgo, unknown>>;
  return {
    hoyMinor: Number(o.hoyMinor ?? 0),
    mesMinor: Number(o.mesMinor ?? 0),
    ticketPromedioMinor: Number(o.ticketPromedioMinor ?? 0),
    cobrosHistoricos: Number(o.cobrosHistoricos ?? 0)
  };
}

/** Adaptador sobre las funciones de la migración 0019. */
export class DrizzleRiesgoRepository implements RiesgoRepository {
  constructor(private readonly db: Db) {}

  async senales(tenantId: string): Promise<SenalesRiesgo> {
    const f =
      (
        await this.db.execute<Fila>(sql`SELECT * FROM evepay.senales_riesgo(${tenantId}::uuid)`)
      )[0] ?? {};
    return {
      hoyMinor: Number(f.hoy_minor ?? 0),
      mesMinor: Number(f.mes_minor ?? 0),
      ticketPromedioMinor: Number(f.ticket_promedio_minor ?? 0),
      cobrosHistoricos: Number(f.cobros_historicos ?? 0)
    };
  }

  async reglasDe(tenantId: string): Promise<(ReglaRiesgo & { id: string })[]> {
    const filas = await this.db.execute<Fila>(
      sql`SELECT * FROM evepay.reglas_riesgo_de(${tenantId}::uuid)`
    );
    return filas.map((f) => ({
      id: String(f.id),
      nombre: String(f.nombre),
      tipo: String(f.tipo) as ReglaRiesgo["tipo"],
      tenantId: texto(f.tenant_id),
      parametros: (f.parametros ?? {}) as ReglaRiesgo["parametros"],
      accion: String(f.accion) as ReglaRiesgo["accion"],
      modo: String(f.modo) as ReglaRiesgo["modo"],
      prioridad: Number(f.prioridad)
    }));
  }

  async registrarEvaluacion(args: {
    tenantId: string;
    paymentId: string | null;
    montoMinor: number;
    resultado: ResultadoRiesgo;
    senales: SenalesRiesgo;
  }): Promise<string> {
    const filas = await this.db.execute<{ registrar_evaluacion_riesgo: string }>(sql`
      SELECT evepay.registrar_evaluacion_riesgo(
        ${args.tenantId}::uuid, ${args.paymentId}::uuid, ${args.montoMinor}::bigint, ${args.resultado.decision},
        ${JSON.stringify(args.resultado.disparadas)}::jsonb, ${JSON.stringify(args.senales)}::jsonb
      )
    `);
    return filas[0]!.registrar_evaluacion_riesgo;
  }

  async retenerPorRiesgo(args: {
    paymentId: string;
    evaluacionId: string;
    motivo: string;
    actor: string;
  }): Promise<string> {
    try {
      const filas = await this.db.execute<{ retener_por_riesgo: string }>(sql`
        SELECT evepay.retener_por_riesgo(${args.paymentId}::uuid, ${args.evaluacionId}::uuid, ${args.motivo}, ${args.actor})
      `);
      return filas[0]!.retener_por_riesgo;
    } catch (error) {
      traducirErrorDeBase(error);
    }
  }

  async listarReglas(): Promise<ReglaGuardada[]> {
    return (
      await this.db.execute<Fila>(sql`SELECT * FROM evepay.admin_listar_reglas_riesgo()`)
    ).map(aRegla);
  }

  async guardarRegla(id: string | null, regla: ReglaRiesgo, actor: string): Promise<string> {
    try {
      const filas = await this.db.execute<{ admin_guardar_regla_riesgo: string }>(sql`
        SELECT evepay.admin_guardar_regla_riesgo(
          ${id}::uuid, ${regla.nombre}, ${regla.tipo}, ${regla.tenantId}::uuid, ${JSON.stringify(regla.parametros)}::jsonb,
          ${regla.accion}, ${regla.modo}, ${regla.prioridad}::int, ${actor}
        )
      `);
      return filas[0]!.admin_guardar_regla_riesgo;
    } catch (error) {
      traducirErrorDeBase(error);
    }
  }

  async listarEvaluaciones(tenantId?: string, limite = 100): Promise<Evaluacion[]> {
    const filas = await this.db.execute<Fila>(
      sql`SELECT * FROM evepay.admin_listar_evaluaciones_riesgo(${tenantId ?? null}::uuid, ${limite})`
    );
    return filas.map((f) => ({
      id: String(f.id),
      tenantId: String(f.tenant_id),
      tenantNombre: String(f.tenant_nombre),
      paymentId: texto(f.payment_id),
      referencia: texto(f.reference),
      montoMinor: Number(f.monto_minor),
      decision: String(f.decision) as Evaluacion["decision"],
      reglasDisparadas: (f.reglas_disparadas ?? []) as Evaluacion["reglasDisparadas"],
      senales: aSenales(f.senales),
      creadaEn: fecha(f.creada_en)
    }));
  }

  async resumenRiesgo(): Promise<ResumenRiesgo> {
    const f =
      (await this.db.execute<Fila>(sql`SELECT * FROM evepay.admin_resumen_riesgo()`))[0] ?? {};
    return {
      evaluadasHoy: Number(f.evaluadas_hoy ?? 0),
      rechazadasHoy: Number(f.rechazadas_hoy ?? 0),
      retenidasHoy: Number(f.retenidas_hoy ?? 0),
      enCola: Number(f.en_cola ?? 0),
      shadowHoy: Number(f.shadow_hoy ?? 0)
    };
  }

  async colaRiesgo(): Promise<CasoRiesgo[]> {
    const filas = await this.db.execute<Fila>(sql`SELECT * FROM evepay.admin_cola_riesgo()`);
    return filas.map((f) => ({
      retencionId: String(f.retencion_id),
      tenantId: String(f.tenant_id),
      tenantNombre: String(f.tenant_nombre),
      paymentId: String(f.payment_id),
      referencia: String(f.reference),
      estadoCobro: String(f.payment_status),
      montoCobroMinor: Number(f.amount_minor),
      montoRetenidoMinor: Number(f.monto_retenido),
      motivo: String(f.motivo),
      creadaEn: fecha(f.creada_en),
      evaluacionId: texto(f.evaluacion_id),
      reglasDisparadas: (f.reglas_disparadas ?? []) as CasoRiesgo["reglasDisparadas"],
      senales: aSenales(f.senales)
    }));
  }

  async listarLista(limite = 200): Promise<EntradaLista[]> {
    const filas = await this.db.execute<Fila>(
      sql`SELECT * FROM evepay.admin_listar_lista_restrictiva(${limite})`
    );
    return filas.map((f) => ({
      id: String(f.id),
      tipoDocumento: String(f.tipo_documento),
      numeroDocumento: String(f.numero_documento),
      nombre: String(f.nombre),
      fuente: String(f.fuente) as EntradaLista["fuente"],
      motivo: texto(f.motivo),
      activa: Boolean(f.activa),
      agregadaPor: String(f.agregada_por),
      agregadaEn: fecha(f.agregada_en)
    }));
  }

  async agregarALista(
    e: Omit<EntradaLista, "id" | "activa" | "agregadaPor" | "agregadaEn">,
    actor: string
  ): Promise<string> {
    try {
      const filas = await this.db.execute<{ admin_agregar_lista_restrictiva: string }>(sql`
        SELECT evepay.admin_agregar_lista_restrictiva(${e.tipoDocumento}, ${e.numeroDocumento}, ${e.nombre}, ${e.fuente}, ${e.motivo}, ${actor})
      `);
      return filas[0]!.admin_agregar_lista_restrictiva;
    } catch (error) {
      traducirErrorDeBase(error);
    }
  }

  async desactivarDeLista(id: string, actor: string): Promise<void> {
    try {
      await this.db.execute(
        sql`SELECT evepay.admin_desactivar_lista_restrictiva(${id}::uuid, ${actor})`
      );
    } catch (error) {
      traducirErrorDeBase(error);
    }
  }

  async coincidencias(docs: DocumentoAVerificar[]): Promise<Coincidencia[]> {
    const filas = await this.db.execute<Fila>(
      sql`SELECT * FROM evepay.admin_coincidencias_restrictivas(${JSON.stringify(docs)}::jsonb)`
    );
    return filas.map((f) => ({
      quien: String(f.quien),
      tipoDocumento: String(f.tipo_documento),
      numeroDocumento: String(f.numero_documento),
      nombre: String(f.nombre),
      fuente: String(f.fuente),
      motivo: texto(f.motivo)
    }));
  }
}
