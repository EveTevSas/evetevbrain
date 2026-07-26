import { createHash } from "node:crypto";
import { ConflictException, Inject, Injectable } from "@nestjs/common";
import type { Cobro, CrearCobroInput, PaymentProvider } from "@evetev/shared";
import { PAYMENT_PROVIDER } from "./payment-provider.token";
import { PAGOS_REPOSITORY, type PagosRepository } from "./pagos.repository";

/** Contexto del cobro: tenant (comercio) y actor para auditoría. */
export interface CobroContext {
  tenantId: string;
  actor: string;
}

/**
 * Casos de uso de cobros. Cimiento no-reescribible (§1, §4): idempotencia.
 * Nunca cobra dos veces con la misma clave; cada creación queda auditada.
 */
@Injectable()
export class PagosService {
  private readonly providerName = process.env.PAYMENT_PROVIDER === "akua" ? "akua" : "fake";

  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    @Inject(PAGOS_REPOSITORY) private readonly repo: PagosRepository
  ) {}

  async crearCobro(
    ctx: CobroContext,
    input: CrearCobroInput,
    idempotencyKey: string
  ): Promise<Cobro> {
    const requestHash = hashRequest(ctx.tenantId, input);

    // Reintento con la misma clave: devolver lo existente sin volver a llamar a Akua.
    const previo = await this.repo.buscarIdempotencia(ctx.tenantId, idempotencyKey);
    if (previo) {
      return this.recuperarExistente(ctx.tenantId, previo.paymentId, previo.requestHash, requestHash);
    }

    // Primera vez: crear en el proveedor (una sola llamada) y persistir.
    const prov = await this.provider.crearCobro(input, idempotencyKey);
    const resultado = await this.repo.crearConIdempotencia({
      nuevo: {
        tenantId: ctx.tenantId,
        merchantId: input.merchantId,
        amountMinor: input.montoMinor,
        currency: input.moneda,
        reference: input.referencia,
        description: input.descripcion,
        estado: prov.estado,
        provider: this.providerName,
        providerPaymentId: prov.providerPaymentId,
        checkoutUrl: prov.checkoutUrl
      },
      idempotencyKey,
      requestHash,
      actor: ctx.actor
    });

    if (resultado.creado) {
      return resultado.cobro;
    }

    // Carrera: otra transacción creó el cobro con esta misma clave. Recuperarlo.
    const hit = await this.repo.buscarIdempotencia(ctx.tenantId, idempotencyKey);
    if (hit) {
      return this.recuperarExistente(ctx.tenantId, hit.paymentId, hit.requestHash, requestHash);
    }
    throw new Error("No se pudo resolver la creación idempotente del cobro.");
  }

  private async recuperarExistente(
    tenantId: string,
    paymentId: string,
    hashGuardado: string,
    hashActual: string
  ): Promise<Cobro> {
    if (hashGuardado !== hashActual) {
      throw new ConflictException(
        "La 'Idempotency-Key' ya se usó con un cuerpo distinto."
      );
    }
    const cobro = await this.repo.buscarCobro(tenantId, paymentId);
    if (!cobro) {
      throw new Error("Inconsistencia: registro de idempotencia sin cobro asociado.");
    }
    return cobro;
  }
}

/** Hash canónico del request para detectar reuso de clave con cuerpo distinto. */
function hashRequest(tenantId: string, input: CrearCobroInput): string {
  const canonical = JSON.stringify({
    tenantId,
    merchantId: input.merchantId,
    montoMinor: input.montoMinor,
    moneda: input.moneda,
    referencia: input.referencia,
    descripcion: input.descripcion ?? null
  });
  return createHash("sha256").update(canonical).digest("hex");
}
