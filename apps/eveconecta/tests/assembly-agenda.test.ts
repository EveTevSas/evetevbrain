import { describe, expect, it } from "vitest";
import { parseAgendaThreshold } from "@/lib/assemblies";
import {
  createAgendaItemSchema,
  reorderAgendaSchema,
  updateAgendaItemSchema
} from "@/lib/contracts";

describe("parseAgendaThreshold", () => {
  it("accepts a whole number", () => {
    expect(parseAgendaThreshold("50")).toBe(50);
  });

  it("accepts a decimal with a comma", () => {
    expect(parseAgendaThreshold("70,5")).toBe(70.5);
  });

  it("accepts a decimal with a dot", () => {
    expect(parseAgendaThreshold("70.5")).toBe(70.5);
  });

  it("trims surrounding whitespace", () => {
    expect(parseAgendaThreshold("  50  ")).toBe(50);
  });

  it("rejects a value with trailing garbage instead of silently truncating it", () => {
    expect(parseAgendaThreshold("50.5.5")).toBeNull();
  });

  it("rejects a value with a trailing letter", () => {
    expect(parseAgendaThreshold("50x")).toBeNull();
  });

  it("rejects a comma-separated list", () => {
    expect(parseAgendaThreshold("1,2,3")).toBeNull();
  });

  it("rejects zero", () => {
    expect(parseAgendaThreshold("0")).toBeNull();
  });

  it("rejects an empty string", () => {
    expect(parseAgendaThreshold("")).toBeNull();
  });

  it("rejects a negative number", () => {
    expect(parseAgendaThreshold("-10")).toBeNull();
  });
});

describe("createAgendaItemSchema", () => {
  it("accepts a non-informative item with a voting rule and threshold", () => {
    const result = createAgendaItemSchema.safeParse({
      title: "Aprobación del presupuesto 2027",
      decisionType: "economic",
      votingRule: "coefficient",
      thresholdPercent: 50
    });
    expect(result.success).toBe(true);
  });

  it("rejects an informative item with a voting rule", () => {
    const result = createAgendaItemSchema.safeParse({
      title: "Presentación del plan de seguridad",
      decisionType: "informative",
      votingRule: "unit",
      thresholdPercent: null
    });
    expect(result.success).toBe(false);
  });

  it("accepts an informative item without a voting rule or threshold", () => {
    const result = createAgendaItemSchema.safeParse({
      title: "Presentación del plan de seguridad",
      decisionType: "informative",
      votingRule: "none",
      thresholdPercent: null
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-informative item without a threshold", () => {
    const result = createAgendaItemSchema.safeParse({
      title: "Elección de órganos de administración",
      decisionType: "qualified",
      votingRule: "qualified_coefficient",
      thresholdPercent: null
    });
    expect(result.success).toBe(false);
  });

  it("rejects a qualified majority at or below 50%", () => {
    const result = createAgendaItemSchema.safeParse({
      title: "Elección de órganos de administración",
      decisionType: "qualified",
      votingRule: "qualified_coefficient",
      thresholdPercent: 50
    });
    expect(result.success).toBe(false);
  });

  it("accepts a qualified majority above 50%", () => {
    const result = createAgendaItemSchema.safeParse({
      title: "Elección de órganos de administración",
      decisionType: "qualified",
      votingRule: "qualified_coefficient",
      thresholdPercent: 70
    });
    expect(result.success).toBe(true);
  });

  it("rejects a title shorter than five characters", () => {
    const result = createAgendaItemSchema.safeParse({
      title: "Algo",
      decisionType: "informative",
      votingRule: "none",
      thresholdPercent: null
    });
    expect(result.success).toBe(false);
  });
});

describe("updateAgendaItemSchema", () => {
  it("accepts draft and ready statuses", () => {
    for (const status of ["draft", "ready"] as const) {
      const result = updateAgendaItemSchema.safeParse({
        title: "Aprobación de estados financieros",
        decisionType: "economic",
        votingRule: "coefficient",
        thresholdPercent: 50,
        status
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects setting the status to voted manually", () => {
    const result = updateAgendaItemSchema.safeParse({
      title: "Aprobación de estados financieros",
      decisionType: "economic",
      votingRule: "coefficient",
      thresholdPercent: 50,
      status: "voted"
    });
    expect(result.success).toBe(false);
  });
});

describe("reorderAgendaSchema", () => {
  it("accepts a non-empty list of ids", () => {
    const result = reorderAgendaSchema.safeParse({
      orderedIds: ["11111111-1111-4111-8111-111111111111"]
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty list", () => {
    const result = reorderAgendaSchema.safeParse({ orderedIds: [] });
    expect(result.success).toBe(false);
  });
});
