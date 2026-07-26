import type { Cobro, EstadoCobro } from "@evetev/shared";

/** Datos para persistir un cobro nuevo (representación interna). */
export interface NuevoCobro {
  tenantId: string;
  merchantId: string;
  amountMinor: number;
  currency: string;
  reference: string;
  description?: string;
  estado: EstadoCobro;
  provider: string;
  providerPaymentId: string;
  checkoutUrl?: string;
}

export interface IdempotencyHit {
  paymentId: string;
  requestHash: string;
}

export interface CrearConIdempotenciaArgs {
  nuevo: NuevoCobro;
  idempotencyKey: string;
  requestHash: string;
  actor: string;
}

/** `creado:false` → otra transacción ganó la carrera con la misma clave. */
export type CrearResultado = { creado: true; cobro: Cobro } | { creado: false };

/**
 * Puerto de persistencia de pagos. Dos adaptadores: in-memory (tests/local) y
 * Drizzle/Postgres (Supabase). Todas las operaciones están acotadas por tenant
 * (aislamiento §4).
 */
export interface PagosRepository {
  buscarIdempotencia(tenantId: string, idempotencyKey: string): Promise<IdempotencyHit | null>;
  buscarCobro(tenantId: string, cobroId: string): Promise<Cobro | null>;
  /**
   * Inserta cobro + registro de idempotencia + auditoría de forma atómica.
   * La unicidad (tenant_id, idempotency_key) la garantiza el almacenamiento:
   * si ya existe, devuelve `{ creado: false }` sin insertar (criterio EARS 7).
   */
  crearConIdempotencia(args: CrearConIdempotenciaArgs): Promise<CrearResultado>;
  /** Solo para verificación de aislamiento por tenant. */
  contarPorTenant(tenantId: string): Promise<number>;
}

export const PAGOS_REPOSITORY = Symbol("PAGOS_REPOSITORY");
