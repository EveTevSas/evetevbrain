import type { TarifaComercio, TarifaProveedor } from "@evetev/shared";

/**
 * Persistencia de las tarifas (spec `comisiones`).
 *
 * Las versiones son inmutables y la escritura deja su rastro en la auditoría
 * dentro de la MISMA función de la base: por eso este puerto no recibe un
 * `RastroAdmin` como el de comercios, solo el actor. La base es quien garantiza
 * que no hay tarifa nueva sin registro de quién la puso y qué reemplazó.
 */

/** Una versión de la tarifa del comercio, tal como quedó guardada. */
export interface VersionTarifaComercio extends TarifaComercio {
  id: string;
  vigenteDesde: string;
  creadaPor: string;
  creadaEn: string;
}

/** Una versión de la tarifa del proveedor, tal como quedó guardada. */
export interface VersionTarifaProveedor extends TarifaProveedor {
  id: string;
  provider: string;
  vigenteDesde: string;
  creadaPor: string;
  creadaEn: string;
}

export interface TarifasRepository {
  /** La versión vigente para el comercio, o null si nunca se le asignó una. */
  tarifaVigente(tenantId: string): Promise<VersionTarifaComercio | null>;
  /** La versión vigente del proveedor, o null si nunca se le asignó una. */
  tarifaProveedorVigente(provider: string): Promise<VersionTarifaProveedor | null>;
  /** Agrega una versión. Devuelve su id, o null si el comercio no existe. */
  asignarTarifa(args: {
    tenantId: string;
    tarifa: TarifaComercio;
    actor: string;
  }): Promise<string | null>;
  /** Agrega una versión de la tarifa del proveedor. Devuelve su id. */
  asignarTarifaProveedor(args: {
    provider: string;
    tarifa: TarifaProveedor;
    actor: string;
  }): Promise<string>;
  /** Todas las versiones del comercio, la vigente primero. */
  historialTarifas(tenantId: string): Promise<VersionTarifaComercio[]>;
  /** Todas las versiones del proveedor, la vigente primero. */
  historialTarifasProveedor(provider: string): Promise<VersionTarifaProveedor[]>;
}

export const TARIFAS_REPOSITORY = Symbol("TARIFAS_REPOSITORY");
