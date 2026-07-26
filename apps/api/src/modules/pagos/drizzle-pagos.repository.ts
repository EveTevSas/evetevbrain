import { and, count, eq, sql } from "drizzle-orm";
import type { Cobro, EstadoCobro } from "@evetev/shared";
import type { Db } from "../../database/drizzle";
import { paymentAudit, paymentIdempotency, payments, webhookEvents } from "../../database/schema";
import {
  type AplicarTransicionArgs,
  type CrearConIdempotenciaArgs,
  type CrearResultado,
  type IdempotencyHit,
  type PagosRepository,
  type RegistrarEventoArgs,
  type ResolucionPago
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
      if (typeof error === "object" && error !== null && (error as { code?: string }).code === "23505") {
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
    return { paymentId: row.payment_id, tenantId: row.tenant_id, estado: row.status as EstadoCobro };
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
}
