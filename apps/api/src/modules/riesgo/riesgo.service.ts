import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { evaluarRiesgo, type ResultadoRiesgo, type SenalesRiesgo } from "@evetev/shared";
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
    return { resultado: evaluarRiesgo(montoMinor, senales, reglas), senales };
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
