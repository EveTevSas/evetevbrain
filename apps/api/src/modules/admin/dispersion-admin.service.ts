import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { sql } from "drizzle-orm";
import type { EstadoLote, PoliticaDispersion } from "@evetev/shared";
import { DB, type Db } from "../../database/drizzle";
import { traducirErrorDeBase } from "../../database/errores";
import { puede } from "./permisos";

/**
 * Dispersión asistida para la consola (spec `dispersion`).
 *
 * Las reglas de dinero viven en la base (migración 0017): qué está
 * disponible, el cuatro ojos, que un lote se pague una sola vez, los
 * asientos. Este servicio traduce entre HTTP y esas funciones, y les pasa
 * quién actúa y con qué rol, que es lo que la auditoría guarda.
 */

export interface BalanceDispersion {
  disponibleMinor: number;
  pendienteMinor: number;
  retenidoMinor: number;
  enLoteMinor: number;
  cuentaCertificada: boolean;
  cuentaDetalle: string | null;
  cobrosDisponibles: number;
  diasLiquidacion: number;
  reservaBps: number;
  primerCobroRetenido: boolean;
}

export interface BalanceDispersionComercio extends BalanceDispersion {
  tenantId: string;
  tenantNombre: string;
  tenantEstado: string;
  loteAbierto: { id: string; estado: EstadoLote } | null;
}

export interface Lote {
  id: string;
  tenantId: string;
  tenantNombre: string;
  estado: EstadoLote;
  montoMinor: number;
  reservaMinor: number;
  cuenta: {
    banco: string;
    tipoCuenta: string;
    numeroCuenta: string;
    titularCuenta: string;
    titularDocumento: string;
  };
  preparadoPor: string;
  preparadoEn: string;
  aprobadoPor: string | null;
  aprobadoEn: string | null;
  fechaPago: string | null;
  referenciaPago: string | null;
  comprobante: string | null;
  pagadoPor: string | null;
  pagadoEn: string | null;
  falloMotivo: string | null;
  fallidoPor: string | null;
  fallidoEn: string | null;
  cobros: number;
}

export interface ItemLote {
  id: string;
  tipo: "cobro" | "reserva_liberada";
  paymentId: string | null;
  referencia: string | null;
  montoCobroMinor: number | null;
  retencionId: string | null;
  montoMinor: number;
  reservaMinor: number;
}

export type EstadoRetencion = "activa" | "pendiente" | "liberada" | "pagada" | "anulada";

export interface Retencion {
  id: string;
  tenantId: string;
  tenantNombre: string;
  tipo: "primer_cobro" | "reserva";
  paymentId: string | null;
  referencia: string | null;
  loteId: string | null;
  montoMinor: number;
  liberarDesde: string | null;
  motivo: string;
  creadaPor: string;
  creadaEn: string;
  liberadaPor: string | null;
  liberadaEn: string | null;
  liberacionMotivo: string | null;
  pagadaEnLote: string | null;
  estado: EstadoRetencion;
}

/** Quién actúa y con qué rol: va a la base para el cuatro ojos y la auditoría. */
export interface Actor {
  actor: string;
  rol: string;
}

function fecha(v: unknown): string | null {
  return v ? new Date(String(v)).toISOString() : null;
}
function texto(v: unknown): string | null {
  return v == null ? null : String(v);
}
function dia(v: unknown): string | null {
  return v ? String(v).slice(0, 10) : null;
}

@Injectable()
export class DispersionAdminService {
  constructor(@Inject(DB) private readonly db: Db) {}

  private aBalance(f: Record<string, unknown>): BalanceDispersion {
    return {
      disponibleMinor: Number(f.disponible_minor ?? 0),
      pendienteMinor: Number(f.pendiente_minor ?? 0),
      retenidoMinor: Number(f.retenido_minor ?? 0),
      enLoteMinor: Number(f.en_lote_minor ?? 0),
      cuentaCertificada: Boolean(f.cuenta_certificada),
      cuentaDetalle: texto(f.cuenta_detalle),
      cobrosDisponibles: Number(f.cobros_disponibles ?? 0),
      diasLiquidacion: Number(f.dias_liquidacion ?? 1),
      reservaBps: Number(f.reserva_bps ?? 0),
      primerCobroRetenido: Boolean(f.primer_cobro_retenido)
    };
  }

