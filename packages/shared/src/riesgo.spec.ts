import { describe, expect, it } from "vitest";
import { evaluarRiesgo, ReglaRiesgoSchema, type ReglaRiesgo, type SenalesRiesgo } from "./riesgo";

const SIN_HISTORIAL: SenalesRiesgo = {
  hoyMinor: 0,
  mesMinor: 0,
  ticketPromedioMinor: 0,
  cobrosHistoricos: 0
};
const CON_HISTORIAL: SenalesRiesgo = {
  hoyMinor: 300_000,
  mesMinor: 4_000_000,
  ticketPromedioMinor: 100_000,
  cobrosHistoricos: 25
};

function regla(parcial: Partial<ReglaRiesgo> & { id: string }): ReglaRiesgo & { id: string } {
  return {
    nombre: "regla",
    tipo: "limite_transaccion",
    tenantId: null,
    parametros: { limiteMinor: 1_000_000 },
    accion: "rechazar",
    modo: "activa",
    prioridad: 100,
    ...parcial
  };
}

describe("evaluarRiesgo — límites (CA-5)", () => {
  it("por transacción: dispara solo por encima del límite", () => {
    const reglas = [regla({ id: "r1" })];
    expect(evaluarRiesgo(1_000_000, SIN_HISTORIAL, reglas).decision).toBe("permitir");
    expect(evaluarRiesgo(1_000_001, SIN_HISTORIAL, reglas)).toMatchObject({
      decision: "rechazar",
      disparadas: [{ id: "r1", actuo: true, accion: "rechazar" }]
    });
  });

  it("diario y mensual suman lo ya cobrado", () => {
    const diario = [
      regla({ id: "d", tipo: "limite_diario", parametros: { limiteMinor: 500_000 } })
    ];
    // 300 000 cobrados hoy + 200 000 = 500 000: no supera; 200 001 sí.
    expect(evaluarRiesgo(200_000, CON_HISTORIAL, diario).decision).toBe("permitir");
    expect(evaluarRiesgo(200_001, CON_HISTORIAL, diario).decision).toBe("rechazar");

    const mensual = [
      regla({ id: "m", tipo: "limite_mensual", parametros: { limiteMinor: 4_500_000 } })
    ];
    expect(evaluarRiesgo(500_000, CON_HISTORIAL, mensual).decision).toBe("permitir");
    expect(evaluarRiesgo(500_001, CON_HISTORIAL, mensual).decision).toBe("rechazar");
  });
});

describe("evaluarRiesgo — monto atípico (CA-6)", () => {
  const atipico = [
    regla({
      id: "a",
      tipo: "monto_atipico",
      parametros: { factor: 5, minimoCobros: 10 },
      accion: "retener"
    })
  ];

  it("retiene por encima de factor × ticket promedio", () => {
    expect(evaluarRiesgo(500_000, CON_HISTORIAL, atipico).decision).toBe("permitir");
    expect(evaluarRiesgo(500_001, CON_HISTORIAL, atipico)).toMatchObject({
      decision: "retener",
      disparadas: [
        { tipo: "monto_atipico", detalle: expect.stringMatching(/5× ticket promedio 100000/) }
      ]
    });
  });

  it("sin historial suficiente no aplica: el promedio de tres cobros no dice nada", () => {
    expect(evaluarRiesgo(50_000_000, SIN_HISTORIAL, atipico).decision).toBe("permitir");
    expect(
      evaluarRiesgo(50_000_000, { ...CON_HISTORIAL, cobrosHistoricos: 9 }, atipico).decision
    ).toBe("permitir");
  });
});

describe("evaluarRiesgo — modos y prioridades", () => {
  it("CA-2: una regla shadow se registra pero no actúa", () => {
    const r = evaluarRiesgo(5_000_000, SIN_HISTORIAL, [regla({ id: "s", modo: "shadow" })]);
    expect(r.decision).toBe("permitir");
    expect(r.disparadas).toEqual([
      expect.objectContaining({ id: "s", actuo: false, modo: "shadow" })
    ]);
  });

  it("una regla inactiva ni se registra", () => {
    expect(
      evaluarRiesgo(5_000_000, SIN_HISTORIAL, [regla({ id: "i", modo: "inactiva" })]).disparadas
    ).toEqual([]);
  });

  it("si disparan rechazar y retener, gana rechazar", () => {
    const r = evaluarRiesgo(5_000_000, CON_HISTORIAL, [
      regla({
        id: "a",
        tipo: "monto_atipico",
        parametros: { factor: 5, minimoCobros: 10 },
        accion: "retener",
        prioridad: 1
      }),
      regla({ id: "l", prioridad: 2 })
    ]);
    expect(r.decision).toBe("rechazar");
    expect(r.disparadas.map((d) => d.id)).toEqual(["a", "l"]);
  });

  /* CA-7: el límite propio del comercio (más alto o más bajo) vale en lugar del
     global. Un colegio que cobra matrículas no puede quedar atado al límite
     pensado para un parqueadero. */
  it("CA-7: la regla del comercio reemplaza a la global del mismo tipo", () => {
    const tenant = "11111111-1111-4111-8111-111111111111";
    const reglas = [
      regla({ id: "global", parametros: { limiteMinor: 1_000_000 } }),
      regla({ id: "propia", tenantId: tenant, parametros: { limiteMinor: 10_000_000 } })
    ];
    expect(evaluarRiesgo(5_000_000, SIN_HISTORIAL, reglas).decision).toBe("permitir");
    expect(evaluarRiesgo(10_000_001, SIN_HISTORIAL, reglas).disparadas.map((d) => d.id)).toEqual([
      "propia"
    ]);
  });
});

describe("ReglaRiesgoSchema (CA-8)", () => {
  it("exige los parámetros del tipo", () => {
    const base = {
      nombre: "Límite",
      tenantId: null,
      accion: "rechazar",
      modo: "shadow",
      prioridad: 100
    };
    expect(
      ReglaRiesgoSchema.safeParse({
        ...base,
        tipo: "limite_diario",
        parametros: { limiteMinor: 100 }
      }).success
    ).toBe(true);
    expect(
      ReglaRiesgoSchema.safeParse({
        ...base,
        tipo: "limite_diario",
        parametros: { factor: 5, minimoCobros: 10 }
      }).success
    ).toBe(false);
    expect(
      ReglaRiesgoSchema.safeParse({
        ...base,
        tipo: "monto_atipico",
        parametros: { limiteMinor: 100 }
      }).success
    ).toBe(false);
    expect(
      ReglaRiesgoSchema.safeParse({
        ...base,
        tipo: "monto_atipico",
        parametros: { factor: 1, minimoCobros: 10 }
      }).success
    ).toBe(false);
    expect(
      ReglaRiesgoSchema.safeParse({
        ...base,
        tipo: "monto_atipico",
        parametros: { factor: 5, minimoCobros: 10 }
      }).success
    ).toBe(true);
  });
});
