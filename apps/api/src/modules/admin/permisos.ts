import { Role } from "../identidad/roles";

/**
 * Qué rol interno puede hacer qué en la consola (spec `rbac-operativo`).
 *
 * Una sola tabla, en código: con tres roles fijos, ponerla en la base sería
 * configuración que nadie cambia sin un deploy de todos modos, y aquí queda
 * versionada, testeada y a la vista. La consola tiene una copia para ocultar
 * botones; la que manda es esta, en la API.
 *
 * Lo que separa a `ops` de `finanzas` es la dispersión: quien prepara un lote
 * no lo aprueba ni lo paga. `super_admin` puede todo, pero el cuatro ojos
 * (preparó ≠ aprobó) lo valida la base sin mirar el rol.
 */
export type Accion =
  | "leer"
  | "comercios.escribir"
  | "proveedores.salud"
  | "pagos.reverificar"
  | "conciliacion.correr"
  | "consignaciones.registrar"
  | "recaudo.saldo"
  | "tarifas.escribir"
  | "dispersion.politica"
  | "lotes.preparar"
  | "lotes.aprobar"
  | "lotes.pagar"
  | "retenciones.liberar_primer_cobro"
  | "retenciones.liberar_reserva"
  | "retenciones.liberar_riesgo"
  | "riesgo.reglas"
  | "riesgo.listas";

const TODOS: Role[] = [Role.SUPER_ADMIN, Role.OPS, Role.FINANZAS];
const OPS: Role[] = [Role.SUPER_ADMIN, Role.OPS];
const FINANZAS: Role[] = [Role.SUPER_ADMIN, Role.FINANZAS];
const SOLO_SUPER: Role[] = [Role.SUPER_ADMIN];

export const PERMISOS: Record<Accion, Role[]> = {
  leer: TODOS,
  "comercios.escribir": OPS,
  "proveedores.salud": OPS,
  "pagos.reverificar": OPS,
  "conciliacion.correr": OPS,
  "consignaciones.registrar": TODOS,
  "recaudo.saldo": FINANZAS,
  "tarifas.escribir": SOLO_SUPER,
  "dispersion.politica": SOLO_SUPER,
  "lotes.preparar": OPS,
  "lotes.aprobar": FINANZAS,
  "lotes.pagar": FINANZAS,
  "retenciones.liberar_primer_cobro": TODOS,
  "retenciones.liberar_reserva": FINANZAS,
  "retenciones.liberar_riesgo": TODOS,
  "riesgo.reglas": SOLO_SUPER,
  "riesgo.listas": OPS
};

export function puede(role: string, accion: Accion): boolean {
  return (PERMISOS[accion] as string[]).includes(role);
}

export function rolesPara(accion: Accion): Role[] {
  return PERMISOS[accion];
}
