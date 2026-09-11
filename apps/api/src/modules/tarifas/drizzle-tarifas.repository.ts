import { sql } from "drizzle-orm";
import type { IvaBps, TarifaComercio, TarifaProveedor } from "@evetev/shared";
import type { Db } from "../../database/drizzle";
import type {
  TarifasRepository,
  VersionTarifaComercio,
  VersionTarifaProveedor
} from "./tarifas.repository";

/** Fila de tarifa_vigente / admin_historial_tarifas (migración 0015). */
interface FilaTarifaComercio extends Record<string, unknown> {
  id: string;
  bps: number;
  fijo_minor: string | number;
  iva_bps: number;
  vigente_desde: string;
  creada_por: string;
  creada_en: string;
}

/** Fila de tarifa_proveedor_vigente / admin_historial_tarifas_proveedor. */
interface FilaTarifaProveedor extends Record<string, unknown> {
  id: string;
  provider: string;
  bps: number;
  fijo_minor: string | number;
  descuenta_en_consignacion: boolean;
  vigente_desde: string;
  creada_por: string;
  creada_en: string;
}

/**
 * Adaptador sobre Postgres. Todo pasa por las funciones SECURITY DEFINER de la
 * migración 0015: las tablas no admiten escritura directa y la del proveedor
 * ni lectura. `fijo_minor` es bigint y llega como texto; se convierte aquí.
 */
export class DrizzleTarifasRepository implements TarifasRepository {
  constructor(private readonly db: Db) {}

  private aComercio(f: FilaTarifaComercio): VersionTarifaComercio {
    return {
      id: f.id,
      bps: Number(f.bps),
      fijoMinor: Number(f.fijo_minor),
      ivaBps: Number(f.iva_bps) as IvaBps,
      vigenteDesde: new Date(f.vigente_desde).toISOString(),
      creadaPor: f.creada_por,
      creadaEn: new Date(f.creada_en).toISOString()
    };
  }

  private aProveedor(f: FilaTarifaProveedor): VersionTarifaProveedor {
    return {
      id: f.id,
      provider: f.provider,
      bps: Number(f.bps),
      fijoMinor: Number(f.fijo_minor),
      descuentaEnConsignacion: f.descuenta_en_consignacion,
      vigenteDesde: new Date(f.vigente_desde).toISOString(),
      creadaPor: f.creada_por,
      creadaEn: new Date(f.creada_en).toISOString()
    };
  }

  async tarifaVigente(tenantId: string): Promise<VersionTarifaComercio | null> {
    const filas = await this.db.execute<FilaTarifaComercio>(
      sql`SELECT * FROM evepay.tarifa_vigente(${tenantId}::uuid)`
    );
    return filas[0] ? this.aComercio(filas[0]) : null;
  }

  async tarifaProveedorVigente(provider: string): Promise<VersionTarifaProveedor | null> {
    const filas = await this.db.execute<FilaTarifaProveedor>(
      sql`SELECT * FROM evepay.tarifa_proveedor_vigente(${provider})`
    );
    return filas[0] ? this.aProveedor(filas[0]) : null;
  }

  async asignarTarifa(args: {
    tenantId: string;
    tarifa: TarifaComercio;
    actor: string;
  }): Promise<string | null> {
    try {
      const filas = await this.db.execute<{ admin_asignar_tarifa: string }>(sql`
        SELECT evepay.admin_asignar_tarifa(
          ${args.tenantId}::uuid,
          ${args.tarifa.bps}::int,
          ${args.tarifa.fijoMinor}::bigint,
          ${args.tarifa.ivaBps}::int,
          ${args.actor}
        )
      `);
      return filas[0]?.admin_asignar_tarifa ?? null;
    } catch (error) {
      // P0002 = no_data_found: la función avisa que el comercio no existe.
      if ((error as { code?: string }).code === "P0002") {
        return null;
      }
      throw error;
    }
  }

  async asignarTarifaProveedor(args: {
    provider: string;
    tarifa: TarifaProveedor;
    actor: string;
  }): Promise<string> {
    const filas = await this.db.execute<{ admin_asignar_tarifa_proveedor: string }>(sql`
      SELECT evepay.admin_asignar_tarifa_proveedor(
        ${args.provider},
        ${args.tarifa.bps}::int,
        ${args.tarifa.fijoMinor}::bigint,
        ${args.tarifa.descuentaEnConsignacion},
        ${args.actor}
      )
    `);
    const id = filas[0]?.admin_asignar_tarifa_proveedor;
    if (!id) {
      throw new Error("La base no devolvió el id de la tarifa del proveedor.");
    }
    return id;
  }

  async historialTarifas(tenantId: string): Promise<VersionTarifaComercio[]> {
    const filas = await this.db.execute<FilaTarifaComercio>(
      sql`SELECT * FROM evepay.admin_historial_tarifas(${tenantId}::uuid)`
    );
    return filas.map((f) => this.aComercio(f));
  }

  async historialTarifasProveedor(provider: string): Promise<VersionTarifaProveedor[]> {
    const filas = await this.db.execute<FilaTarifaProveedor>(
      sql`SELECT * FROM evepay.admin_historial_tarifas_proveedor(${provider})`
    );
    return filas.map((f) => this.aProveedor(f));
  }
}
