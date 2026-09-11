import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DB, type Db } from "../../database/drizzle";
import { errorDeBase } from "../../database/errores";
import { ProvidersService } from "./providers.service";

/**
 * Custodia del recaudo para la consola (spec `ledger-custodia`, CA-4 a CA-9).
 *
 * Las reglas de dinero viven en la base (migración 0016): la consignación
 * concilia todo o nada dentro de una función SECURITY DEFINER que cruza
 * comercios, y el cuadre y el balance se reconstruyen desde las líneas. Este
 * servicio traduce entre HTTP y esas funciones y convierte sus excepciones en
 * respuestas que operación entiende: el mensaje de la base ya dice qué pasó.
 */

export interface Consignacion {
  id: string;
  provider: string;
  referenciaBancaria: string;
  /** YYYY-MM-DD, la fecha del extracto. */
  fecha: string;
  montoMinor: number;
  nota: string | null;
  cobros: number;
  comercios: number;
  registradaPor: string;
  registradaEn: string;
}

export interface CobroPorConsignar {
  paymentId: string;
  tenantId: string;
  tenantNombre: string;
  referencia: string;
  providerPaymentId: string | null;
  montoMinor: number;
  /** Lo que el proveedor debe por este cobro con la tarifa fijada en él. */
  esperadoMinor: number;
  creadoEn: string;
}

export interface RegistrarConsignacionInput {
  provider: string;
  referenciaBancaria: string;
  fecha: string;
  montoMinor: number;
  paymentIds: string[];
  nota?: string;
}

export interface CuadreCustodia {
  fecha: string;
  saldoLibro: number;
  /** null si nadie registró el saldo del banco para esa fecha. */
  saldoBanco: number | null;
  /** banco − libro; null si no hay saldo registrado. 0 es cuadre. */
  diferencia: number | null;
  registradoPor: string | null;
  registradoEn: string | null;
}

export interface BalanceComercio {
  porPagar: number;
  comision: number;
  ivaPorPagar: number;
  costoProveedor: number;
  margen: number;
  enTransito: number;
  enRecaudo: number;
  porPagarProveedor: number;
}

/**
 * Las funciones de 0016 levantan errores con código y mensaje pensados para
 * la persona que opera: check_violation cuando la consignación no cuadra o
 * trae un cobro que no corresponde, unique_violation cuando la referencia ya
 * existe, no_data_found cuando un cobro no existe. Se devuelven tal cual.
 */
function traducir(error: unknown): never {
  const { code, message } = errorDeBase(error);
  switch (code) {
    case "23514":
      throw new BadRequestException(message);
    case "23505":
      throw new ConflictException(message);
    case "P0002":
      throw new NotFoundException(message);
    default:
      throw error;
  }
}

