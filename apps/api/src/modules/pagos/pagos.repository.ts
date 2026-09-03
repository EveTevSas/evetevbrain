import type { Cobro, EstadoCobro, RangoFechas } from "@evetev/shared";

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

/** Resolución de un cobro por el id del proveedor (para webhooks, cross-tenant). */
export interface ResolucionPago {
  paymentId: string;
  tenantId: string;
  estado: EstadoCobro;
}

export interface RegistrarEventoArgs {
  tenantId: string;
  eventId: string;
  provider: string;
  type: string;
  /** A qué cobro se refiere: sin esto no se puede reconstruir su historia. */
  paymentId: string;
}

export interface AplicarTransicionArgs {
  tenantId: string;
  paymentId: string;
  desde: EstadoCobro;
  hacia: EstadoCobro;
  actor: string;
}

/** Resumen de un cobro aprobado, para conciliar contra el proveedor (Fase 4). */
export interface CobroAprobadoResumen {
  paymentId: string;
  providerPaymentId: string;
  montoMinor: number;
}

export interface FiltrosCobros {
  desde?: string;
  hasta?: string;
  estado?: EstadoCobro;
  page: number;
  limit: number;
}

export interface PaginaCobros {
  items: Cobro[];
  total: number;
  page: number;
  limit: number;
}

export interface StatsCobros {
  total: number;
  aprobados: number;
  fallidos: number;
  pendientes: number;
  montoAprobadoMinor: number;
}

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

  // --- Webhooks (Fase 2) ---
  /** Ubica un cobro por el id del proveedor (operación de sistema, cross-tenant). */
  resolverPagoPorProvider(providerPaymentId: string): Promise<ResolucionPago | null>;
  /** Registra un evento; devuelve true si es nuevo, false si ya se había visto. */
  registrarEventoIdempotente(args: RegistrarEventoArgs): Promise<boolean>;
  /** Aplica una transición de estado a un cobro y la audita (acotada al tenant). */
  aplicarTransicion(args: AplicarTransicionArgs): Promise<void>;

  // --- Portal del comercio (Fase 6f) ---
  listar(tenantId: string, filtros: FiltrosCobros): Promise<PaginaCobros>;
  stats(tenantId: string, desde?: string, hasta?: string): Promise<StatsCobros>;

  // --- Conciliación (Fase 4) ---
  /** Cobros en estado `aprobado` creados dentro del rango (para conciliar). */
  listarCobrosAprobados(tenantId: string, rango: RangoFechas): Promise<CobroAprobadoResumen[]>;
}

export const PAGOS_REPOSITORY = Symbol("PAGOS_REPOSITORY");
