import type { EstadoCobro } from "@evetev/shared";

/** Estado inicial conceptual antes de crear el cobro en el proveedor. */
export const ESTADO_INICIAL: EstadoCobro = "creado";

/**
 * Máquina de estados del cobro (§2):
 *   creado → pendiente → aprobado | fallido → conciliado
 */
const TRANSICIONES: Record<EstadoCobro, readonly EstadoCobro[]> = {
  creado: ["pendiente", "fallido"],
  pendiente: ["aprobado", "fallido"],
  aprobado: ["conciliado"],
  fallido: [],
  conciliado: []
};

export function puedeTransicionar(desde: EstadoCobro, hacia: EstadoCobro): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

export class TransicionInvalidaError extends Error {
  constructor(desde: EstadoCobro, hacia: EstadoCobro) {
    super(`Transición de estado inválida: ${desde} → ${hacia}`);
    this.name = "TransicionInvalidaError";
  }
}
