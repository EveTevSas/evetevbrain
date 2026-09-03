import type { ApiKeyEnv } from "../../common/api-key.util";

/**
 * Persistencia de los comercios para la consola.
 *
 * POR QUÉ EXISTE. El resto del núcleo (pagos, ledger, merchants) separa el
 * servicio de su almacenamiento con una interfaz como esta, y por eso se puede
 * probar sin base de datos. El módulo admin se saltó ese patrón y sus servicios
 * hablaban SQL directo: los tests tenían que simular `db.execute` y acababan
 * afirmando sobre el ORDEN de las llamadas ("la primera es el insert, la
 * segunda la lectura"), que se rompe al reordenar aunque nada esté mal.
 *
 * EL RASTRO VIAJA CON LA ESCRITURA. Cada método que escribe recibe su
 * `RastroAdmin` y lo guarda en la MISMA transacción. No es un adorno del
 * contrato: si fueran dos llamadas, un fallo entre ellas dejaría un comercio
 * operable del que nadie puede decir quién lo creó. Poniéndolo en la firma, no
 * hay forma de escribir sin dejar rastro por descuido.
 */

/** Quién hizo qué, para la auditoría inmutable. */
export interface RastroAdmin {
  actor: string;
  accion: string;
  objetoTipo?: string;
  objetoId?: string;
  detalle?: Record<string, unknown>;
}

/** Una clave recién generada, lista para guardar (solo el hash y el prefijo). */
export interface ClaveParaGuardar {
  hash: string;
  prefix: string;
  environment: ApiKeyEnv;
  label: string;
}

/**
 * Fila cruda de las funciones de listado: una por API key, así que un comercio
 * con dos claves llega dos veces. Agruparlas es trabajo del servicio.
 */
export interface FilaComercio extends Record<string, unknown> {
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
}

export interface ComerciosRepository {
  /** Crea el tenant y devuelve su id. */
  crearTenant(legalName: string, displayName: string): Promise<string>;

  existeTenant(tenantId: string): Promise<boolean>;

  /** Emite el par de claves inicial junto con su rastro, en una transacción. */
  emitirClaves(args: {
    tenantId: string;
    claves: ClaveParaGuardar[];
    rastro: RastroAdmin;
  }): Promise<void>;

  /**
   * Revoca las claves activas del entorno y crea la nueva, atómicamente.
   * Devuelve los prefijos revocados. Si quedaran las dos activas, una clave
   * que se creía revocada seguiría cobrando; si se revocara sin crear la
   * nueva, el comercio se queda sin poder cobrar.
   */
  rotarClave(args: {
    tenantId: string;
    environment: ApiKeyEnv;
    nueva: ClaveParaGuardar;
    rastro: RastroAdmin;
  }): Promise<string[]>;

  /** Cambia el estado KYC del merchant, con su rastro. */
  cambiarEstadoMerchant(args: {
    tenantId: string;
    merchantId: string;
    estado: string;
    rastro: RastroAdmin;
  }): Promise<void>;

  /**
   * Cambia el estado del comercio. Devuelve el estado resultante, o null si el
   * comercio no existe.
   */
  cambiarEstadoTenant(args: {
    tenantId: string;
    estado: string;
    rastro: RastroAdmin;
  }): Promise<string | null>;

  listarComercios(): Promise<FilaComercio[]>;

  /** Filas de un comercio concreto; vacío si no existe. */
  obtenerComercio(tenantId: string): Promise<FilaComercio[]>;
}

export const COMERCIOS_REPOSITORY = Symbol("COMERCIOS_REPOSITORY");
