/**
 * Lectura y formato de tarifas en la consola.
 *
 * El cálculo del dinero NO vive aquí: la vista previa y las acciones usan
 * `desglosarCobro` y `validarTarifa*` de @evetev/shared, los mismos que la
 * API (CA-9). Aquí solo se traduce lo que la persona escribe (porcentaje con
 * coma, pesos) al contrato (puntos básicos, unidad mínima) y de vuelta.
 */

/** Cobro con el que se explica una tarifa: $50.000 COP, el ejemplo de la spec. */
export const COBRO_DE_REFERENCIA = 50_000;

/** 290 bps → "2,9 %". */
export function porcentaje(bps: number): string {
  return `${(bps / 100).toLocaleString("es-CO", { maximumFractionDigits: 2 })} %`;
}

/** "2,9", "2.90" o " 2,9 % " → 290. NaN si no es un número. */
export function porcentajeABps(texto: string): number {
  const limpio = texto.replace("%", "").trim().replace(",", ".");
  if (limpio === "") return NaN;
  const n = Number(limpio);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

/** Un monto tal como se digita ("1.200", "1200", "") → número; vacío es 0. */
export function montoDigitado(texto: string): number {
  const limpio = texto
    .replace(/[.\s$]/g, "")
    .replace(",", ".")
    .trim();
  if (limpio === "") return 0;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : NaN;
}

/** Lo que va al esquema TarifaComercioSchema; la validación es suya. */
export function leerTarifaComercio(f: FormData): {
  bps: number;
  fijoMinor: number;
  ivaBps: number;
} {
  return {
    bps: porcentajeABps(String(f.get("porcentaje") ?? "")),
    fijoMinor: montoDigitado(String(f.get("fijo") ?? "")),
    ivaBps: Number(f.get("ivaBps") ?? NaN)
  };
}

/** Lo que va al esquema TarifaProveedorSchema. */
export function leerTarifaProveedor(f: FormData): {
  bps: number;
  fijoMinor: number;
  descuentaEnConsignacion: boolean;
} {
  return {
    bps: porcentajeABps(String(f.get("porcentaje") ?? "")),
    fijoMinor: montoDigitado(String(f.get("fijo") ?? "")),
    descuentaEnConsignacion: f.get("descuentaEnConsignacion") === "true"
  };
}

const NOMBRES_DE_CAMPO: Record<string, string> = {
  bps: "Porcentaje",
  fijoMinor: "Fijo",
  ivaBps: "IVA",
  descuentaEnConsignacion: "Consignación"
};

/** "bps: El porcentaje va…" → "Porcentaje: El porcentaje va…", en una línea. */
export function describirErrores(errores: string[]): string {
  return errores
    .map((e) => {
      const [campo, ...resto] = e.split(": ");
      return `${NOMBRES_DE_CAMPO[campo ?? ""] ?? campo}: ${resto.join(": ")}`;
    })
    .join(" · ");
}
