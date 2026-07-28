import { Inject, Injectable } from "@nestjs/common";
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

/**
 * Onboarding completo de un comercio nuevo (uso exclusivo de Evetev).
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
    // 1. Crear el tenant en identity.tenants.
    const inserted = await this.db
      .insert(tenants)
      .values({ legalName: input.legalName, displayName: input.displayName })
      .returning({ id: tenants.id });

    const tenantId = inserted[0]!.id;

    // 2. Registrar el merchant (llama a Akua si PAYMENT_PROVIDER=akua).
    const merchant = await this.merchants.registrar(tenantId, { legalName: input.legalName });

    // 3. Generar dos API keys: live + test.
    const live = generateApiKey("live");
    const test = generateApiKey("test");

    await this.db.insert(merchantApiKeys).values([
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

    return {
      tenantId,
      merchantId: merchant.id,
      apiKey: live.key,
      testApiKey: test.key
    };
  }
}
