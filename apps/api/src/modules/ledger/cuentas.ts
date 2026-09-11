/**
 * Plan de cuentas del ledger (spec `ledger-custodia`).
 *
 * Los nombres viven aquí y no como textos sueltos en cada asiento: un nombre
 * mal escrito en un solo sitio crearía una cuenta fantasma que el cuadre no
 * conoce. Todas las cuentas son por comercio (las líneas llevan tenant_id); los
 * totales de EvePay son la suma de todos.
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
