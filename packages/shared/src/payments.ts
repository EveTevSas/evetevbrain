import { z } from "zod";
import type { CrearMerchantInput, ProviderMerchant } from "./merchants";

/**
 * Contrato de EvePay para la adquirencia.
 *
 * Regla (§4): todo el núcleo habla con pagos SOLO a través de esta interfaz.
 * Implementaciones reales: ComboPay (la adquirencia negociada hoy) y Akua;
 * en local y tests se usa un fake. Se elige con PAYMENT_PROVIDER.
 * Ningún módulo importa el SDK del proveedor directamente.
 */

// --- Esquemas Zod (una validación por frontera de entrada, §3) ---

export const MonedaSchema = z.enum(["COP", "USD"]);

export const CrearCobroInputSchema = z.object({
  /** Comercio (tenant de EvePay) que cobra. */
  merchantId: z.string().uuid(),
  /** Monto en la unidad mínima de la moneda (centavos). Entero, sin decimales. */
  montoMinor: z.number().int().positive(),
  moneda: MonedaSchema,
  /** Referencia del comercio para conciliar de su lado. */
  referencia: z.string().min(1).max(120),
  descripcion: z.string().max(255).optional()
});

export const EstadoCobroSchema = z.enum([
  "creado",
  "pendiente",
  "aprobado",
  "fallido",
  "conciliado"
]);

export const CobroSchema = z.object({
  id: z.string().uuid(),
  merchantId: z.string().uuid(),
  montoMinor: z.number().int().positive(),
  moneda: MonedaSchema,
  referencia: z.string(),
  estado: EstadoCobroSchema,
  /** URL de checkout embebido del proveedor (nunca tocamos el PAN, §4). */
  checkoutUrl: z.string().url().optional(),
  creadoEn: z.string().datetime()
});

export const RangoFechasSchema = z.object({
  desde: z.string().datetime(),
  hasta: z.string().datetime()
});

export const ReporteConciliacionSchema = z.object({
  rango: RangoFechasSchema,
  /** Cobros que cuadran con una liquidación del proveedor. */
  conciliados: z.number().int().nonnegative(),
  /** Cobros que cruzan pero con monto distinto. */
  diferencias: z.number().int().nonnegative(),
  /** Liquidaciones del proveedor sin cobro local. */
  huerfanosProveedor: z.number().int().nonnegative(),
  /** Cobros aprobados aún sin liquidación. */
  noConciliados: z.number().int().nonnegative()
});

// --- Tipos derivados de los esquemas (fuente de verdad = el schema) ---

export type Moneda = z.infer<typeof MonedaSchema>;
export type CrearCobroInput = z.infer<typeof CrearCobroInputSchema>;
export type EstadoCobro = z.infer<typeof EstadoCobroSchema>;
export type Cobro = z.infer<typeof CobroSchema>;
export type RangoFechas = z.infer<typeof RangoFechasSchema>;
export type ReporteConciliacion = z.infer<typeof ReporteConciliacionSchema>;

/** Una liquidación (settlement) reportada por el proveedor. */
export interface LiquidacionProvider {
  providerPaymentId: string;
  montoMinor: number;
}

/**
 * Resultado que devuelve el proveedor (Akua) al crear un cobro. EvePay le pone su
 * propio `id` al cobro y guarda aparte el `providerPaymentId`.
 */
export interface ProviderCobro {
  providerPaymentId: string;
  estado: EstadoCobro;
  checkoutUrl?: string;
}

/**
 * Lo que un proveedor sabe hacer. No todos cubren lo mismo: ComboPay opera como
 * agregador (sin alta de comercios ni liquidaciones por API) y Akua es una
 * plataforma completa.
 *
 * Existe para que el núcleo pregunte ANTES de intentar, en vez de deducirlo de
 * un error. Deducirlo confundiría "este proveedor no lo ofrece" con "el
 * proveedor está caído", y esas dos cosas piden reacciones opuestas: la primera
 * es un paso manual esperado; la segunda, un fallo que hay que reintentar.
 */
export interface CapacidadesProvider {
  /** Da de alta comercios por API (si no, el alta es manual en su panel). */
  altaDeComercios: boolean;
  /** Expone liquidaciones para conciliar automáticamente. */
  liquidaciones: boolean;
  /** Monedas que acepta. */
  monedas: Moneda[];
}

/** Resultado de comprobar que el proveedor responde y acepta las credenciales. */
export interface SaludProvider {
  ok: boolean;
  /** Qué pasó, en una línea: sirve tanto si salió bien como si falló. */
  detalle: string;
  /** Milisegundos que tardó la comprobación. */
  duracionMs: number;
  verificadoEn: string;
}

/**
 * Interfaz de adquirencia. El proveedor (ComboPay/Akua) es el backbone detrás
 * de ella (§7). Los webhooks del proveedor se normalizan a nuestros eventos internos.
 * Ningún módulo importa el SDK del proveedor: solo la implementación de esta interfaz.
 */
export interface PaymentProvider {
  /** Nombre corto y estable; queda guardado en cada cobro y comercio. */
  readonly nombre: string;
  readonly capacidades: CapacidadesProvider;
  crearCobro(input: CrearCobroInput, idempotencyKey: string): Promise<ProviderCobro>;
  verificarEstado(providerPaymentId: string): Promise<EstadoCobro>;
  /** Liquidaciones (settlements) del proveedor en un rango, para conciliar (Fase 4). */
  listarLiquidaciones(rango: RangoFechas): Promise<LiquidacionProvider[]>;
  /** Alta del comercio en la adquirencia (Fase 5). */
  crearMerchant(input: CrearMerchantInput): Promise<ProviderMerchant>;
  /**
   * Comprueba conectividad y credenciales SIN mover dinero (CA-12 de
   * admin-console). Cada proveedor elige su llamada más barata de solo
   * lectura; ninguna crea, cambia ni cobra nada.
   */
  verificarSalud(): Promise<SaludProvider>;
}
