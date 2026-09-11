import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DB, type Db } from "../../database/drizzle";
import { traducirErrorDeBase } from "../../database/errores";

/**
 * Reembolsos y contracargos para la consola (spec `reembolsos-contracargos`).
 * Las reglas de dinero viven en la base (0021): validar contra lo que queda,
 * repartir, asentar y cambiar el estado, todo en una transacción. Aquí solo
 * se traduce entre HTTP y esas funciones, con quién actúa y con qué rol.
 */

export interface Reembolso {
  id: string;
  tenantId: string;
  tenantNombre: string;
  paymentId: string;
  referencia: string;
  montoMinor: number;
  origen: "reembolso" | "contracargo";
  contracargoId: string | null;
  motivo: string;
  fechaPago: string;
  referenciaPago: string;
  comprobante: string | null;
  parteComercio: number;
  parteComision: number;
  parteIva: number;
  registradoPor: string;
  registradoEn: string;
}

export type EstadoContracargo = "recibido" | "en_evidencia" | "ganado" | "perdido";

export interface Contracargo {
  id: string;
  tenantId: string;
  tenantNombre: string;
  paymentId: string;
  referencia: string;
  estadoCobro: string;
  montoCobroMinor: number;
  montoMinor: number;
  motivoRed: string;
  referenciaRed: string | null;
  fechaLimiteEvidencia: string;
  estado: EstadoContracargo;
  evidencia: string | null;
  recibidoPor: string;
  recibidoEn: string;
  evidenciaPor: string | null;
  evidenciaEn: string | null;
  resueltoPor: string | null;
  resueltoEn: string | null;
  resolucionNota: string | null;
  diasParaEvidencia: number;
}

export interface Actor {
  actor: string;
  rol: string;
}

type Fila = Record<string, unknown>;
const texto = (v: unknown) => (v == null ? null : String(v));
const fecha = (v: unknown) => new Date(String(v)).toISOString();
const dia = (v: unknown) => String(v).slice(0, 10);

