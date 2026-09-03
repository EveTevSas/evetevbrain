import { createHash } from "node:crypto";
import { ConflictException, Inject, Injectable } from "@nestjs/common";
import type { Cobro, CrearCobroInput, PaymentProvider } from "@evetev/shared";
import { MERCHANTS_REPOSITORY, type MerchantsRepository } from "../merchants/merchants.repository";
import { PAYMENT_PROVIDER } from "./payment-provider.token";
import {
  PAGOS_REPOSITORY,
  type FiltrosCobros,
  type PaginaCobros,
  type PagosRepository,
  type StatsCobros
} from "./pagos.repository";

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
  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    @Inject(PAGOS_REPOSITORY) private readonly repo: PagosRepository,
    @Inject(MERCHANTS_REPOSITORY) private readonly merchants: MerchantsRepository
  ) {}

  /**
   * Un comercio solo cobra si está aprobado.
   *
   * Con Akua el KYC lo hacía la adquirencia y un comercio sin aprobar fallaba
   * allá; con ComboPay, que opera como agregador, el alta en su panel es
   * manual y nadie de fuera lo impediría. Sin esta comprobación, un comercio
   * podría cobrar dinero real sin estar registrado donde se liquida — y ese
   * dinero llegaría a una cuenta sin dueño identificable.
   *
   * Se busca por (tenant, merchant), así que valida de paso que el merchantId
   * del cuerpo sea de quien llama: antes se persistía tal cual como venía.
   */
  private async exigirComercioAprobado(tenantId: string, merchantId: string): Promise<void> {
    const merchant = await this.merchants.buscar(tenantId, merchantId);

    if (!merchant) {
      throw new ConflictException("El comercio indicado no existe o no pertenece a este tenant.");
    }
    if (merchant.estado !== "aprobado") {
      throw new ConflictException(
        `El comercio está en estado "${merchant.estado}" y no puede cobrar. Debe quedar aprobado en la consola de EvePay una vez registrado en el panel del proveedor.`
      );
    }
  }

  async crearCobro(
    ctx: CobroContext,
    input: CrearCobroInput,
    idempotencyKey: string
  ): Promise<Cobro> {
    await this.exigirComercioAprobado(ctx.tenantId, input.merchantId);

    const requestHash = hashRequest(ctx.tenantId, input);

    // Reintento con la misma clave: devolver lo existente sin volver a llamar a Akua.
    const previo = await this.repo.buscarIdempotencia(ctx.tenantId, idempotencyKey);
    if (previo) {
      return this.recuperarExistente(
        ctx.tenantId,
        previo.paymentId,
        previo.requestHash,
        requestHash
      );
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
        // El nombre lo dice el proveedor, no la variable de entorno: el
        // histórico debe conservar quién procesó cada cobro aunque después se
        // cambie de adquirencia (CA-14 de admin-console).
        provider: this.provider.nombre,
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

  async listar(tenantId: string, filtros: FiltrosCobros): Promise<PaginaCobros> {
    return this.repo.listar(tenantId, filtros);
  }

  async stats(tenantId: string, desde?: string, hasta?: string): Promise<StatsCobros> {
    return this.repo.stats(tenantId, desde, hasta);
  }

  async obtener(tenantId: string, cobroId: string): Promise<Cobro | null> {
    return this.repo.buscarCobro(tenantId, cobroId);
  }

  private async recuperarExistente(
    tenantId: string,
    paymentId: string,
    hashGuardado: string,
    hashActual: string
  ): Promise<Cobro> {
    if (hashGuardado !== hashActual) {
      throw new ConflictException("La 'Idempotency-Key' ya se usó con un cuerpo distinto.");
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
