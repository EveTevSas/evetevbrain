import { randomUUID } from "node:crypto";
import type { Cobro } from "@evetev/shared";
import {
  type CrearConIdempotenciaArgs,
  type CrearResultado,
  type IdempotencyHit,
  type NuevoCobro,
  type PagosRepository
} from "./pagos.repository";

interface FilaCobro extends NuevoCobro {
  id: string;
  creadoEn: string;
}

interface AuditRow {
  tenantId: string;
  paymentId: string;
  fromStatus: string | null;
  toStatus: string;
  actor: string;
  at: string;
}

/**
 * Adaptador in-memory. Replica el aislamiento por tenant (RLS) filtrando por
 * tenantId en cada lectura y la unicidad (tenant_id, idempotency_key) con un Map.
 * Se usa en tests y en local cuando no hay DATABASE_URL.
 */
export class InMemoryPagosRepository implements PagosRepository {
  private readonly pagos = new Map<string, FilaCobro>(); // id -> fila
  private readonly idempotencia = new Map<string, IdempotencyHit>(); // `${tenant}:${key}`
  readonly auditoria: AuditRow[] = [];

  private key(tenantId: string, idempotencyKey: string): string {
    return `${tenantId}:${idempotencyKey}`;
  }

  private aCobro(fila: FilaCobro): Cobro {
    return {
      id: fila.id,
      merchantId: fila.merchantId,
      montoMinor: fila.amountMinor,
      moneda: fila.currency as Cobro["moneda"],
      referencia: fila.reference,
      estado: fila.estado,
      checkoutUrl: fila.checkoutUrl,
      creadoEn: fila.creadoEn
    };
  }

  async buscarIdempotencia(
    tenantId: string,
    idempotencyKey: string
  ): Promise<IdempotencyHit | null> {
    return this.idempotencia.get(this.key(tenantId, idempotencyKey)) ?? null;
  }

  async buscarCobro(tenantId: string, cobroId: string): Promise<Cobro | null> {
    const fila = this.pagos.get(cobroId);
    // Aislamiento: nunca devolver un cobro de otro tenant.
    if (!fila || fila.tenantId !== tenantId) {
      return null;
    }
    return this.aCobro(fila);
  }

  async crearConIdempotencia(args: CrearConIdempotenciaArgs): Promise<CrearResultado> {
    const k = this.key(args.nuevo.tenantId, args.idempotencyKey);
    if (this.idempotencia.has(k)) {
      return { creado: false };
    }

    const fila: FilaCobro = {
      ...args.nuevo,
      id: randomUUID(),
      creadoEn: new Date().toISOString()
    };
    this.pagos.set(fila.id, fila);
    this.idempotencia.set(k, { paymentId: fila.id, requestHash: args.requestHash });
    this.auditoria.push({
      tenantId: fila.tenantId,
      paymentId: fila.id,
      fromStatus: null,
      toStatus: fila.estado,
      actor: args.actor,
      at: fila.creadoEn
    });

    return { creado: true, cobro: this.aCobro(fila) };
  }

  async contarPorTenant(tenantId: string): Promise<number> {
    let n = 0;
    for (const fila of this.pagos.values()) {
      if (fila.tenantId === tenantId) n++;
    }
    return n;
  }
}