  private aLote(f: Record<string, unknown>): Lote {
    return {
      id: String(f.id),
      tenantId: String(f.tenant_id),
      tenantNombre: String(f.tenant_nombre),
      estado: String(f.estado) as EstadoLote,
      montoMinor: Number(f.monto_minor),
      reservaMinor: Number(f.reserva_minor),
      cuenta: {
        banco: String(f.banco),
        tipoCuenta: String(f.tipo_cuenta ?? ""),
        numeroCuenta: String(f.numero_cuenta),
        titularCuenta: String(f.titular_cuenta ?? ""),
        titularDocumento: String(f.titular_documento)
      },
      preparadoPor: String(f.preparado_por),
      preparadoEn: fecha(f.preparado_en)!,
      aprobadoPor: texto(f.aprobado_por),
      aprobadoEn: fecha(f.aprobado_en),
      fechaPago: dia(f.fecha_pago),
      referenciaPago: texto(f.referencia_pago),
      comprobante: texto(f.comprobante),
      pagadoPor: texto(f.pagado_por),
      pagadoEn: fecha(f.pagado_en),
      falloMotivo: texto(f.fallo_motivo),
      fallidoPor: texto(f.fallido_por),
      fallidoEn: fecha(f.fallido_en),
      cobros: Number(f.cobros ?? 0)
    };
  }

  private aRetencion(f: Record<string, unknown>): Retencion {
    return {
      id: String(f.id),
      tenantId: String(f.tenant_id),
      tenantNombre: String(f.tenant_nombre),
      tipo: String(f.tipo) as Retencion["tipo"],
      paymentId: texto(f.payment_id),
      referencia: texto(f.reference),
      loteId: texto(f.lote_id),
      montoMinor: Number(f.monto_minor),
      liberarDesde: dia(f.liberar_desde),
      motivo: String(f.motivo),
      creadaPor: String(f.creada_por),
      creadaEn: fecha(f.creada_en)!,
      liberadaPor: texto(f.liberada_por),
      liberadaEn: fecha(f.liberada_en),
      liberacionMotivo: texto(f.liberacion_motivo),
      pagadaEnLote: texto(f.pagada_en_lote),
      estado: String(f.estado) as EstadoRetencion
    };
  }

  async balances(): Promise<BalanceDispersionComercio[]> {
    const filas = await this.db.execute<Record<string, unknown>>(
      sql`SELECT * FROM evepay.admin_balances_dispersion()`
    );
    return filas.map((f) => ({
      ...this.aBalance(f),
      tenantId: String(f.tenant_id),
      tenantNombre: String(f.tenant_nombre),
      tenantEstado: String(f.tenant_estado),
      loteAbierto: f.lote_abierto
        ? { id: String(f.lote_abierto), estado: String(f.lote_abierto_estado) as EstadoLote }
        : null
    }));
  }

  async balance(tenantId: string): Promise<BalanceDispersion> {
    const filas = await this.db.execute<Record<string, unknown>>(
      sql`SELECT * FROM evepay.admin_balance_dispersion(${tenantId}::uuid)`
    );
    return this.aBalance(filas[0] ?? {});
  }

  async politica(
    tenantId: string
  ): Promise<PoliticaDispersion & { actualizadaPor: string | null }> {
    const filas = await this.db.execute<Record<string, unknown>>(
      sql`SELECT * FROM evepay.politica_de(${tenantId}::uuid)`
    );
    const f = filas[0] ?? {};
    return {
      diasLiquidacion: Number(f.dias_liquidacion ?? 1),
      reservaBps: Number(f.reserva_bps ?? 0),
      diasReserva: Number(f.dias_reserva ?? 30),
      retenerPrimerCobro: f.retener_primer_cobro == null ? true : Boolean(f.retener_primer_cobro),
      actualizadaPor: texto(f.actualizada_por)
    };
  }

  async guardarPolitica(
    tenantId: string,
    politica: PoliticaDispersion,
    quien: Actor
  ): Promise<void> {
    try {
      await this.db.execute(sql`
        SELECT evepay.admin_guardar_politica_dispersion(
          ${tenantId}::uuid, ${politica.diasLiquidacion}::int, ${politica.reservaBps}::int,
          ${politica.diasReserva}::int, ${politica.retenerPrimerCobro}, ${quien.actor}
        )
      `);
    } catch (error) {
      traducirErrorDeBase(error);
    }
  }

  /** Prepara el lote del comercio; 400 si no hay nada disponible (y dice por qué). */
  async prepararLote(tenantId: string, quien: Actor): Promise<Lote> {
    let id: string | null = null;
    try {
      const filas = await this.db.execute<{ admin_preparar_lote: string | null }>(
        sql`SELECT evepay.admin_preparar_lote(${tenantId}::uuid, ${quien.actor}, ${quien.rol})`
      );
      id = filas[0]?.admin_preparar_lote ?? null;
    } catch (error) {
      traducirErrorDeBase(error);
    }
    if (!id) {
      const b = await this.balance(tenantId);
      throw new BadRequestException(
        b.primerCobroRetenido
          ? "No hay nada disponible: el primer cobro del comercio quedó retenido hasta que alguien lo revise y lo libere."
          : b.pendienteMinor > 0
            ? "No hay nada disponible todavía: el dinero pendiente aún no está en la cuenta de recaudo o no cumple los días de liquidación."
            : "El comercio no tiene nada disponible para dispersar."
      );
    }
    return this.lote(id);
  }

