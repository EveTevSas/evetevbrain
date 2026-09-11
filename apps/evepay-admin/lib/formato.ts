/** Monto en la unidad mínima. Para COP el valor face: no se inventan decimales. */
export function formatoMonto(montoMinor: number, moneda: string): string {
  if (moneda === "COP") {
    return `$ ${montoMinor.toLocaleString("es-CO")}`;
  }
  return `${(montoMinor / 100).toLocaleString("es-CO", { minimumFractionDigits: 2 })} ${moneda}`;
}
