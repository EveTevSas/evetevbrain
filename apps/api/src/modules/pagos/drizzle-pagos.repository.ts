import { and, count, eq, gte, lte, sql, sum, desc } from "drizzle-orm";
import type { Cobro, EstadoCobro, RangoFechas } from "@evetev/shared";
import type { Db } from "../../database/drizzle";
import { paymentAudit, paymentIdempotency, payments, webhookEvents } from "../../database/schema";
import {
  type AplicarTransicionArgs,
  type CobroAprobadoResumen,
  type CrearConIdempotenciaArgs,
  type CrearResultado,
  type FiltrosCobros,
  type IdempotencyHit,
  type PaginaCobros,
  type PagosRepository,
  type RegistrarEventoArgs,
  type ResolucionPago,
  type StatsCobros
} from "./pagos.repository";

type FilaPago = typeof payments.$inferSelect;

/**
 * Adaptador Drizzle/Postgres (Supabase). Cada operación abre transacción y hace
 * `SET LOCAL app.tenant_id` para que RLS aísle por tenant (§4). Requiere conectar
 * con un rol que respete RLS (ver supabase/README.md).
 *
 * No se ejercita en los tests de este repo (necesita Postgres); su verificación
 * real corre contra Supabase. La lógica de negocio se prueba con el adaptador
 * in-memory.
 */
export class DrizzlePagosRepository implements PagosRepository {
  constructor(private readonly db: Db) {}

  private aCobro(fila: FilaPago): Cobro {
    return {
      id: fila.id,
      merchantId: fila.merchantId,
      montoMinor: fila.amountMinor,
      moneda: fila.currency as Cobro["moneda"],
      referencia: fila.reference,
      estado: fila.status as Cobro["estado"],
      checkoutUrl: fila.checkoutUrl ?? undefined,
      creadoEn: fila.createdAt.toISOString()
    };
  }

