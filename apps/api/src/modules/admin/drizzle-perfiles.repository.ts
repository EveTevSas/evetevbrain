import { sql } from "drizzle-orm";
import type { Db } from "../../database/drizzle";
import { AdminAuditService } from "./admin-audit.service";
import type { RastroAdmin } from "./comercios.repository";
import type { PerfilGuardado, PerfilesRepository, ResumenPerfil } from "./perfiles.repository";

/**
 * Adaptador sobre Postgres. Todo pasa por las funciones SECURITY DEFINER de la
 * migración 0012: las tablas del perfil tienen RLS sin políticas, así que no
 * hay otro camino. Son datos de operación cross-tenant, no del comercio.
 */
export class DrizzlePerfilesRepository implements PerfilesRepository {
  constructor(
    private readonly db: Db,
    private readonly auditoria: AdminAuditService
  ) {}

  async guardar(args: {
    tenantId: string;
    columnas: Record<string, unknown>;
    beneficiarios: Record<string, unknown>[];
    rastro: RastroAdmin;
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`
        SELECT identity.admin_guardar_perfil_comercio(
          ${args.tenantId}::uuid,
          ${JSON.stringify(args.columnas)}::jsonb,
          ${JSON.stringify(args.beneficiarios)}::jsonb
        )
      `);
      await this.auditoria.registrarEn(tx, args.rastro);
    });
  }

  async obtener(tenantId: string): Promise<PerfilGuardado | null> {
    const filas = await this.db.execute<{
      perfil: Record<string, unknown>;
      beneficiarios: Record<string, unknown>[];
    }>(sql`SELECT * FROM identity.admin_perfil_comercio(${tenantId}::uuid)`);

    const fila = filas[0];
    if (!fila) return null;
    return { perfil: fila.perfil, beneficiarios: fila.beneficiarios ?? [] };
  }

  async resumenPorTenant(): Promise<Map<string, ResumenPerfil>> {
    const filas = await this.db.execute<{
      tenant_id: string;
      tiene_perfil: boolean;
      documento: string | null;
      nombre_comercial: string | null;
    }>(sql`SELECT * FROM identity.admin_comercios_con_perfil()`);

    return new Map(
      filas.map((f) => [
        f.tenant_id,
        {
          tienePerfil: f.tiene_perfil,
          documento: f.documento,
          nombreComercial: f.nombre_comercial
        }
      ])
    );
  }

  async buscarPorDocumento(tipoDocumento: string, numeroDocumento: string): Promise<string | null> {
    const filas = await this.db.execute<{ tenant_id: string }>(sql`
      SELECT tenant_id FROM identity.admin_buscar_por_documento(
        ${tipoDocumento}, ${numeroDocumento}
      )
    `);
    return filas[0]?.tenant_id ?? null;
  }
}
