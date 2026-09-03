import { randomUUID } from "node:crypto";
import type { Cobro, RangoFechas } from "@evetev/shared";
import {
  type AplicarTransicionArgs,
  type CobroAprobadoResumen,
  type CrearConIdempotenciaArgs,
  type CrearResultado,
  type FiltrosCobros,
  type IdempotencyHit,
  type NuevoCobro,
  type PaginaCobros,
  type PagosRepository,
  type RegistrarEventoArgs,
  type ResolucionPago,
  type StatsCobros
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
  private readonly eventos = new Set<string>(); // event_id vistos
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

  async resolverPagoPorProvider(
    provider: string,
    providerPaymentId: string
  ): Promise<ResolucionPago | null> {
    for (const fila of this.pagos.values()) {
      if (fila.provider === provider && fila.providerPaymentId === providerPaymentId) {
        return { paymentId: fila.id, tenantId: fila.tenantId, estado: fila.estado };
      }
    }
    return null;
  }

  async registrarEventoIdempotente(args: RegistrarEventoArgs): Promise<boolean> {
    if (this.eventos.has(args.eventId)) {
      return false;
    }
    this.eventos.add(args.eventId);
    return true;
  }

  async aplicarTransicion(args: AplicarTransicionArgs): Promise<void> {
    const fila = this.pagos.get(args.paymentId);
    if (!fila || fila.tenantId !== args.tenantId) {
      return;
    }
    fila.estado = args.hacia;
    this.auditoria.push({
      tenantId: args.tenantId,
      paymentId: args.paymentId,
      fromStatus: args.desde,
      toStatus: args.hacia,
      actor: args.actor,
      at: new Date().toISOString()
    });
  }

  async listar(tenantId: string, filtros: FiltrosCobros): Promise<PaginaCobros> {
    let items = Array.from(this.pagos.values()).filter((f) => f.tenantId === tenantId);
    if (filtros.estado) items = items.filter((f) => f.estado === filtros.estado);
    if (filtros.desde) items = items.filter((f) => f.creadoEn >= filtros.desde!);
    if (filtros.hasta) items = items.filter((f) => f.creadoEn <= filtros.hasta!);
    items.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
    const total = items.length;
    const offset = (filtros.page - 1) * filtros.limit;
    return {
      items: items.slice(offset, offset + filtros.limit).map((f) => this.aCobro(f)),
      total,
      page: filtros.page,
      limit: filtros.limit
    };
  }

  async stats(tenantId: string, desde?: string, hasta?: string): Promise<StatsCobros> {
    let items = Array.from(this.pagos.values()).filter((f) => f.tenantId === tenantId);
    if (desde) items = items.filter((f) => f.creadoEn >= desde);
    if (hasta) items = items.filter((f) => f.creadoEn <= hasta);
    const aprobados = items.filter((f) => f.estado === "aprobado");
    return {
      total: items.length,
      aprobados: aprobados.length,
      fallidos: items.filter((f) => f.estado === "fallido").length,
      pendientes: items.filter((f) => f.estado === "pendiente" || f.estado === "creado").length,
      montoAprobadoMinor: aprobados.reduce((s, f) => s + f.amountMinor, 0)
    };
  }

  async listarCobrosAprobados(
    tenantId: string,
    rango: RangoFechas
  ): Promise<CobroAprobadoResumen[]> {
    const out: CobroAprobadoResumen[] = [];
    for (const fila of this.pagos.values()) {
      if (
        fila.tenantId === tenantId &&
        fila.estado === "aprobado" &&
        fila.creadoEn >= rango.desde &&
        fila.creadoEn <= rango.hasta
      ) {
        out.push({
          paymentId: fila.id,
          providerPaymentId: fila.providerPaymentId,
          montoMinor: fila.amountMinor
        });
      }
    }
    return out;
  }
}
