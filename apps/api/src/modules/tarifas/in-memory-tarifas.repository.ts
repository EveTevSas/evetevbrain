import { randomUUID } from "node:crypto";
import type { TarifaComercio, TarifaProveedor } from "@evetev/shared";
import type {
  TarifaVigenteDeComercio,
  TarifasRepository,
  VersionTarifaComercio,
  VersionTarifaProveedor
} from "./tarifas.repository";

/**
 * Adaptador en memoria para tests y local sin base. Guarda las versiones tal
 * como lo hace Postgres (append-only, la más reciente es la vigente) y el
 * rastro que allá deja la función SECURITY DEFINER, para que los tests afirmen
 * sobre lo que quedó y no sobre llamadas.
 *
 * `tenants` hace de identity.tenants: asignar a un comercio que no está ahí
 * devuelve null, igual que la base.
 */
export class InMemoryTarifasRepository implements TarifasRepository {
  readonly tenants = new Set<string>();
  readonly comercio: TarifaVigenteDeComercio[] = [];
  readonly proveedor: VersionTarifaProveedor[] = [];
  readonly rastros: { actor: string; accion: string; objetoId: string }[] = [];

  async tarifaVigente(tenantId: string): Promise<VersionTarifaComercio | null> {
    return (await this.historialTarifas(tenantId))[0] ?? null;
  }

  async tarifaProveedorVigente(provider: string): Promise<VersionTarifaProveedor | null> {
    return (await this.historialTarifasProveedor(provider))[0] ?? null;
  }

  async asignarTarifa(args: {
    tenantId: string;
    tarifa: TarifaComercio;
    actor: string;
  }): Promise<string | null> {
    if (!this.tenants.has(args.tenantId)) {
      return null;
    }
    const ahora = new Date().toISOString();
    const version = {
      ...args.tarifa,
      id: randomUUID(),
      tenantId: args.tenantId,
      vigenteDesde: ahora,
      creadaPor: args.actor,
      creadaEn: ahora
    };
    this.comercio.push(version);
    this.rastros.push({ actor: args.actor, accion: "tarifa.asignar", objetoId: args.tenantId });
    return version.id;
  }

  async asignarTarifaProveedor(args: {
    provider: string;
    tarifa: TarifaProveedor;
    actor: string;
  }): Promise<string> {
    const ahora = new Date().toISOString();
    const version = {
      ...args.tarifa,
      id: randomUUID(),
      provider: args.provider,
      vigenteDesde: ahora,
      creadaPor: args.actor,
      creadaEn: ahora
    };
    this.proveedor.push(version);
    this.rastros.push({
      actor: args.actor,
      accion: "tarifa_proveedor.asignar",
      objetoId: args.provider
    });
    return version.id;
  }

  async historialTarifas(tenantId: string): Promise<VersionTarifaComercio[]> {
    return this.comercio
      .filter((v) => v.tenantId === tenantId)
      .slice()
      .reverse()
      .map(({ tenantId: _omitido, ...version }) => version);
  }

  async historialTarifasProveedor(provider: string): Promise<VersionTarifaProveedor[]> {
    return this.proveedor
      .filter((v) => v.provider === provider)
      .slice()
      .reverse();
  }

  async tarifasVigentes(): Promise<TarifaVigenteDeComercio[]> {
    const porTenant = new Map<string, TarifaVigenteDeComercio>();
    for (const v of this.comercio) porTenant.set(v.tenantId, v);
    return [...porTenant.values()];
  }

  async tarifaPorId(id: string): Promise<VersionTarifaComercio | null> {
    const v = this.comercio.find((t) => t.id === id);
    if (!v) return null;
    const { tenantId: _omitido, ...version } = v;
    return version;
  }

  async tarifaProveedorPorId(id: string): Promise<VersionTarifaProveedor | null> {
    return this.proveedor.find((t) => t.id === id) ?? null;
  }
}
