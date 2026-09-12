import { randomUUID } from "node:crypto";
import type { ReglaRiesgo, ResultadoRiesgo, SenalesRiesgo } from "@evetev/shared";
import type {
  CasoRiesgo,
  Coincidencia,
  DocumentoAVerificar,
  EntradaLista,
  Evaluacion,
  ReglaGuardada,
  ResumenRiesgo,
  RiesgoRepository
} from "./riesgo.repository";

const SIN_SENALES: SenalesRiesgo = {
  hoyMinor: 0,
  mesMinor: 0,
  ticketPromedioMinor: 0,
  cobrosHistoricos: 0
};

/**
 * Adaptador en memoria. Las señales las pone el test (`senalesDe`); lo demás
 * se guarda como en Postgres para afirmar sobre lo que quedó.
 */
export class InMemoryRiesgoRepository implements RiesgoRepository {
  readonly reglas: ReglaGuardada[] = [];
  readonly evaluaciones: Evaluacion[] = [];
  readonly retenciones: {
    id: string;
    paymentId: string;
    evaluacionId: string;
    motivo: string;
    actor: string;
  }[] = [];
  readonly lista: EntradaLista[] = [];
  readonly senalesDe = new Map<string, SenalesRiesgo>();

  async senales(tenantId: string): Promise<SenalesRiesgo> {
    return this.senalesDe.get(tenantId) ?? SIN_SENALES;
  }

  async reglasDe(tenantId: string): Promise<(ReglaRiesgo & { id: string })[]> {
    return this.reglas.filter(
      (r) => (r.tenantId === null || r.tenantId === tenantId) && r.modo !== "inactiva"
    );
  }

  async registrarEvaluacion(args: {
    tenantId: string;
    paymentId: string | null;
    montoMinor: number;
    resultado: ResultadoRiesgo;
    senales: SenalesRiesgo;
  }): Promise<string> {
    const ev: Evaluacion = {
      id: randomUUID(),
      tenantId: args.tenantId,
      tenantNombre: "comercio",
      paymentId: args.paymentId,
      referencia: null,
      montoMinor: args.montoMinor,
      decision: args.resultado.decision,
      reglasDisparadas: args.resultado.disparadas,
      senales: args.senales,
      creadaEn: new Date().toISOString()
    };
    this.evaluaciones.push(ev);
    return ev.id;
  }

  async retenerPorRiesgo(args: {
    paymentId: string;
    evaluacionId: string;
    motivo: string;
    actor: string;
  }): Promise<string> {
    const previa = this.retenciones.find((r) => r.paymentId === args.paymentId);
    if (previa) return previa.id;
    const r = { id: randomUUID(), ...args };
    this.retenciones.push(r);
    return r.id;
  }

  async listarReglas(): Promise<ReglaGuardada[]> {
    return [...this.reglas];
  }

  async guardarRegla(id: string | null, regla: ReglaRiesgo, actor: string): Promise<string> {
    const ahora = new Date().toISOString();
    if (id) {
      const i = this.reglas.findIndex((r) => r.id === id);
      if (i < 0) throw new Error("La regla no existe");
      this.reglas[i] = {
        ...this.reglas[i]!,
        ...regla,
        actualizadaPor: actor,
        actualizadaEn: ahora
      };
      return id;
    }
    const nueva: ReglaGuardada = {
      ...regla,
      id: randomUUID(),
      tenantNombre: null,
      creadaPor: actor,
      creadaEn: ahora,
      actualizadaPor: actor,
      actualizadaEn: ahora,
      disparos30d: 0,
      disparosHoy: 0,
      retenciones30d: 0,
      liberadas30d: 0
    };
    this.reglas.push(nueva);
    return nueva.id;
  }

  async listarEvaluaciones(tenantId?: string, limite = 100): Promise<Evaluacion[]> {
    return this.evaluaciones
      .filter((e) => !tenantId || e.tenantId === tenantId)
      .slice(-limite)
      .reverse();
  }

  async resumenRiesgo(): Promise<ResumenRiesgo> {
    const hoy = new Date().toISOString().slice(0, 10);
    const deHoy = this.evaluaciones.filter((e) => e.creadaEn.startsWith(hoy));
    return {
      evaluadasHoy: deHoy.length,
      rechazadasHoy: deHoy.filter((e) => e.decision === "rechazar").length,
      retenidasHoy: deHoy.filter((e) => e.decision === "retener").length,
      enCola: (await this.colaRiesgo()).length,
      shadowHoy: deHoy.filter((e) => e.reglasDisparadas.some((d) => !d.actuo)).length
    };
  }

  async colaRiesgo(): Promise<CasoRiesgo[]> {
    return this.retenciones.map((r) => {
      const ev = this.evaluaciones.find((e) => e.id === r.evaluacionId);
      return {
        retencionId: r.id,
        tenantId: ev?.tenantId ?? "",
        tenantNombre: "comercio",
        paymentId: r.paymentId,
        referencia: "",
        estadoCobro: "pendiente",
        montoCobroMinor: ev?.montoMinor ?? 0,
        montoRetenidoMinor: ev?.montoMinor ?? 0,
        motivo: r.motivo,
        creadaEn: new Date().toISOString(),
        evaluacionId: r.evaluacionId,
        reglasDisparadas: ev?.reglasDisparadas ?? [],
        senales: ev?.senales ?? {}
      };
    });
  }

  async listarLista(): Promise<EntradaLista[]> {
    return [...this.lista];
  }

  async agregarALista(
    e: Omit<EntradaLista, "id" | "activa" | "agregadaPor" | "agregadaEn">,
    actor: string
  ): Promise<string> {
    const entrada: EntradaLista = {
      ...e,
      numeroDocumento: e.numeroDocumento.replace(/[.\s-]/g, ""),
      id: randomUUID(),
      activa: true,
      agregadaPor: actor,
      agregadaEn: new Date().toISOString()
    };
    this.lista.push(entrada);
    return entrada.id;
  }

  async desactivarDeLista(id: string, _actor: string): Promise<void> {
    const e = this.lista.find((x) => x.id === id);
    if (e) e.activa = false;
  }

  async coincidencias(docs: DocumentoAVerificar[]): Promise<Coincidencia[]> {
    const out: Coincidencia[] = [];
    for (const d of docs) {
      const numero = d.numero.replace(/[.\s-]/g, "");
      for (const e of this.lista) {
        if (e.activa && e.tipoDocumento === d.tipo && e.numeroDocumento === numero) {
          out.push({
            quien: d.quien,
            tipoDocumento: e.tipoDocumento,
            numeroDocumento: e.numeroDocumento,
            nombre: e.nombre,
            fuente: e.fuente,
            motivo: e.motivo
          });
        }
      }
    }
    return out;
  }
}
