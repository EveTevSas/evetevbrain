import type { RastroAdmin } from "./comercios.repository";

/**
 * Persistencia del perfil del comercio.
 *
 * Mismo reparto que en comercios: el servicio decide (qué columna lleva cada
 * campo, quién firma la verificación de documentos, qué se puede guardar en el
 * rastro) y esto solo guarda. El rastro viaja con la escritura para que no se
 * pueda cambiar un perfil sin dejar constancia.
 */

/** Perfil y beneficiarios tal como los devuelve la base, en snake_case. */
export interface PerfilGuardado {
  perfil: Record<string, unknown>;
  beneficiarios: Record<string, unknown>[];
}

export interface ResumenPerfil {
  tienePerfil: boolean;
  documento: string | null;
  nombreComercial: string | null;
}

export interface PerfilesRepository {
  /**
   * Crea o reemplaza el perfil completo con sus beneficiarios, y guarda el
   * rastro en la misma transacción. Las columnas llegan ya traducidas a
   * snake_case: traducir es decisión del servicio, no de la base.
   */
  guardar(args: {
    tenantId: string;
    columnas: Record<string, unknown>;
    beneficiarios: Record<string, unknown>[];
    rastro: RastroAdmin;
  }): Promise<void>;

  obtener(tenantId: string): Promise<PerfilGuardado | null>;

  /** Qué comercios tienen perfil y cuáles no, para marcarlo en el listado. */
  resumenPorTenant(): Promise<Map<string, ResumenPerfil>>;

  /** Tenant que ya usa ese documento, o null. */
  buscarPorDocumento(tipoDocumento: string, numeroDocumento: string): Promise<string | null>;
}

export const PERFILES_REPOSITORY = Symbol("PERFILES_REPOSITORY");
