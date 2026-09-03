import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { sql } from "drizzle-orm";
import type { EstadoCobro, PaymentProvider } from "@evetev/shared";
import { DB, type Db } from "../../database/drizzle";
import { PAGOS_REPOSITORY, type PagosRepository } from "../pagos/pagos.repository";
import { PAYMENT_PROVIDER } from "../pagos/payment-provider.token";
import { puedeTransicionar } from "../pagos/payment-state";
import { LedgerService } from "../ledger/ledger.service";
import { AdminAuditService } from "./admin-audit.service";

/**
 * Vista de pagos para la consola (CA-15 a CA-18 de admin-console).
 *
 * Todo lo cross-tenant pasa por funciones SECURITY DEFINER acotadas: la
 * consola nunca consulta las tablas directamente ni se salta RLS por su
 * cuenta (§4).
 */

export interface PagoAdmin {
  id: string;
  tenantId: string;
  tenantNombre: string;
  merchantId: string;
  montoMinor: number;
  moneda: string;
  referencia: string;
  descripcion: string | null;
  estado: string;
  /** Proveedor que lo procesó — se conserva aunque hoy esté activo otro (CA-14). */
  provider: string;
  providerPaymentId: string | null;
  checkoutUrl?: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface FiltrosPagos {
  tenantId?: string;
  estado?: string;
  desde?: string;
  hasta?: string;
  referencia?: string;
  limite?: number;
  cursorAt?: string;
  cursorId?: string;
}

export interface PaginaPagos {
  pagos: PagoAdmin[];
  /** Cursor para la página siguiente, o null si no hay más. */
  siguiente: { at: string; id: string } | null;
}

export interface EventoTimeline {
  momento: string;
  origen: "transicion" | "webhook" | "ledger";
  titulo: string;
  detalle: Record<string, unknown>;
}

export interface ResultadoReverificacion {
  paymentId: string;
  estadoLocal: string;
  estadoProveedor: string;
  /** true solo si la consulta cambió el estado guardado. */
  cambio: boolean;
  detalle: string;
}

interface FilaPago extends Record<string, unknown> {
  id: string;
  tenant_id: string;
  tenant_nombre: string;
  merchant_id: string;
  amount_minor: string | number;
  currency: string;
  reference: string;
  descripcion: string | null;
  status: string;
  provider: string;
  provider_payment_id: string | null;
  checkout_url?: string | null;
  created_at: string;
  updated_at: string;
}

function aPago(f: FilaPago): PagoAdmin {
  return {
    id: f.id,
    tenantId: f.tenant_id,
    tenantNombre: f.tenant_nombre,
    merchantId: f.merchant_id,
    // amount_minor es bigint: postgres-js lo entrega como string para no
    // perder precisión. Se convierte aquí, donde sigue cabiendo en un number.
    montoMinor: Number(f.amount_minor),
    moneda: f.currency,
    referencia: f.reference,
    descripcion: f.descripcion,
    estado: f.status,
    provider: f.provider,
    providerPaymentId: f.provider_payment_id,
    checkoutUrl: f.checkout_url ?? null,
    creadoEn: f.created_at,
    actualizadoEn: f.updated_at
  };
}

@Injectable()
export class PagosAdminService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(PAGOS_REPOSITORY) private readonly repo: PagosRepository,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly ledger: LedgerService,
    private readonly auditoria: AdminAuditService
  ) {}

  /**
   * Listado cross-tenant con filtros (CA-15). Pide una fila de más que el
   * límite para saber si hay página siguiente sin contar el total, que en una
   * tabla de pagos grande sería caro y además no se usa para nada.
   */
  async listar(filtros: FiltrosPagos): Promise<PaginaPagos> {
    const limite = Math.min(Math.max(filtros.limite ?? 50, 1), 200);

    const filas = await this.db.execute<FilaPago>(sql`
      SELECT * FROM evepay.admin_listar_pagos(
        ${filtros.tenantId ?? null}::uuid,
        ${filtros.estado ?? null},
        ${filtros.desde ?? null}::timestamptz,
        ${filtros.hasta ?? null}::timestamptz,
        ${filtros.referencia ?? null},
        ${limite + 1},
        ${filtros.cursorAt ?? null}::timestamptz,
        ${filtros.cursorId ?? null}::uuid
      )
    `);

    const hayMas = filas.length > limite;
    const pagos = filas.slice(0, limite).map(aPago);
    const ultimo = pagos[pagos.length - 1];

    return {
      pagos,
      siguiente: hayMas && ultimo ? { at: ultimo.creadoEn, id: ultimo.id } : null
    };
  }

  async obtener(paymentId: string): Promise<PagoAdmin> {
    const filas = await this.db.execute<FilaPago>(
      sql`SELECT * FROM evepay.admin_pago(${paymentId}::uuid)`
    );
    const fila = filas[0];
    if (!fila) {
      throw new NotFoundException("Cobro no encontrado.");
    }
    return aPago(fila);
  }

  /** Historia completa del cobro: transiciones, webhooks y asientos (CA-16). */
  async timeline(paymentId: string): Promise<EventoTimeline[]> {
    const filas = await this.db.execute<{
      momento: string;
      origen: EventoTimeline["origen"];
      titulo: string;
      detalle: Record<string, unknown>;
    }>(sql`SELECT * FROM evepay.admin_pago_timeline(${paymentId}::uuid)`);

    return filas.map((f) => ({
      momento: f.momento,
      origen: f.origen,
      titulo: f.titulo,
      detalle: f.detalle ?? {}
    }));
  }

  /**
   * Reverifica el estado contra el proveedor y lo aplica SOLO si la máquina de
   * estados lo permite (CA-17). Cuando no cambia nada, lo dice explícitamente
   * y no registra transición (CA-18): un cobro que ya estaba aprobado no debe
   * ganar una transición falsa cada vez que alguien mira.
   */
  async reverificar(paymentId: string, actor: string): Promise<ResultadoReverificacion> {
    const pago = await this.obtener(paymentId);

    if (!pago.providerPaymentId) {
      throw new NotFoundException(
        "El cobro no tiene identificador del proveedor: no hay qué consultar."
      );
    }

    const estadoProveedor = await this.provider.verificarEstado(pago.providerPaymentId);
    const estadoLocal = pago.estado as EstadoCobro;

    const base = {
      paymentId,
      estadoLocal,
      estadoProveedor,
      cambio: false
    };

    if (estadoProveedor === estadoLocal) {
      await this.auditar(actor, paymentId, pago, estadoProveedor, false, "sin cambio");
      return { ...base, detalle: `El proveedor y EvePay coinciden en "${estadoLocal}".` };
    }

    if (!puedeTransicionar(estadoLocal, estadoProveedor)) {
      await this.auditar(actor, paymentId, pago, estadoProveedor, false, "transición no permitida");
      return {
        ...base,
        detalle: `El proveedor dice "${estadoProveedor}" pero EvePay está en "${estadoLocal}", y esa transición no está permitida. No se cambió nada.`
      };
    }

    await this.repo.aplicarTransicion({
      tenantId: pago.tenantId,
      paymentId,
      desde: estadoLocal,
      hacia: estadoProveedor,
      actor: `admin:${actor}`
    });

    if (estadoProveedor === "aprobado") {
      await this.ledger.registrarCobroAprobado(pago.tenantId, paymentId);
    }

    await this.auditar(actor, paymentId, pago, estadoProveedor, true, "aplicada");

    return {
      ...base,
      cambio: true,
      detalle: `Se aplicó la transición ${estadoLocal} → ${estadoProveedor} según el proveedor.`
    };
  }

  private async auditar(
    actor: string,
    paymentId: string,
    pago: PagoAdmin,
    estadoProveedor: string,
    cambio: boolean,
    resultado: string
  ): Promise<void> {
    await this.auditoria.registrar({
      actor,
      accion: "pago.reverificar",
      objetoTipo: "pago",
      objetoId: paymentId,
      detalle: {
        tenantId: pago.tenantId,
        provider: pago.provider,
        estadoLocal: pago.estado,
        estadoProveedor,
        cambio,
        resultado
      }
    });
  }
}
