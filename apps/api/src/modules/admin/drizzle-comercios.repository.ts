import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../../database/drizzle";
import { merchantApiKeys, merchants, tenants } from "../../database/schema";
import { AdminAuditService } from "./admin-audit.service";
import type {
  ClaveParaGuardar,
  ComerciosRepository,
  FilaComercio,
  RastroAdmin
} from "./comercios.repository";

/**
 * Adaptador sobre Postgres. Es el ÚNICO archivo del módulo que sabe SQL de
 * comercios; el servicio decide y este guarda.
 *
 * Cada escritura abre su transacción, fija `app.tenant_id` para que RLS deje
 * ver las filas del comercio, y guarda el rastro dentro de la misma.
 */
export class DrizzleComerciosRepository implements ComerciosRepository {
  constructor(
    private readonly db: Db,
    private readonly auditoria: AdminAuditService
  ) {}

  async crearTenant(legalName: string, displayName: string): Promise<string> {
    const filas = await this.db
      .insert(tenants)
      .values({ legalName, displayName })
      .returning({ id: tenants.id });
    return filas[0]!.id;
  }

  async existeTenant(tenantId: string): Promise<boolean> {
    const filas = await this.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, tenantId));
    return filas.length > 0;
  }

  async emitirClaves(args: {
    tenantId: string;
    claves: ClaveParaGuardar[];
    rastro: RastroAdmin;
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${args.tenantId}, true)`);
      await tx.insert(merchantApiKeys).values(
        args.claves.map((c) => ({
          tenantId: args.tenantId,
          keyHash: c.hash,
          keyPrefix: c.prefix,
          environment: c.environment,
          label: c.label
        }))
      );
      await this.auditoria.registrarEn(tx, args.rastro);
    });
  }

  async rotarClave(args: {
    tenantId: string;
    environment: ClaveParaGuardar["environment"];
    nueva: ClaveParaGuardar;
    rastro: RastroAdmin;
  }): Promise<string[]> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${args.tenantId}, true)`);

      const revocadas = await tx
        .update(merchantApiKeys)
        .set({ activa: false })
        .where(
          and(
            eq(merchantApiKeys.tenantId, args.tenantId),
            eq(merchantApiKeys.environment, args.environment),
            eq(merchantApiKeys.activa, true)
          )
        )
        .returning({ prefix: merchantApiKeys.keyPrefix });

      await tx.insert(merchantApiKeys).values({
        tenantId: args.tenantId,
        keyHash: args.nueva.hash,
        keyPrefix: args.nueva.prefix,
        environment: args.nueva.environment,
        label: args.nueva.label
      });

      const prefijosRevocados = revocadas.map((r) => r.prefix);

      /* Qué claves quedaron revocadas solo se sabe al hacerlo, así que el
         rastro se completa aquí y no en el servicio. Es el dato que responde
         "¿esta clave que dejó de funcionar, cuándo se revocó y por quién?". */
      await this.auditoria.registrarEn(tx, {
        ...args.rastro,
        detalle: { ...args.rastro.detalle, prefijosRevocados }
      });

      return prefijosRevocados;
    });
  }

  async cambiarEstadoMerchant(args: {
    tenantId: string;
    merchantId: string;
    estado: string;
    rastro: RastroAdmin;
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${args.tenantId}, true)`);
      await tx
        .update(merchants)
        .set({ status: args.estado })
        .where(and(eq(merchants.tenantId, args.tenantId), eq(merchants.id, args.merchantId)));
      await this.auditoria.registrarEn(tx, args.rastro);
    });
  }

  async cambiarEstadoTenant(args: {
    tenantId: string;
    estado: string;
    rastro: RastroAdmin;
  }): Promise<string | null> {
    return this.db.transaction(async (tx) => {
      const actualizado = await tx
        .update(tenants)
        .set({ status: args.estado, updatedAt: new Date() })
        .where(eq(tenants.id, args.tenantId))
        .returning({ status: tenants.status });

      if (actualizado.length === 0) {
        return null;
      }

      await this.auditoria.registrarEn(tx, args.rastro);
      return actualizado[0]!.status;
    });
  }

  async listarComercios(): Promise<FilaComercio[]> {
    return this.db.execute<FilaComercio>(sql`SELECT * FROM identity.admin_listar_comercios()`);
  }

  async obtenerComercio(tenantId: string): Promise<FilaComercio[]> {
    return this.db.execute<FilaComercio>(
      sql`SELECT * FROM identity.admin_comercio(${tenantId}::uuid)`
    );
  }
}
