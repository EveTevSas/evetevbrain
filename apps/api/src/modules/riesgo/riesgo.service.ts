import { ConflictException, Inject, Injectable } from "@nestjs/common";
import {
  evaluarRiesgo,
  type ResultadoRiesgo,
  type SenalesRiesgo,
  type SenalesTarjeta,
  type TipoReglaRiesgo
} from "@evetev/shared";

/** Reglas que leen lo que el proveedor cuenta de la tarjeta al aprobar. */
const TIPOS_TARJETA: ReadonlySet<TipoReglaRiesgo> = new Set([
  "geo_mismatch",
  "intentos_tarjeta",
  "score_proveedor"
]);
/** Las reglas del comercio, que ya corrieron antes de crear el cobro. */
const TIPOS_COMERCIO: ReadonlySet<TipoReglaRiesgo> = new Set([
  "limite_transaccion",
  "limite_diario",
  "limite_mensual",
  "monto_atipico"
]);
import {
  RIESGO_REPOSITORY,
  type Coincidencia,
  type DocumentoAVerificar,
  type RiesgoRepository
} from "./riesgo.repository";

export interface EvaluacionPrevia {
  resultado: ResultadoRiesgo;
  senales: SenalesRiesgo;
}

/**
 * Riesgo del comercio en el flujo del cobro (spec `riesgo-comercio`).
 *
 * `evaluar` corre ANTES de llamar al proveedor: si una regla activa dice
 * rechazar, el cobro no se crea. Lo demás (permitir o retener) se registra
 * DESPUÉS de crear el cobro, con su id, para que la evaluación diga de qué
 * cobro habla; retener además crea la retención que lo saca de la dispersión
 * hasta que alguien lo revise.
 */
@Injectable()
export class RiesgoService {
  constructor(@Inject(RIESGO_REPOSITORY) private readonly repo: RiesgoRepository) {}

  async evaluar(tenantId: string, montoMinor: number): Promise<EvaluacionPrevia> {
    const [senales, reglas] = await Promise.all([
      this.repo.senales(tenantId),
      this.repo.reglasDe(tenantId)
    ]);
    // Antes de crear el cobro solo hay señales del comercio: las de tarjeta
    // llegan con la aprobación y se evalúan en `evaluarPostEvento`.
    return {
      resultado: evaluarRiesgo(
        montoMinor,
        senales,
        reglas.filter((r) => TIPOS_COMERCIO.has(r.tipo))
      ),
      senales
    };
  }

  /**
   * Antifraude de tarjeta (spec reembolsos-contracargos CA-5): corre al
   * aprobarse el cobro con lo que el proveedor contó de la tarjeta. Con
   * checkout alojado ya no se puede rechazar; lo que se protege es la salida
   * del dinero, así que toda regla que actúe retiene. Sin señales, no hay nada
   * que evaluar y no se guarda nada.
   */
  async evaluarPostEvento(
    tenantId: string,
    paymentId: string,
    montoMinor: number,
    tarjeta: SenalesTarjeta | undefined,
    actor: string
  ): Promise<ResultadoRiesgo | null> {
    if (!tarjeta || Object.keys(tarjeta).length === 0) return null;
    const [base, reglas] = await Promise.all([
      this.repo.senales(tenantId),
      this.repo.reglasDe(tenantId)
    ]);
    const reglasTarjeta = reglas.filter((r) => TIPOS_TARJETA.has(r.tipo));
    if (reglasTarjeta.length === 0) return null;
    const senales = { ...base, tarjeta };
    const bruto = evaluarRiesgo(montoMinor, senales, reglasTarjeta);
    const resultado: ResultadoRiesgo = {
      decision: bruto.disparadas.some((d) => d.actuo) ? "retener" : "permitir",
      disparadas: bruto.disparadas
    };
    const evaluacionId = await this.repo.registrarEvaluacion({
      tenantId,
      paymentId,
      montoMinor,
      resultado,
      senales
    });
    if (resultado.decision === "retener") {
      const motivo = resultado.disparadas
        .filter((d) => d.actuo)
        .map((d) => `${d.nombre}: ${d.detalle}`)
        .join("; ");
      await this.repo.retenerPorRiesgo({
        paymentId,
        evaluacionId,
        motivo,
        actor: `riesgo:${actor}`
      });
    }
    return resultado;
  }

  /** Guarda la evaluación de un cobro rechazado (sin cobro) y arma el 409. */
  async rechazar(tenantId: string, montoMinor: number, previa: EvaluacionPrevia): Promise<never> {
    await this.repo.registrarEvaluacion({
      tenantId,
      paymentId: null,
      montoMinor,
      resultado: previa.resultado,
      senales: previa.senales
    });
    const reglas = previa.resultado.disparadas
      .filter((d) => d.actuo && d.accion === "rechazar")
      .map((d) => `${d.nombre} (${d.detalle})`)
      .join("; ");
    throw new ConflictException(`El cobro fue rechazado por riesgo: ${reglas}.`);
  }

  /** Registra la evaluación del cobro creado y, si toca, lo retiene. */
  async registrar(
    tenantId: string,
    paymentId: string,
    montoMinor: number,
    previa: EvaluacionPrevia,
    actor: string
  ): Promise<void> {
    const evaluacionId = await this.repo.registrarEvaluacion({
      tenantId,
      paymentId,
      montoMinor,
      resultado: previa.resultado,
      senales: previa.senales
    });
    if (previa.resultado.decision === "retener") {
      const motivo = previa.resultado.disparadas
        .filter((d) => d.actuo && d.accion === "retener")
        .map((d) => `${d.nombre}: ${d.detalle}`)
        .join("; ");
      await this.repo.retenerPorRiesgo({
        paymentId,
        evaluacionId,
        motivo,
        actor: `riesgo:${actor}`
      });
    }
  }

  /** Cruce SARLAFT: coincidencias activas de los documentos de un alta. */
  async coincidencias(docs: DocumentoAVerificar[]): Promise<Coincidencia[]> {
    return this.repo.coincidencias(docs.filter((d) => d.numero.trim() !== ""));
  }
}
