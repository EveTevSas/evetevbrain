import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DB, type Db } from "../../database/drizzle";
import { tenants, merchants, merchantApiKeys } from "../../database/schema";
import { generateApiKey } from "../../common/api-key.util";
import { MerchantsService } from "../merchants/merchants.service";

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
    private readonly merchants: MerchantsService
  ) {}

  async crearComercio(input: CrearComercioInput): Promise<ComercioCreado> {
    const inserted = await this.db
      .insert(tenants)
      .values({ legalName: input.legalName, displayName: input.displayName })
      .returning({ id: tenants.id });

    const tenantId = inserted[0]!.id;

    const merchant = await this.merchants.registrar(tenantId, { legalName: input.legalName });

    const live = generateApiKey("live");
    const test = generateApiKey("test");

    await this.db.insert(merchantApiKeys).values([
      { tenantId, keyHash: live.hash, keyPrefix: live.prefix, environment: "live", label: "Producción" },
      { tenantId, keyHash: test.hash, keyPrefix: test.prefix, environment: "test", label: "Sandbox" }
    ]);

    return { tenantId, merchantId: merchant.id, apiKey: live.key, testApiKey: test.key };
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
