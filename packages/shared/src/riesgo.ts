import { z } from "zod";

/**
 * Motor de reglas de riesgo del comercio (spec `riesgo-comercio`).
 *
 * Determinista y en enteros: recibe las señales que la base calculó, las
 * reglas configuradas y el monto, y dice qué hacer. Vive aquí porque la API
 * lo corre antes de llamar al proveedor y la consola lo puede simular con las
 * mismas reglas: una regla que se lee distinto en dos sitios es una regla
 * que no se puede probar en shadow.
 */

export const TipoReglaRiesgoSchema = z.enum([
  "limite_transaccion",
  "limite_diario",
  "limite_mensual",
  "monto_atipico"
]);
export type TipoReglaRiesgo = z.infer<typeof TipoReglaRiesgoSchema>;

export const AccionRiesgoSchema = z.enum(["rechazar", "retener"]);
export type AccionRiesgo = z.infer<typeof AccionRiesgoSchema>;

export const ModoReglaSchema = z.enum(["activa", "shadow", "inactiva"]);
export type ModoRegla = z.infer<typeof ModoReglaSchema>;

const ParametrosLimite = z.object({ limiteMinor: z.number().int().positive() });
const ParametrosAtipico = z.object({
  /** El monto se compara contra factor × ticket promedio. */
  factor: z.number().int().min(2).max(100),
  /** Sin este mínimo de cobros el promedio no dice nada y la regla no aplica. */
  minimoCobros: z.number().int().min(1).max(10_000)
});

export const ReglaRiesgoSchema = z
  .object({
    nombre: z.string().trim().min(3).max(120),
    tipo: TipoReglaRiesgoSchema,
    /** null = global; un comercio con regla propia del mismo tipo reemplaza la global. */
    tenantId: z.string().uuid().nullable(),
    parametros: z.union([ParametrosLimite, ParametrosAtipico]),
    accion: AccionRiesgoSchema,
    modo: ModoReglaSchema,
    prioridad: z.number().int().min(0).max(1000)
  })
  .superRefine((r, ctx) => {
    const esAtipico = r.tipo === "monto_atipico";
    const trae = "factor" in r.parametros;
    if (esAtipico !== trae) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parametros"],
        message: esAtipico
          ? "monto_atipico necesita factor y minimoCobros"
          : "un límite necesita limiteMinor"
      });
    }
  });
export type ReglaRiesgo = z.infer<typeof ReglaRiesgoSchema>;

/** Lo que la base sabe del comercio en el momento del cobro. */
export interface SenalesRiesgo {
  /** Cobrado hoy (no fallido), en la unidad mínima. */
  hoyMinor: number;
  /** Cobrado este mes (no fallido). */
  mesMinor: number;
  /** Promedio de los cobros aprobados o conciliados; 0 si no hay. */
  ticketPromedioMinor: number;
  /** Cuántos cobros aprobados o conciliados tiene. */
  cobrosHistoricos: number;
}

export type DecisionRiesgo = "permitir" | "retener" | "rechazar";

export interface ReglaDisparada {
  id: string;
  nombre: string;
  tipo: TipoReglaRiesgo;
  modo: ModoRegla;
  accion: AccionRiesgo;
  /** true si la regla decidió; false si estaba en shadow y solo se registró. */
  actuo: boolean;
  detalle: string;
}

export interface ResultadoRiesgo {
  decision: DecisionRiesgo;
  disparadas: ReglaDisparada[];
}

function dispara(regla: ReglaRiesgo, montoMinor: number, s: SenalesRiesgo): string | null {
  const p = regla.parametros;
  switch (regla.tipo) {
    case "limite_transaccion":
      return "limiteMinor" in p && montoMinor > p.limiteMinor
        ? `monto ${montoMinor} > límite ${p.limiteMinor}`
        : null;
    case "limite_diario":
      return "limiteMinor" in p && montoMinor + s.hoyMinor > p.limiteMinor
        ? `monto ${montoMinor} + hoy ${s.hoyMinor} > límite ${p.limiteMinor}`
        : null;
    case "limite_mensual":
      return "limiteMinor" in p && montoMinor + s.mesMinor > p.limiteMinor
        ? `monto ${montoMinor} + mes ${s.mesMinor} > límite ${p.limiteMinor}`
        : null;
    case "monto_atipico": {
      if (!("factor" in p)) return null;
      if (s.cobrosHistoricos < p.minimoCobros || s.ticketPromedioMinor <= 0) return null;
      const umbral = s.ticketPromedioMinor * p.factor;
      return montoMinor > umbral
        ? `monto ${montoMinor} > ${p.factor}× ticket promedio ${s.ticketPromedioMinor} (${umbral})`
        : null;
    }
  }
}

/**
 * Evalúa un cobro. Las reglas inactivas no cuentan; una regla propia del
 * comercio reemplaza a la global de su tipo; las shadow se registran sin
 * actuar; si actúan varias, rechazar gana a retener.
 */
export function evaluarRiesgo(
  montoMinor: number,
  senales: SenalesRiesgo,
  reglas: (ReglaRiesgo & { id: string })[]
): ResultadoRiesgo {
  const vigentes = reglas.filter((r) => r.modo !== "inactiva");
  const tiposPropios = new Set(vigentes.filter((r) => r.tenantId !== null).map((r) => r.tipo));
  const aplicables = vigentes
    .filter((r) => r.tenantId !== null || !tiposPropios.has(r.tipo))
    .sort((a, b) => a.prioridad - b.prioridad);

  const disparadas: ReglaDisparada[] = [];
  let decision: DecisionRiesgo = "permitir";
  for (const regla of aplicables) {
    const detalle = dispara(regla, montoMinor, senales);
    if (!detalle) continue;
    const actuo = regla.modo === "activa";
    disparadas.push({
      id: regla.id,
      nombre: regla.nombre,
      tipo: regla.tipo,
      modo: regla.modo,
      accion: regla.accion,
      actuo,
      detalle
    });
    if (actuo) {
      if (regla.accion === "rechazar") decision = "rechazar";
      else if (decision === "permitir") decision = "retener";
    }
  }
  return { decision, disparadas };
}
