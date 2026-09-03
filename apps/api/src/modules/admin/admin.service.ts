import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { DB, type Db } from "../../database/drizzle";
import { merchants, tenants, merchantApiKeys } from "../../database/schema";
import { generateApiKey, type ApiKeyEnv } from "../../common/api-key.util";
import type { EstadoMerchant } from "@evetev/shared";
import { MerchantsService } from "../merchants/merchants.service";
import { AdminAuditService } from "./admin-audit.service";

export interface CrearComercioInput {
  legalName: string;
  displayName: string;
}

export interface ComercioCreado {
  tenantId: string;
  merchantId: string;
  /** API key de producción — mostrar UNA SOLA VEZ. */
  apiKey: string;
  /** API key de sandbox — mostrar UNA SOLA VEZ. */
  testApiKey: string;
  /** Gestión que queda pendiente en el panel del proveedor, o null (CA-8). */
  pasoManualProveedor: string | null;
}

export interface ApiKeyRotada {
  tenantId: string;
  environment: ApiKeyEnv;
  /** La clave nueva — mostrar UNA SOLA VEZ. */
  apiKey: string;
  prefix: string;
  /** Cuántas claves quedaron desactivadas al rotar. */
  desactivadas: number;
}

export interface ApiKeyResumen {
  prefix: string;
  environment: string;
  activa: boolean;
}

export interface ComercioListado {
  tenantId: string;
  legalName: string;
  displayName: string;
  estado: string;
  creadoEn: string;
  merchantId?: string;
  merchantEstado?: string;
  apiKeys: ApiKeyResumen[];
}

/**
 * Onboarding y listado de comercios (uso exclusivo de Evetev).
 * Crea el tenant, registra el merchant en EvePay (y en Akua si está activo),
 * y genera las dos API keys (live + test). Las claves se muestran una sola vez.
 */
