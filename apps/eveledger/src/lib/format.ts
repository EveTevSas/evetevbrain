// Utilidades de formato para la UI (es-CO).

export function formatoPesos(n: number): string {
  return n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatoGalones(n: number): string {
  return n.toLocaleString("es-CO", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  });
}

/** Fecha (guardada como medianoche UTC) a "dd/mm/aaaa". */
export function formatoFecha(fecha: Date): string {
  return fecha.toLocaleDateString("es-CO", { timeZone: "UTC" });
}

/** Date → "aaaa-mm-dd" (UTC) para inputs type=date. */
export function fechaAInput(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/** "aaaa-mm-dd" → Date en medianoche UTC. */
export function inputAFecha(s: string): Date {
  return new Date(`${s}T00:00:00Z`);
}

export function hoyInput(): string {
  return new Date().toISOString().slice(0, 10);
}
