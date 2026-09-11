import { createHash } from "node:crypto";
import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import {
  desglosarCobro,
  type Cobro,
  type CrearCobroInput,
  type PaymentProvider
} from "@evetev/shared";
import { MERCHANTS_REPOSITORY, type MerchantsRepository } from "../merchants/merchants.repository";
import { TARIFAS_REPOSITORY, type TarifasRepository } from "../tarifas/tarifas.repository";
import { RiesgoService } from "../riesgo/riesgo.service";
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
    @Inject(MERCHANTS_REPOSITORY) private readonly merchants: MerchantsRepository,
    @Inject(TARIFAS_REPOSITORY) private readonly tarifas: TarifasRepository,
    private readonly riesgo: RiesgoService
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

  /**
   * Sin las dos tarifas no se cobra (CA-3, CA-4 de `comisiones`).
   *
   * Sin la del comercio no se sabe cuánto es de EvePay y cuánto suyo; sin la
   * del proveedor no se sabe cuánto cuesta ni cuánto va a consignar. Un cobro
   * así no se puede asentar en el libro ni cuadrar después. Se rechaza ANTES
   * de llamar al proveedor: si llegara a crearse allá, habría plata en camino
   * que nadie sabe repartir.
   *
   * Las versiones vigentes se fijan en el cobro (CA-5): cambiar una tarifa
   * después no altera lo que ya se cobró.
   */
  private async resolverTarifas(
    tenantId: string,
    montoMinor: number
  ): Promise<{ tarifaId: string; tarifaProveedorId: string }> {
    const tarifa = await this.tarifas.tarifaVigente(tenantId);
    if (!tarifa) {
      throw new ConflictException(
        "El comercio no tiene tarifa asignada y no puede cobrar. Asígnale una en la consola de EvePay."
      );
    }

    const tarifaProveedor = await this.tarifas.tarifaProveedorVigente(this.provider.nombre);
    if (!tarifaProveedor) {
      throw new ConflictException(
        `El proveedor "${this.provider.nombre}" no tiene tarifa configurada y no se puede cobrar con él. Configúrala en la consola de EvePay.`
      );
    }

    // CA-7: si la comisión con su IVA se come el monto, el comercio recibiría
    // cero o menos. Es una tarifa mal puesta, no un cobro válido.
    const desglose = desglosarCobro(montoMinor, tarifa, tarifaProveedor);
    if (desglose.alComercio <= 0) {
      throw new BadRequestException(
        `La comisión (${desglose.comision}) más su IVA (${desglose.iva}) iguala o supera el monto del cobro (${montoMinor}), en centavos: el comercio no recibiría nada. Revisa la tarifa del comercio.`
      );
    }

    return { tarifaId: tarifa.id, tarifaProveedorId: tarifaProveedor.id };
  }

  async crearCobro(
    ctx: CobroContext,
    input: CrearCobroInput,
    idempotencyKey: string
  ): Promise<Cobro> {
    await this.exigirComercioAprobado(ctx.tenantId, input.merchantId);
    const tarifas = await this.resolverTarifas(ctx.tenantId, input.montoMinor);

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

    // Riesgo del comercio (spec riesgo-comercio): después del reintento
    // idempotente (un cobro ya creado no se re-evalúa) y ANTES del proveedor.
    // Rechazar = el cobro no existe. Retener = se crea, pero su dinero no se
    // dispersa hasta que alguien lo revise.
    const evaluacion = await this.riesgo.evaluar(ctx.tenantId, input.montoMinor);
    if (evaluacion.resultado.decision === "rechazar") {
      await this.riesgo.rechazar(ctx.tenantId, input.montoMinor, evaluacion);
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
        checkoutUrl: prov.checkoutUrl,
        tarifaId: tarifas.tarifaId,
        tarifaProveedorId: tarifas.tarifaProveedorId
      },
      idempotencyKey,
      requestHash,
      actor: ctx.actor
    });

    if (resultado.creado) {
      await this.riesgo.registrar(
        ctx.tenantId,
        resultado.cobro.id,
        input.montoMinor,
        evaluacion,
        ctx.actor
      );
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
