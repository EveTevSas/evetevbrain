/**
 * Plan de cuentas del ledger de EvePay (spec `ledger-custodia`).
 *
 * Los nombres y la naturaleza de cada cuenta viven aquí, y no como textos
 * sueltos en cada asiento ni como una tabla distinta en la consola: un nombre
 * mal escrito crearía una cuenta fantasma que el cuadre no conoce, y un signo
 * distinto en la API y en la pantalla haría que "por pagar" se leyera al
 * revés según dónde se mire.
 *
 * Todas las cuentas son por comercio (las líneas del ledger llevan tenant_id);
 * los totales de EvePay son la suma de todos.
 */
export const CUENTAS = {
  /** Activo: lo que el proveedor nos debe, cobrado y aún no consignado. */
  clearing: (provider: string) => `clearing:${provider}`,
  /** Activo: en la cuenta de recaudo de EvePay, dinero de terceros. */
  recaudo: "recaudo",
  /** Pasivo: lo que se le debe al comercio. */
  merchantPayable: (merchantId: string) => `merchant_payable:${merchantId}`,
  /** Ingreso: comisión de EvePay. */
  comisionEvepay: "comision:evepay",
  /** Pasivo: IVA de la comisión, que EvePay le debe a la DIAN. */
  ivaPorPagar: "iva_por_pagar",
  /** Gasto: lo que el proveedor le cobra a EvePay. */
  costoProveedor: (provider: string) => `costo_proveedor:${provider}`,
  /** Pasivo: tarifa del proveedor facturada aparte y aún sin pagar. */
  porPagar: (provider: string) => `por_pagar:${provider}`,
  /**
   * Solo en asientos anteriores a la Fase 6, cuando el banco era una cuenta
   * genérica. No se reescribe nada: el cuadre de custodia la suma a `recaudo`.
   */
  bancoHistorico: "banco"
} as const;

export type NaturalezaCuenta = "activo" | "pasivo" | "ingreso" | "gasto";

/**
 * A qué familia pertenece una cuenta por su nombre. Lo que no se reconoce se
 * trata como activo (crece con débitos), que es la lectura contable por
 * defecto y la que tenían las cuentas de antes de la Fase 6.
 */
export function naturalezaDeCuenta(cuenta: string): NaturalezaCuenta {
  if (cuenta.startsWith("merchant_payable:")) return "pasivo";
  if (cuenta === CUENTAS.ivaPorPagar) return "pasivo";
  if (cuenta.startsWith("por_pagar:")) return "pasivo";
  if (cuenta.startsWith("retenido:")) return "pasivo";
  if (cuenta.startsWith("comision:")) return "ingreso";
  if (cuenta.startsWith("costo_proveedor:")) return "gasto";
  return "activo";
}

/**
 * Saldo con el signo de la naturaleza: un activo o un gasto crecen con
 * débitos; un pasivo o un ingreso, con créditos. Así "por pagar 48 572" y
 * "en tránsito 49 200" son positivos los dos, y un negativo siempre es raro.
 */
export function saldoNatural(
  debitosMinor: number,
  creditosMinor: number,
  naturaleza: NaturalezaCuenta
): number {
  return naturaleza === "activo" || naturaleza === "gasto"
    ? debitosMinor - creditosMinor
    : creditosMinor - debitosMinor;
}
