import { randomUUID } from "node:crypto";
import type { EstadoMerchant, Merchant } from "@evetev/shared";
import {
  type MerchantsRepository,
  type NuevoMerchant,
  type ResolucionMerchant
} from "./merchants.repository";

interface Row extends NuevoMerchant {
  id: string;
  creadoEn: string;
}

/** Adaptador in-memory de merchants (tests/local). */
export class InMemoryMerchantsRepository implements MerchantsRepository {
  readonly merchants = new Map<string, Row>();

  private aMerchant(row: Row): Merchant {
    return { id: row.id, legalName: row.legalName, estado: row.estado, creadoEn: row.creadoEn };
  }

  async crear(nuevo: NuevoMerchant): Promise<Merchant> {
    const row: Row = { ...nuevo, id: randomUUID(), creadoEn: new Date().toISOString() };
    this.merchants.set(row.id, row);
    return this.aMerchant(row);
  }

  async buscarPorTenant(tenantId: string): Promise<Merchant | null> {
    for (const row of this.merchants.values()) {
      if (row.tenantId === tenantId) return this.aMerchant(row);
    }
    return null;
  }

  async buscar(tenantId: string, merchantId: string): Promise<Merchant | null> {
    const row = this.merchants.get(merchantId);
    if (!row || row.tenantId !== tenantId) {
      return null;
    }
    return this.aMerchant(row);
  }

  async resolverPorProvider(providerMerchantId: string): Promise<ResolucionMerchant | null> {
    for (const row of this.merchants.values()) {
      if (row.providerMerchantId === providerMerchantId) {
        return { merchantId: row.id, tenantId: row.tenantId, estado: row.estado };
      }
    }
    return null;
  }

  async aplicarEstado(
    tenantId: string,
    merchantId: string,
    estado: EstadoMerchant
  ): Promise<void> {
    const row = this.merchants.get(merchantId);
    if (row && row.tenantId === tenantId) {
      row.estado = estado;
    }
  }
}
