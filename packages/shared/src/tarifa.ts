import { z } from "zod";

/**
 * Tarifas de EvePay: la que le cobramos a cada comercio y la que el proveedor
 * nos cobra a nosotros (`comisiones`, Fase 6).
 *
 * POR QUÉ UN SOLO SITIO. La API usa este cálculo al asentar el cobro y la
 * consola al mostrar la vista previa. Si vivieran en dos lados, tarde o
 * temprano darían centavos distintos y el libro no cuadraría con lo que
 * operación vio en pantalla.
 *
 * Todo en enteros (centavos y puntos básicos). El producto monto × bps puede
 * pasar de 2^53 con montos grandes, así que se hace en BigInt y solo el
 * resultado, que siempre es menor que el monto, vuelve a number.
 */

/** Puntos básicos por unidad: 10 000 bps = 100 %. */
const BPS_POR_UNIDAD = 10_000n;

const mensajes = {
  entero: "Debe ser un número entero",
  bps: "El porcentaje va de 0 a 10 000 puntos básicos (0 % a 100 %)",
  fijo: "El fijo no puede ser negativo",
  iva: "El IVA solo puede ser 0 % o 19 %"
};

export const TarifaSchema = z.object({
  /** Porcentaje en puntos básicos: 290 = 2,90 %. */
  bps: z
    .number({ invalid_type_error: mensajes.bps })
    .int(mensajes.entero)
    .min(0, mensajes.bps)
    .max(10_000, mensajes.bps),
  /** Fijo por transacción, en centavos. */
  fijoMinor: z
    .number({ invalid_type_error: mensajes.fijo })
    .int(mensajes.entero)
    .min(0, mensajes.fijo)
});
export type Tarifa = z.infer<typeof TarifaSchema>;

/** IVA sobre la comisión: solo 0 % o 19 %, igual que el check de la base. */
export const IvaBpsSchema = z.union([z.literal(0), z.literal(1900)], {
  errorMap: () => ({ message: mensajes.iva })
});
export type IvaBps = z.infer<typeof IvaBpsSchema>;

export const TarifaComercioSchema = TarifaSchema.extend({ ivaBps: IvaBpsSchema });
export type TarifaComercio = z.infer<typeof TarifaComercioSchema>;

export const TarifaProveedorSchema = TarifaSchema.extend({
  /** true: el proveedor consigna monto − su tarifa. false: la factura aparte. */
  descuentaEnConsignacion: z.boolean()
});
export type TarifaProveedor = z.infer<typeof TarifaProveedorSchema>;

/** `redondeo_mitad_arriba(monto × bps / 10 000) + fijo`, en centavos. */
export function calcularTarifa(montoMinor: number, tarifa: Tarifa): number {
  const proporcional =
    (BigInt(montoMinor) * BigInt(tarifa.bps) + BPS_POR_UNIDAD / 2n) / BPS_POR_UNIDAD;
  return Number(proporcional) + tarifa.fijoMinor;
}

/** IVA de una comisión, con la misma regla de redondeo que las tarifas. */
export function calcularIva(comisionMinor: number, ivaBps: IvaBps): number {
  return calcularTarifa(comisionMinor, { bps: ivaBps, fijoMinor: 0 });
}

export interface DesgloseCobro {
  montoMinor: number;
  /** Lo que EvePay le cobra al comercio, sin IVA. */
  comision: number;
  /** IVA de la comisión: EvePay lo recauda para la DIAN, no es margen. */
  iva: number;
  /** monto − comisión − IVA. Si es ≤ 0 el cobro no puede crearse. */
  alComercio: number;
  /** Lo que el proveedor le cobra a EvePay por este cobro. */
  costoProveedor: number;
  /** comisión − costo del proveedor. Puede ser negativo (piloto sin comisión). */
  margen: number;
}

/** Reparte un cobro entre comercio, EvePay, DIAN y proveedor. */
export function desglosarCobro(
  montoMinor: number,
  tarifaComercio: TarifaComercio,
  tarifaProveedor: Tarifa
): DesgloseCobro {
  const comision = calcularTarifa(montoMinor, tarifaComercio);
  const iva = calcularIva(comision, tarifaComercio.ivaBps);
  const costoProveedor = calcularTarifa(montoMinor, tarifaProveedor);
  return {
    montoMinor,
    comision,
    iva,
    alComercio: montoMinor - comision - iva,
    costoProveedor,
    margen: comision - costoProveedor
  };
}

export type ValidacionTarifa<T> = { ok: true; tarifa: T } | { ok: false; errores: string[] };

function validar<T>(schema: z.ZodType<T>, input: unknown): ValidacionTarifa<T> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, tarifa: parsed.data };
  return {
    ok: false,
    errores: parsed.error.issues.map((i) => `${i.path.join(".") || "tarifa"}: ${i.message}`)
  };
}

export function validarTarifaComercio(input: unknown): ValidacionTarifa<TarifaComercio> {
  return validar(TarifaComercioSchema, input);
}

export function validarTarifaProveedor(input: unknown): ValidacionTarifa<TarifaProveedor> {
  return validar(TarifaProveedorSchema, input);
}
