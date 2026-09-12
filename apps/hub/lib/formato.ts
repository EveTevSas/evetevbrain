/** Monto en la unidad mínima. COP a valor face, sin decimales inventados. */
export function formatoMonto(montoMinor: number, moneda = "COP"): string {
  if (moneda === "COP") return `$ ${Math.round(montoMinor).toLocaleString("es-CO")}`;
  return `${(montoMinor / 100).toLocaleString("es-CO", { minimumFractionDigits: 2 })} ${moneda}`;
}

/** $ 32.4M para tarjetas grandes; el exacto va en el título. */
export function montoCorto(montoMinor: number): string {
  const abs = Math.abs(montoMinor);
  const signo = montoMinor < 0 ? "−" : "";
  if (abs >= 1_000_000_000) return `${signo}$ ${(abs / 1_000_000_000).toFixed(1)}MM`;
  if (abs >= 1_000_000) return `${signo}$ ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${signo}$ ${Math.round(abs / 1_000)}K`;
  return `${signo}$ ${abs}`;
}

export const pct = (n: number, d: number, decimales = 1): string =>
  d === 0 ? "—" : `${((n / d) * 100).toFixed(decimales)} %`;

export const nombreMes = (isoMes: string): string =>
  new Date(`${isoMes}T12:00:00`).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