@Injectable()
export class CustodiaAdminService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly providers: ProvidersService
  ) {}

  /** Cobros aprobados del proveedor que aún no están en ninguna consignación. */
  async cobrosPorConsignar(provider: string): Promise<CobroPorConsignar[]> {
    this.exigirProveedorConocido(provider);
    const filas = await this.db.execute<Record<string, unknown>>(
      sql`SELECT * FROM evepay.admin_cobros_por_consignar(${provider})`
    );
    return filas.map((f) => ({
      paymentId: String(f.payment_id),
      tenantId: String(f.tenant_id),
      tenantNombre: String(f.tenant_nombre),
      referencia: String(f.reference),
      providerPaymentId: f.provider_payment_id ? String(f.provider_payment_id) : null,
      montoMinor: Number(f.amount_minor),
      esperadoMinor: Number(f.esperado_minor),
      creadoEn: new Date(String(f.created_at)).toISOString()
    }));
  }

  /**
   * Registra la consignación: la base concilia los cobros, asienta y audita en
   * una sola transacción, o rechaza todo con un mensaje concreto (CA-4 a CA-7).
   */
  async registrarConsignacion(
    input: RegistrarConsignacionInput,
    actor: string
  ): Promise<{ id: string } & RegistrarConsignacionInput> {
    this.exigirProveedorConocido(input.provider);
    try {
      const filas = await this.db.execute<{ admin_registrar_consignacion: string }>(sql`
        SELECT evepay.admin_registrar_consignacion(
          ${input.provider},
          ${input.referenciaBancaria},
          ${input.fecha}::date,
          ${input.montoMinor}::bigint,
          string_to_array(${input.paymentIds.join(",")}, ',')::uuid[],
          ${actor},
          ${input.nota ?? null}
        )
      `);
      const id = filas[0]?.admin_registrar_consignacion;
      if (!id) {
        throw new Error("La base no devolvió el id de la consignación.");
      }
      return { id, ...input };
    } catch (error) {
      traducir(error);
    }
  }

  async listarConsignaciones(limite = 50): Promise<Consignacion[]> {
    const filas = await this.db.execute<Record<string, unknown>>(
      sql`SELECT * FROM evepay.admin_listar_consignaciones(${limite})`
    );
    return filas.map((f) => ({
      id: String(f.id),
      provider: String(f.provider),
      referenciaBancaria: String(f.referencia_bancaria),
      fecha: String(f.fecha).slice(0, 10),
      montoMinor: Number(f.monto_minor),
      nota: f.nota ? String(f.nota) : null,
      cobros: Number(f.cobros),
      comercios: Number(f.comercios),
      registradaPor: String(f.registrada_por),
      registradaEn: new Date(String(f.registrada_en)).toISOString()
    }));
  }

  /** El saldo real de la cuenta de recaudo a una fecha, tomado del extracto (CA-8). */
  async registrarSaldoRecaudo(
    input: { fecha: string; saldoMinor: number; nota?: string },
    actor: string
  ): Promise<{ id: string; cuadre: CuadreCustodia }> {
    const filas = await this.db.execute<{ admin_registrar_saldo_recaudo: string }>(sql`
      SELECT evepay.admin_registrar_saldo_recaudo(
        ${input.fecha}::date, ${input.saldoMinor}::bigint, ${actor}, ${input.nota ?? null}
      )
    `);
    const id = filas[0]?.admin_registrar_saldo_recaudo;
    if (!id) {
      throw new Error("La base no devolvió el id del saldo.");
    }
    return { id, cuadre: await this.cuadreCustodia(input.fecha) };
  }

  /** Libro vs banco al cierre de la fecha (CA-8). Sin fecha, hoy. */
  async cuadreCustodia(fecha?: string): Promise<CuadreCustodia> {
    const filas = await this.db.execute<Record<string, unknown>>(
      fecha
        ? sql`SELECT * FROM evepay.admin_cuadre_custodia(${fecha}::date)`
        : sql`SELECT * FROM evepay.admin_cuadre_custodia()`
    );
    const f = filas[0];
    if (!f) {
      throw new Error("La base no devolvió el cuadre de custodia.");
    }
    return {
      fecha: String(f.fecha).slice(0, 10),
      saldoLibro: Number(f.saldo_libro),
      saldoBanco: f.saldo_banco == null ? null : Number(f.saldo_banco),
      diferencia: f.diferencia == null ? null : Number(f.diferencia),
      registradoPor: f.registrado_por ? String(f.registrado_por) : null,
      registradoEn: f.registrado_en ? new Date(String(f.registrado_en)).toISOString() : null
    };
  }

  /** Balance del comercio con el signo de la naturaleza de cada cuenta (CA-9). */
  async balanceComercio(tenantId: string): Promise<BalanceComercio> {
    const filas = await this.db.execute<Record<string, unknown>>(
      sql`SELECT * FROM evepay.admin_balance_comercio(${tenantId}::uuid)`
    );
    const f = filas[0] ?? {};
    return {
      porPagar: Number(f.por_pagar ?? 0),
      comision: Number(f.comision ?? 0),
      ivaPorPagar: Number(f.iva_por_pagar ?? 0),
      costoProveedor: Number(f.costo_proveedor ?? 0),
      margen: Number(f.margen ?? 0),
      enTransito: Number(f.en_transito ?? 0),
      enRecaudo: Number(f.en_recaudo ?? 0),
      porPagarProveedor: Number(f.por_pagar_proveedor ?? 0)
    };
  }

  private exigirProveedorConocido(provider: string): void {
    const conocidos = this.providers.estado().proveedores.map((p) => p.nombre);
    if (!conocidos.includes(provider)) {
      throw new NotFoundException(
        `El proveedor "${provider}" no existe. Los conocidos son: ${conocidos.join(", ")}.`
      );
    }
  }
}
