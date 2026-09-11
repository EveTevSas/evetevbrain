import type { ReglaRiesgo, ResultadoRiesgo, SenalesRiesgo } from "@evetev/shared";

/**
 * Persistencia del riesgo del comercio (spec `riesgo-comercio`). Las reglas
 * son configuración auditada; las evaluaciones son inmutables; la retención
 * de riesgo es la de `dispersion` con tipo `riesgo`.
 */

export type ReglaGuardada = ReglaRiesgo & {
  id: string;
  tenantNombre: string | null;
  creadaPor: string;
  creadaEn: string;
  actualizadaPor: string;
  actualizadaEn: string;
  disparos30d: number;
};

export interface Evaluacion {
  id: string;
  tenantId: string;
  tenantNombre: string;
  paymentId: string | null;
  referencia: string | null;
  montoMinor: number;
  decision: ResultadoRiesgo["decision"];
  reglasDisparadas: ResultadoRiesgo["disparadas"];
  senales: SenalesRiesgo;
  creadaEn: string;
}

export interface CasoRiesgo {
  retencionId: string;
  tenantId: string;
  tenantNombre: string;
  paymentId: string;
  referencia: string;
  estadoCobro: string;
  montoCobroMinor: number;
  montoRetenidoMinor: number;
  motivo: string;
  creadaEn: string;
  evaluacionId: string | null;
  reglasDisparadas: ResultadoRiesgo["disparadas"];
  senales: Partial<SenalesRiesgo>;
}

export interface EntradaLista {
  id: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  fuente: "OFAC" | "ONU" | "PEP" | "interna";
  motivo: string | null;
  activa: boolean;
  agregadaPor: string;
  agregadaEn: string;
}

export interface DocumentoAVerificar {
  tipo: string;
  numero: string;
  /** Quién es dentro del alta: comercio, representante, beneficiario. */
  quien: string;
}

export interface Coincidencia {
  quien: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  fuente: string;
  motivo: string | null;
}

export interface RiesgoRepository {
  senales(tenantId: string): Promise<SenalesRiesgo>;
  /** Globales y propias del comercio, sin las inactivas. */
  reglasDe(tenantId: string): Promise<(ReglaRiesgo & { id: string })[]>;
  registrarEvaluacion(args: {
    tenantId: string;
    paymentId: string | null;
    montoMinor: number;
    resultado: ResultadoRiesgo;
    senales: SenalesRiesgo;
  }): Promise<string>;
  /** Retiene el cobro por riesgo; idempotente por cobro. Devuelve el id de la retención. */
  retenerPorRiesgo(args: {
    paymentId: string;
    evaluacionId: string;
    motivo: string;
    actor: string;
  }): Promise<string>;

  // --- consola ---
  listarReglas(): Promise<ReglaGuardada[]>;
  guardarRegla(id: string | null, regla: ReglaRiesgo, actor: string): Promise<string>;
  listarEvaluaciones(tenantId?: string, limite?: number): Promise<Evaluacion[]>;
  colaRiesgo(): Promise<CasoRiesgo[]>;
  listarLista(limite?: number): Promise<EntradaLista[]>;
  agregarALista(
    entrada: Omit<EntradaLista, "id" | "activa" | "agregadaPor" | "agregadaEn">,
    actor: string
  ): Promise<string>;
  desactivarDeLista(id: string, actor: string): Promise<void>;
  coincidencias(docs: DocumentoAVerificar[]): Promise<Coincidencia[]>;
}

export const RIESGO_REPOSITORY = Symbol("RIESGO_REPOSITORY");
