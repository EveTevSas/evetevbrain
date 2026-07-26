import type { EstadoMerchant, Merchant } from "@evetev/shared";

export interface NuevoMerchant {
  tenantId: string;
  legalName: string;
  provider: string;
  providerMerchantId: string;
  estado: EstadoMerchant;
}

export interface ResolucionMerchant {
  merchantId: string;
  tenantId: string;
  estado: EstadoMerchant;
}

export interface MerchantsRepository {
  crear(nuevo: NuevoMerchant): Promise<Merchant>;
  buscar(tenantId: string, merchantId: string): Promise<Merchant | null>;
  /** Resuelve un comercio por su id de proveedor (cross-tenant, para webhook). */
  resolverPorProvider(providerMerchantId: string): Promise<ResolucionMerchant | null>;
  aplicarEstado(tenantId: string, merchantId: string, estado: EstadoMerchant): Promise<void>;
}

export const MERCHANTS_REPOSITORY = Symbol("MERCHANTS_REPOSITORY");
