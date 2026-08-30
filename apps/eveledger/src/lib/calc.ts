// Funciones puras de cálculo del cierre diario.
// Compartidas entre cliente (cálculo en vivo) y servidor (validación).
// Sin dependencias de servidor: todo entra y sale como `number`.

export interface LecturaInput {
  lecturaInicial: number;
  lecturaFinal: number;
  calibracion: number;
  precio: number;
}

export type TipoPago = "TRANSPORTADORA" | "CREDIBANCO" | "REDEBAN" | "OTRO";

export interface PagoInput {
  tipo: TipoPago;
  valor: number;
}

export interface FaltanteInput {
  faltante: number;
  abono: number;
}

export interface ArqueoInput {
  efectivo: number;
  pagos: PagoInput[];
  vales: number[];
  faltantes: FaltanteInput[];
}

/** Redondea a 2 decimales (pesos). */
export function redondear(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Regla 2: Ventas Galones = LecturaFinal - LecturaInicial - Calibración. */
export function ventasGalones(l: LecturaInput): number {
  return l.lecturaFinal - l.lecturaInicial - l.calibracion;
}

/** Regla 3: Ventas Pesos = VentasGalones × Precio (2 decimales). */
export function ventasPesos(l: LecturaInput): number {
  return redondear(ventasGalones(l) * l.precio);
}

/** Suma de ventas en pesos de un conjunto de lecturas. */
export function totalVentasPesos(lecturas: LecturaInput[]): number {
  return redondear(lecturas.reduce((acc, l) => acc + ventasPesos(l), 0));
}

/** Tarjetas = Credibanco + Redeban. */
export function totalTarjetas(pagos: PagoInput[]): number {
  return redondear(
    pagos
      .filter((p) => p.tipo === "CREDIBANCO" || p.tipo === "REDEBAN")
      .reduce((acc, p) => acc + p.valor, 0)
  );
}

export function totalTransportadora(pagos: PagoInput[]): number {
  return redondear(
    pagos.filter((p) => p.tipo === "TRANSPORTADORA").reduce((acc, p) => acc + p.valor, 0)
  );
}

export function totalVales(vales: number[]): number {
  return redondear(vales.reduce((acc, v) => acc + v, 0));
}

/** Faltantes netos = Σ(faltante - abono). */
export function totalFaltantesNetos(faltantes: FaltanteInput[]): number {
  return redondear(faltantes.reduce((acc, f) => acc + (f.faltante - f.abono), 0));
}

/**
 * Regla 5: TotalRegistrado = Efectivo + Tarjetas + Transportadora
 *          + TotalVales + TotalFaltantesNetos.
 */
export function totalRegistrado(a: ArqueoInput): number {
  return redondear(
    a.efectivo +
      totalTarjetas(a.pagos) +
      totalTransportadora(a.pagos) +
      totalVales(a.vales) +
      totalFaltantesNetos(a.faltantes)
  );
}

/** Comprobación = TotalVentasPesos - TotalRegistrado. Debe ser exactamente $0. */
export function comprobacion(totalVentas: number, a: ArqueoInput): number {
  return redondear(redondear(totalVentas) - totalRegistrado(a));
}

/** true si la comprobación cuadra exactamente en $0. */
export function arqueoCuadrado(totalVentas: number, a: ArqueoInput): boolean {
  return comprobacion(totalVentas, a) === 0;
}

/**
 * Regla 4 (validaciones duras). Devuelve lista de errores (vacía si es válido).
 * - Todos los valores ≥ 0.
 * - LecturaFinal ≥ LecturaInicial.
 * - Calibración ≤ (LecturaFinal - LecturaInicial).
 */
export function validarLectura(l: LecturaInput): string[] {
  const errores: string[] = [];
  if (l.lecturaInicial < 0) errores.push("La lectura inicial no puede ser negativa");
  if (l.lecturaFinal < 0) errores.push("La lectura final no puede ser negativa");
  if (l.calibracion < 0) errores.push("La calibración no puede ser negativa");
  if (l.precio < 0) errores.push("El precio no puede ser negativo");
  if (l.lecturaFinal < l.lecturaInicial)
    errores.push("La lectura final debe ser mayor o igual a la inicial");
  if (l.calibracion > l.lecturaFinal - l.lecturaInicial)
    errores.push("La calibración no puede superar la diferencia entre lecturas");
  return errores;
}

// ── Módulo 2: inventarios ──────────────────────────────────────────────

/** Porcentaje de la existencia teórica que dispara la alerta de merma. */
export const UMBRAL_MERMA_PCT = 0.005;

/** Mínimo absoluto (galones) para la alerta; evita ruido con cifras pequeñas. */
export const UMBRAL_MERMA_MIN_GAL = 1;

/** Existencia Teórica = Inventario Inicial + Compras - Ventas. */
export function existenciaTeorica(inicial: number, compras: number, ventas: number): number {
  return inicial + compras - ventas;
}

/** Variación = Inventario Físico - Existencia Teórica. */
export function variacion(fisico: number, teorica: number): number {
  return fisico - teorica;
}

/**
 * Alerta de merma: |variación| > max(UMBRAL_MERMA_MIN_GAL, UMBRAL_MERMA_PCT ×
 * |teórica|). Una variación alta sugiere fuga o robo.
 */
export function alertaMerma(variacionGal: number, teorica: number): boolean {
  const umbral = Math.max(UMBRAL_MERMA_MIN_GAL, UMBRAL_MERMA_PCT * Math.abs(teorica));
  return Math.abs(variacionGal) > umbral;
}

// ── Módulo 3: cartera ──────────────────────────────────────────────────

/** Los 7 rangos de mora del Excel CARTERA POR VECIMIENTO. */
export type RangoAging = "0-30" | "31-60" | "61-90" | "91-120" | "121-180" | "181-360" | ">360";

/** Clasifica los días de mora (desde la emisión de la factura) en su rango. */
export function rangoAging(dias: number): RangoAging {
  if (dias <= 30) return "0-30";
  if (dias <= 60) return "31-60";
  if (dias <= 90) return "61-90";
  if (dias <= 120) return "91-120";
  if (dias <= 180) return "121-180";
  if (dias <= 360) return "181-360";
  return ">360";
}

export type Semaforo = "verde" | "ambar" | "rojo";

/**
 * Semáforo de mora: ≤30 verde, 31–90 ámbar, >90 rojo.
 * (3 umbrales del PDF mapeados a los 3 colores semánticos de marca; el detalle
 * fino lo da `rangoAging`.)
 */
export function semaforoAging(dias: number): Semaforo {
  if (dias <= 30) return "verde";
  if (dias <= 90) return "ambar";
  return "rojo";
}

/**
 * Recaudo FIFO: los abonos matan primero la factura más vieja.
 * `facturas` debe venir ordenada por fecha de emisión ascendente.
 * Devuelve el saldo pendiente de cada factura.
 */
export function aplicarFifo(
  facturas: { id: string; total: number }[],
  totalAbonos: number
): Map<string, number> {
  const pendiente = new Map<string, number>();
  let restante = totalAbonos;
  for (const f of facturas) {
    const cubierto = Math.min(Math.max(restante, 0), f.total);
    restante -= cubierto;
    pendiente.set(f.id, redondear(f.total - cubierto));
  }
  return pendiente;
}

/** Saldo actual del cliente = total vales (créditos) − total abonos. */
export function saldoCliente(totalVales: number, totalAbonos: number): number {
  return redondear(totalVales - totalAbonos);
}

// ── Módulo 4: financiero ───────────────────────────────────────────────

/** Margen por Galón = P/VENTA − P/COMPRA − FLETE (2 decimales). */
export function margenPorGalon(pVenta: number, pCompra: number, flete: number): number {
  return redondear(pVenta - pCompra - flete);
}

/** Utilidad Bruta Proyectada = Margen por Galón × galones acumulados del mes. */
export function utilidadBruta(margen: number, galones: number): number {
  return redondear(margen * galones);
}