@Injectable()
export class AdminService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly merchants: MerchantsService,
    private readonly auditoria: AdminAuditService
  ) {}

  async crearComercio(input: CrearComercioInput, actor: string): Promise<ComercioCreado> {
    const inserted = await this.db
      .insert(tenants)
      .values({ legalName: input.legalName, displayName: input.displayName })
      .returning({ id: tenants.id });

    const tenantId = inserted[0]!.id;

    const { merchant, pasoManualProveedor } = await this.merchants.registrar(tenantId, {
      legalName: input.legalName
    });

    const live = generateApiKey("live");
    const test = generateApiKey("test");

    // Las claves y su rastro entran en la MISMA transacción: si la auditoría
    // falla, no queda un comercio operable sin registro de quién lo creó (CA-5).
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
      await tx.insert(merchantApiKeys).values([
        {
          tenantId,
          keyHash: live.hash,
          keyPrefix: live.prefix,
          environment: "live",
          label: "Producción"
        },
        {
          tenantId,
          keyHash: test.hash,
          keyPrefix: test.prefix,
          environment: "test",
          label: "Sandbox"
        }
      ]);
      await this.auditoria.registrarEn(tx, {
        actor,
        accion: "comercio.crear",
        objetoTipo: "tenant",
        objetoId: tenantId,
        // Prefijos, nunca las claves: el detalle se guarda para siempre.
        detalle: {
          legalName: input.legalName,
          displayName: input.displayName,
          merchantId: merchant.id,
          clavePrefijoLive: live.prefix,
          clavePrefijoTest: test.prefix,
          pasoManualProveedor
        }
      });
    });

    return {
      tenantId,
      merchantId: merchant.id,
      apiKey: live.key,
      testApiKey: test.key,
      pasoManualProveedor
    };
  }

  /**
   * Rota la API key de un entorno: crea la nueva y desactiva las anteriores en
   * una sola transacción (CA-9). Atómico a propósito — si quedaran las dos
   * activas, una clave que se creía revocada seguiría cobrando; y si se
   * desactivara sin crear la nueva, el comercio se queda sin poder cobrar.
   */
  async rotarApiKey(
    tenantId: string,
    environment: ApiKeyEnv,
    actor: string
  ): Promise<ApiKeyRotada> {
    const existe = await this.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, tenantId));
    if (existe.length === 0) {
      throw new NotFoundException("Comercio no encontrado.");
    }

    const nueva = generateApiKey(environment);

    const desactivadas = await this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);

      const revocadas = await tx
        .update(merchantApiKeys)
        .set({ activa: false })
        .where(
          and(
            eq(merchantApiKeys.tenantId, tenantId),
            eq(merchantApiKeys.environment, environment),
            eq(merchantApiKeys.activa, true)
          )
        )
        .returning({ prefix: merchantApiKeys.keyPrefix });

      await tx.insert(merchantApiKeys).values({
        tenantId,
        keyHash: nueva.hash,
        keyPrefix: nueva.prefix,
        environment,
        label: environment === "live" ? "Producción" : "Sandbox"
      });

      await this.auditoria.registrarEn(tx, {
        actor,
        accion: "api_key.rotar",
        objetoTipo: "tenant",
        objetoId: tenantId,
        detalle: {
          environment,
          prefijoNuevo: nueva.prefix,
          prefijosRevocados: revocadas.map((r) => r.prefix)
        }
      });

      return revocadas.length;
    });

    return {
      tenantId,
      environment,
      apiKey: nueva.key,
      prefix: nueva.prefix,
      desactivadas
    };
  }

  /**
   * Aprueba o rechaza el KYC de un comercio a mano (CA-22).
   *
   * Con Akua el estado lo movía su webhook. Con un proveedor agregador no
   * llega ningún evento —el alta en su panel es manual y EvePay no se entera—,
   * así que sin esto un comercio se quedaba en `en_revision` para siempre y,
   * desde que cobrar exige estar aprobado, no podría cobrar nunca.
   *
   * Se permite mover el estado en cualquier dirección, incluso deshacer un
   * rechazo. La alternativa —que rechazar fuera definitivo— convertiría un
   * clic equivocado en tener que recrear el comercio, perdiendo su historial
   * y sus claves. Queda auditado, que es la garantía que importa aquí.
   */
  async cambiarEstadoKyc(
    tenantId: string,
    estado: EstadoMerchant,
    actor: string
  ): Promise<{ tenantId: string; merchantId: string; estado: EstadoMerchant }> {
    const merchant = await this.merchants.obtenerPorTenant(tenantId);
    if (!merchant) {
      throw new NotFoundException("Este comercio no tiene un merchant registrado.");
    }

    return this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
      await tx
        .update(merchants)
        .set({ status: estado })
        .where(and(eq(merchants.tenantId, tenantId), eq(merchants.id, merchant.id)));

      await this.auditoria.registrarEn(tx, {
        actor,
        accion: estado === "aprobado" ? "comercio.kyc.aprobar" : "comercio.kyc.rechazar",
        objetoTipo: "merchant",
        objetoId: merchant.id,
        detalle: { tenantId, estadoAnterior: merchant.estado, estado }
      });

      return { tenantId, merchantId: merchant.id, estado };
    });
  }

  /**
   * Activa o desactiva un comercio (CA-10). Desactivar NO borra nada: su
   * historial y su ledger siguen consultables, porque son la contabilidad de
   * dinero que ya se movió.
   */
  async cambiarEstadoComercio(
    tenantId: string,
    activo: boolean,
    actor: string
  ): Promise<{ tenantId: string; estado: string }> {
    const estado = activo ? "activo" : "inactivo";

    const estadoFinal = await this.db.transaction(async (tx) => {
      const actualizado = await tx
        .update(tenants)
        .set({ status: estado, updatedAt: new Date() })
        .where(eq(tenants.id, tenantId))
        .returning({ status: tenants.status });

      if (actualizado.length === 0) {
        throw new NotFoundException("Comercio no encontrado.");
      }

      await this.auditoria.registrarEn(tx, {
        actor,
        accion: activo ? "comercio.activar" : "comercio.desactivar",
        objetoTipo: "tenant",
        objetoId: tenantId,
        detalle: { estado }
      });

      return actualizado[0]!.status;
    });

    return { tenantId, estado: estadoFinal };
  }

  /** Lista todos los comercios (cross-tenant via SECURITY DEFINER). */
  async listarComercios(): Promise<ComercioListado[]> {
    const rows = await this.db.execute<{
      tenant_id: string;
      legal_name: string;
      display_name: string;
      tenant_status: string;
      creado_en: string;
      merchant_id: string | null;
      merchant_status: string | null;
      key_prefix: string | null;
      key_environment: string | null;
      key_activa: boolean | null;
    }>(sql`SELECT * FROM identity.admin_listar_comercios()`);

    const map = new Map<string, ComercioListado>();
    for (const row of rows) {
      if (!map.has(row.tenant_id)) {
        map.set(row.tenant_id, {
          tenantId: row.tenant_id,
          legalName: row.legal_name,
          displayName: row.display_name,
          estado: row.tenant_status,
          creadoEn: row.creado_en,
          merchantId: row.merchant_id ?? undefined,
          merchantEstado: row.merchant_status ?? undefined,
          apiKeys: []
        });
      }
      if (row.key_prefix) {
        map.get(row.tenant_id)!.apiKeys.push({
          prefix: row.key_prefix,
          environment: row.key_environment ?? "live",
          activa: row.key_activa ?? false
        });
      }
    }
    return Array.from(map.values());
  }
}
