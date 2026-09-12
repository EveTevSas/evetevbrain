import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../../database/drizzle";
import { merchantApiKeys, merchants } from "../../database/schema";
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
 * ver las filas del comercio, y guarda el rastro dentro de la misma. Lo que
 * toca identity.tenants va por las funciones SECURITY DEFINER de 0018: desde
 * la Fase 8 la tabla tiene RLS y la consola, que cruza comercios, no la ve
 * directo.
 */
export class DrizzleComerciosRepository implements ComerciosRepository {
  constructor(
    private readonly db: Db,
    private readonly auditoria: AdminAuditService
  ) {}

  async crearTenant(legalName: string, displayName: string): Promise<string> {
    const filas = await this.db.execute<{ admin_crear_tenant: string }>(
      sql`SELECT identity.admin_crear_tenant(${legalName}, ${displayName})`
    );
    const id = filas[0]?.admin_crear_tenant;
    if (!id) throw new Error("La base no devolvió el id del comercio creado.");
    return id;
  }

  async existeTenant(tenantId: string): Promise<boolean> {
    const filas = await this.db.execute<{ admin_tenant_existe: boolean }>(
      sql`SELECT identity.admin_tenant_existe(${tenantId}::uuid)`
    );
    return Boolean(filas[0]?.admin_tenant_existe);
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
      const filas = await tx.execute<{ admin_cambiar_estado_tenant: string | null }>(
        sql`SELECT identity.admin_cambiar_estado_tenant(${args.tenantId}::uuid, ${args.estado})`
      );
      const estado = filas[0]?.admin_cambiar_estado_tenant ?? null;
      if (estado === null) {
        return null;
      }
      await this.auditoria.registrarEn(tx, args.rastro);
      return estado;
    });
  }

  async renombrarTenant(args: {
    tenantId: string;
    legalName: string;
    displayName: string;
    rastro: RastroAdmin;
  }): Promise<{ legalName: string; displayName: string } | null> {
    return this.db.transaction(async (tx) => {
      /* La función devuelve los nombres de antes, leídos con bloqueo en la
         misma transacción, para que el rastro diga exactamente qué se
         reemplazó aunque dos personas editen el mismo comercio a la vez. */
      const antes = await tx.execute<{ legal_name: string; display_name: string }>(
        sql`SELECT * FROM identity.admin_renombrar_tenant(${args.tenantId}::uuid, ${args.legalName}, ${args.displayName})`
      );
      const previo = antes[0];
      if (!previo) {
        return null;
      }

      await this.auditoria.registrarEn(tx, {
        ...args.rastro,
        detalle: {
          ...args.rastro.detalle,
          antes: { legalName: previo.legal_name, displayName: previo.display_name }
        }
      });

      return { legalName: args.legalName, displayName: args.displayName };
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
