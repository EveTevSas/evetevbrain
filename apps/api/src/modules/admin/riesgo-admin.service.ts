import { Inject, Injectable } from "@nestjs/common";
import type { ReglaRiesgo } from "@evetev/shared";
import {
  RIESGO_REPOSITORY,
  type CasoRiesgo,
  type Coincidencia,
  type DocumentoAVerificar,
  type EntradaLista,
  type Evaluacion,
  type ReglaGuardada,
  type ResumenRiesgo,
  type RiesgoRepository
} from "../riesgo/riesgo.repository";

/** Riesgo del comercio para la consola (spec `riesgo-comercio`): reglas, evaluaciones, cola y lista restrictiva. */
@Injectable()
export class RiesgoAdminService {
  constructor(@Inject(RIESGO_REPOSITORY) private readonly repo: RiesgoRepository) {}

  listarReglas(): Promise<ReglaGuardada[]> {
    return this.repo.listarReglas();
  }

  async guardarRegla(id: string | null, regla: ReglaRiesgo, actor: string): Promise<ReglaGuardada> {
    const guardadaId = await this.repo.guardarRegla(id, regla, actor);
    const reglas = await this.repo.listarReglas();
    const guardada = reglas.find((r) => r.id === guardadaId);
    if (!guardada) throw new Error("La regla guardada no aparece en el listado.");
    return guardada;
  }

  listarEvaluaciones(tenantId?: string, limite?: number): Promise<Evaluacion[]> {
    return this.repo.listarEvaluaciones(tenantId, limite);
  }

  colaRiesgo(): Promise<CasoRiesgo[]> {
    return this.repo.colaRiesgo();
  }

  resumen(): Promise<ResumenRiesgo> {
    return this.repo.resumenRiesgo();
  }

  listarLista(): Promise<EntradaLista[]> {
    return this.repo.listarLista();
  }

  agregarALista(
    entrada: Omit<EntradaLista, "id" | "activa" | "agregadaPor" | "agregadaEn">,
    actor: string
  ): Promise<string> {
    return this.repo.agregarALista(entrada, actor);
  }

  desactivarDeLista(id: string, actor: string): Promise<void> {
    return this.repo.desactivarDeLista(id, actor);
  }

  coincidencias(docs: DocumentoAVerificar[]): Promise<Coincidencia[]> {
    return this.repo.coincidencias(docs);
  }
}