  async buscarIdempotencia(
    tenantId: string,
    idempotencyKey: string
  ): Promise<IdempotencyHit | null> {
    return this.db.transaction(async (tx): Promise<IdempotencyHit | null> => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
      const rows = await tx
        .select({
          paymentId: paymentIdempotency.paymentId,
          requestHash: paymentIdempotency.requestHash
        })
        .from(paymentIdempotency)
        .where(
          and(
            eq(paymentIdempotency.tenantId, tenantId),
            eq(paymentIdempotency.idempotencyKey, idempotencyKey)
          )
        )
        .limit(1);
      return rows[0] ?? null;
    });
  }

  async buscarCobro(tenantId: string, cobroId: string): Promise<Cobro | null> {
    return this.db.transaction(async (tx): Promise<Cobro | null> => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
      const rows = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.id, cobroId), eq(payments.tenantId, tenantId)))
        .limit(1);
      const fila = rows[0];
      return fila ? this.aCobro(fila) : null;
    });
  }

  async crearConIdempotencia(args: CrearConIdempotenciaArgs): Promise<CrearResultado> {
    const { nuevo } = args;
    try {
      return await this.db.transaction(async (tx): Promise<CrearResultado> => {
        await tx.execute(sql`select set_config('app.tenant_id', ${nuevo.tenantId}, true)`);

        const inserted = await tx
          .insert(payments)
          .values({
            tenantId: nuevo.tenantId,
            merchantId: nuevo.merchantId,
            amountMinor: nuevo.amountMinor,
            currency: nuevo.currency,
            reference: nuevo.reference,
            description: nuevo.description ?? null,
            status: nuevo.estado,
            provider: nuevo.provider,
            providerPaymentId: nuevo.providerPaymentId,
            checkoutUrl: nuevo.checkoutUrl ?? null
          })
          .returning();
        const fila = inserted[0]!;

        await tx.insert(paymentIdempotency).values({
          tenantId: nuevo.tenantId,
          idempotencyKey: args.idempotencyKey,
          requestHash: args.requestHash,
          paymentId: fila.id
        });

        await tx.insert(paymentAudit).values({
          tenantId: nuevo.tenantId,
          paymentId: fila.id,
          fromStatus: null,
          toStatus: nuevo.estado,
          actor: args.actor,
          data: null
        });

        return { creado: true, cobro: this.aCobro(fila) };
      });
    } catch (error) {
      // 23505 = unique_violation → otra transacción ganó la carrera.
      if (
        typeof error === "object" &&
        error !== null &&
        (error as { code?: string }).code === "23505"
      ) {
        return { creado: false };
      }
      throw error;
    }
  }

  async contarPorTenant(tenantId: string): Promise<number> {
    return this.db.transaction(async (tx): Promise<number> => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
      const rows = await tx.select({ n: count() }).from(payments);
      return Number(rows[0]?.n ?? 0);
    });
  }

  async resolverPagoPorProvider(providerPaymentId: string): Promise<ResolucionPago | null> {
    // Función SECURITY DEFINER: resuelve el cobro sin necesidad de tenant (cross-tenant).
    const result = await this.db.execute(
      sql`select payment_id, tenant_id, status from evepay.tenant_of_payment(${providerPaymentId})`
    );
    const rows = result as unknown as Array<{
      payment_id: string;
      tenant_id: string;
      status: string;
    }>;
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      paymentId: row.payment_id,
      tenantId: row.tenant_id,
      estado: row.status as EstadoCobro
    };
  }

  async registrarEventoIdempotente(args: RegistrarEventoArgs): Promise<boolean> {
    return this.db.transaction(async (tx): Promise<boolean> => {
      await tx.execute(sql`select set_config('app.tenant_id', ${args.tenantId}, true)`);
      const inserted = await tx
        .insert(webhookEvents)
        .values({
          eventId: args.eventId,
          tenantId: args.tenantId,
          provider: args.provider,
          type: args.type
        })
        .onConflictDoNothing()
        .returning({ eventId: webhookEvents.eventId });
      return inserted.length > 0;
    });
  }

  async aplicarTransicion(args: AplicarTransicionArgs): Promise<void> {
    await this.db.transaction(async (tx): Promise<void> => {
      await tx.execute(sql`select set_config('app.tenant_id', ${args.tenantId}, true)`);
      await tx
        .update(payments)
        .set({ status: args.hacia, updatedAt: new Date() })
        .where(and(eq(payments.id, args.paymentId), eq(payments.tenantId, args.tenantId)));
      await tx.insert(paymentAudit).values({
        tenantId: args.tenantId,
        paymentId: args.paymentId,
        fromStatus: args.desde,
        toStatus: args.hacia,
        actor: args.actor,
        data: null
      });
    });
  }

  async listar(tenantId: string, filtros: FiltrosCobros): Promise<PaginaCobros> {
    return this.db.transaction(async (tx): Promise<PaginaCobros> => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);

      const conditions = [eq(payments.tenantId, tenantId)];
      if (filtros.estado) conditions.push(eq(payments.status, filtros.estado));
      if (filtros.desde) conditions.push(gte(payments.createdAt, new Date(filtros.desde)));
      if (filtros.hasta) conditions.push(lte(payments.createdAt, new Date(filtros.hasta)));

      const totales = await tx
        .select({ total: count() })
        .from(payments)
        .where(and(...conditions));
      const total = totales[0]?.total ?? 0;
      const offset = (filtros.page - 1) * filtros.limit;
      const rows = await tx
        .select()
        .from(payments)
        .where(and(...conditions))
        .orderBy(desc(payments.createdAt))
        .limit(filtros.limit)
        .offset(offset);

      return {
        items: rows.map((r) => this.aCobro(r)),
        total: Number(total ?? 0),
        page: filtros.page,
        limit: filtros.limit
      };
    });
  }

  async stats(tenantId: string, desde?: string, hasta?: string): Promise<StatsCobros> {
    return this.db.transaction(async (tx): Promise<StatsCobros> => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);

      const conditions = [eq(payments.tenantId, tenantId)];
      if (desde) conditions.push(gte(payments.createdAt, new Date(desde)));
      if (hasta) conditions.push(lte(payments.createdAt, new Date(hasta)));

      const rows = await tx
        .select({ status: payments.status, monto: sum(payments.amountMinor), cantidad: count() })
        .from(payments)
        .where(and(...conditions))
        .groupBy(payments.status);

      let aprobados = 0,
        fallidos = 0,
        pendientes = 0,
        montoAprobadoMinor = 0,
        total = 0;
      for (const r of rows) {
        const n = Number(r.cantidad);
        total += n;
        if (r.status === "aprobado") {
          aprobados = n;
          montoAprobadoMinor = Number(r.monto ?? 0);
        } else if (r.status === "fallido") {
          fallidos = n;
        } else {
          pendientes += n;
        }
      }
      return { total, aprobados, fallidos, pendientes, montoAprobadoMinor };
    });
  }

  async listarCobrosAprobados(
    tenantId: string,
    rango: RangoFechas
  ): Promise<CobroAprobadoResumen[]> {
    return this.db.transaction(async (tx): Promise<CobroAprobadoResumen[]> => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
      const rows = await tx
        .select({
          paymentId: payments.id,
          providerPaymentId: payments.providerPaymentId,
          montoMinor: payments.amountMinor
        })
        .from(payments)
        .where(
          and(
            eq(payments.tenantId, tenantId),
            eq(payments.status, "aprobado"),
            gte(payments.createdAt, new Date(rango.desde)),
            lte(payments.createdAt, new Date(rango.hasta))
          )
        );
      return rows.map((r) => ({
        paymentId: r.paymentId,
        providerPaymentId: r.providerPaymentId ?? "",
        montoMinor: r.montoMinor
      }));
    });
  }
}