@Injectable()
export class ReembolsosAdminService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private aReembolso(f: Fila): Reembolso {
    return {
      id: String(f.id),
      tenantId: String(f.tenant_id),
      tenantNombre: String(f.tenant_nombre),
      paymentId: String(f.payment_id),
      referencia: String(f.reference),
      montoMinor: Number(f.monto_minor),
      origen: String(f.origen) as Reembolso["origen"],
      contracargoId: texto(f.contracargo_id),
      motivo: String(f.motivo),
      fechaPago: dia(f.fecha_pago),
      referenciaPago: String(f.referencia_pago),
      comprobante: texto(f.comprobante),
      parteComercio: Number(f.parte_comercio),
      parteComision: Number(f.parte_comision),
      parteIva: Number(f.parte_iva),
      registradoPor: String(f.registrado_por),
      registradoEn: fecha(f.registrado_en)
    };
  }

  private aContracargo(f: Fila): Contracargo {
    return {
      id: String(f.id),
      tenantId: String(f.tenant_id),
      tenantNombre: String(f.tenant_nombre),
      paymentId: String(f.payment_id),
      referencia: String(f.reference),
      estadoCobro: String(f.payment_status),
      montoCobroMinor: Number(f.amount_minor),
      montoMinor: Number(f.monto_minor),
      motivoRed: String(f.motivo_red),
      referenciaRed: texto(f.referencia_red),
      fechaLimiteEvidencia: dia(f.fecha_limite_evidencia),
      estado: String(f.estado) as EstadoContracargo,
      evidencia: texto(f.evidencia),
      recibidoPor: String(f.recibido_por),
      recibidoEn: fecha(f.recibido_en),
      evidenciaPor: texto(f.evidencia_por),
      evidenciaEn: f.evidencia_en ? fecha(f.evidencia_en) : null,
      resueltoPor: texto(f.resuelto_por),
      resueltoEn: f.resuelto_en ? fecha(f.resuelto_en) : null,
      resolucionNota: texto(f.resolucion_nota),
      diasParaEvidencia: Number(f.dias_para_evidencia ?? 0)
    };
  }

  async listarReembolsos(paymentId?: string, limite = 100): Promise<Reembolso[]> {
    const filas = await this.db.execute<Fila>(
      sql`SELECT * FROM evepay.admin_listar_reembolsos(${paymentId ?? null}::uuid, ${limite})`
    );
    return filas.map((f) => this.aReembolso(f));
  }

  /** Reembolso asistido: ya se pagó desde el banco, aquí se registra y se asienta. */
  async registrarReembolso(
    paymentId: string,
    input: {
      montoMinor: number;
      motivo: string;
      fecha: string;
      referenciaPago: string;
      comprobante?: string;
    },
    quien: Actor
  ): Promise<Reembolso> {
    let id = "";
    try {
      const filas = await this.db.execute<{ admin_registrar_reembolso: string }>(sql`
        SELECT evepay.admin_registrar_reembolso(
          ${paymentId}::uuid, ${input.montoMinor}::bigint, ${input.motivo}, ${input.fecha}::date,
          ${input.referenciaPago}, ${input.comprobante ?? null}, ${quien.actor}, ${quien.rol}
        )
      `);
      id = filas[0]!.admin_registrar_reembolso;
    } catch (error) {
      traducirErrorDeBase(error);
    }
    const r = (await this.listarReembolsos(paymentId)).find((x) => x.id === id);
    if (!r) throw new Error("El reembolso registrado no aparece en el listado.");
    return r;
  }

  async listarContracargos(
    estado?: EstadoContracargo,
    paymentId?: string,
    limite = 100
  ): Promise<Contracargo[]> {
    const filas = await this.db.execute<Fila>(
      sql`SELECT * FROM evepay.admin_listar_contracargos(${estado ?? null}, ${paymentId ?? null}::uuid, ${limite})`
    );
    return filas.map((f) => this.aContracargo(f));
  }

  async contracargo(id: string): Promise<Contracargo> {
    const filas = await this.db.execute<Fila>(
      sql`SELECT * FROM evepay.admin_listar_contracargos(null, null, 500) c WHERE c.id = ${id}::uuid`
    );
    const f = filas[0];
    if (!f) throw new NotFoundException("Contracargo no encontrado.");
    return this.aContracargo(f);
  }

  async registrarContracargo(
    paymentId: string,
    input: {
      montoMinor: number;
      motivoRed: string;
      referenciaRed?: string;
      fechaLimiteEvidencia: string;
    },
    quien: Actor
  ): Promise<Contracargo> {
    let id = "";
    try {
      const filas = await this.db.execute<{ admin_registrar_contracargo: string }>(sql`
        SELECT evepay.admin_registrar_contracargo(
          ${paymentId}::uuid, ${input.montoMinor}::bigint, ${input.motivoRed}, ${input.referenciaRed ?? null},
          ${input.fechaLimiteEvidencia}::date, ${quien.actor}, ${quien.rol}
        )
      `);
      id = filas[0]!.admin_registrar_contracargo;
    } catch (error) {
      traducirErrorDeBase(error);
    }
    return this.contracargo(id);
  }

  async evidencia(id: string, evidencia: string, quien: Actor): Promise<Contracargo> {
    try {
      await this.db.execute(
        sql`SELECT evepay.admin_contracargo_evidencia(${id}::uuid, ${evidencia}, ${quien.actor}, ${quien.rol})`
      );
    } catch (error) {
      traducirErrorDeBase(error);
    }
    return this.contracargo(id);
  }

  /** Ganado: nada cambia. Perdido: el dinero sale como un reembolso total del contracargo. */
  async resolver(
    id: string,
    input: {
      resultado: "ganado" | "perdido";
      nota?: string;
      fecha?: string;
      referenciaPago?: string;
    },
    quien: Actor
  ): Promise<Contracargo> {
    try {
      await this.db.execute(sql`
        SELECT evepay.admin_resolver_contracargo(
          ${id}::uuid, ${input.resultado}, ${input.nota ?? null}, ${input.fecha ?? null}::date,
          ${input.referenciaPago ?? null}, ${quien.actor}, ${quien.rol}
        )
      `);
    } catch (error) {
      traducirErrorDeBase(error);
    }
    return this.contracargo(id);
  }
}