  async aprobarLote(id: string, quien: Actor): Promise<Lote> {
    try {
      await this.db.execute(
        sql`SELECT evepay.admin_aprobar_lote(${id}::uuid, ${quien.actor}, ${quien.rol})`
      );
    } catch (error) {
      traducirErrorDeBase(error);
    }
    return this.lote(id);
  }

  async registrarPago(
    id: string,
    pago: { fecha: string; referenciaPago: string; comprobante?: string },
    quien: Actor
  ): Promise<Lote> {
    try {
      await this.db.execute(sql`
        SELECT evepay.admin_registrar_pago_lote(
          ${id}::uuid, ${pago.fecha}::date, ${pago.referenciaPago}, ${pago.comprobante ?? null}, ${quien.actor}, ${quien.rol}
        )
      `);
    } catch (error) {
      traducirErrorDeBase(error);
    }
    return this.lote(id);
  }

  async marcarFallido(id: string, motivo: string, quien: Actor): Promise<Lote> {
    try {
      await this.db.execute(
        sql`SELECT evepay.admin_marcar_lote_fallido(${id}::uuid, ${motivo}, ${quien.actor}, ${quien.rol})`
      );
    } catch (error) {
      traducirErrorDeBase(error);
    }
    return this.lote(id);
  }

  /**
   * Libera una retención. Quién puede depende del tipo: el primer cobro lo
   * libera cualquiera del equipo tras revisarlo; la reserva, finanzas.
   */
  async liberarRetencion(id: string, motivo: string, quien: Actor): Promise<Retencion> {
    const actual = await this.retencion(id);
    const accion =
      actual.tipo === "reserva"
        ? "retenciones.liberar_reserva"
        : "retenciones.liberar_primer_cobro";
    if (!puede(quien.rol, accion)) {
      throw new ForbiddenException(
        actual.tipo === "reserva"
          ? "Liberar una reserva requiere el rol finanzas o super_admin."
          : "Liberar el primer cobro requiere un rol interno."
      );
    }
    try {
      await this.db.execute(
        sql`SELECT evepay.admin_liberar_retencion(${id}::uuid, ${motivo}, ${quien.actor}, ${quien.rol})`
      );
    } catch (error) {
      traducirErrorDeBase(error);
    }
    return this.retencion(id);
  }

  async listarLotes(estado?: EstadoLote, limite = 50): Promise<Lote[]> {
    const filas = await this.db.execute<Record<string, unknown>>(
      sql`SELECT * FROM evepay.admin_listar_lotes(${estado ?? null}, ${limite})`
    );
    return filas.map((f) => this.aLote(f));
  }

  async lote(id: string): Promise<Lote & { items: ItemLote[] }> {
    const [lotes, items] = await Promise.all([
      this.db.execute<Record<string, unknown>>(
        sql`SELECT * FROM evepay.admin_listar_lotes(null, 500) l WHERE l.id = ${id}::uuid`
      ),
      this.db.execute<Record<string, unknown>>(
        sql`SELECT * FROM evepay.admin_lote_items(${id}::uuid)`
      )
    ]);
    const f = lotes[0];
    if (!f) throw new NotFoundException("Lote no encontrado.");
    return {
      ...this.aLote(f),
      items: items.map((i) => ({
        id: String(i.id),
        tipo: String(i.tipo) as ItemLote["tipo"],
        paymentId: texto(i.payment_id),
        referencia: texto(i.reference),
        montoCobroMinor: i.amount_minor == null ? null : Number(i.amount_minor),
        retencionId: texto(i.retencion_id),
        montoMinor: Number(i.monto_minor),
        reservaMinor: Number(i.reserva_minor)
      }))
    };
  }

  async listarRetenciones(tenantId?: string, limite = 100): Promise<Retencion[]> {
    const filas = await this.db.execute<Record<string, unknown>>(
      sql`SELECT * FROM evepay.admin_listar_retenciones(${tenantId ?? null}::uuid, ${limite})`
    );
    return filas.map((f) => this.aRetencion(f));
  }

  async retencion(id: string): Promise<Retencion> {
    const filas = await this.db.execute<Record<string, unknown>>(
      sql`SELECT * FROM evepay.admin_retencion(${id}::uuid)`
    );
    const f = filas[0];
    if (!f) throw new NotFoundException("Retención no encontrada.");
    return this.aRetencion(f);
  }
}
