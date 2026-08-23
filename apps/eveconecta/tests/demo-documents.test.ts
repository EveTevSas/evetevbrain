import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const documentFiles = [
  "reglamento-propiedad-horizontal.pdf",
  "manual-convivencia-2026.pdf",
  "poliza-areas-comunes.pdf",
  "presupuesto-aprobado-2026.pdf",
  "acta-asamblea-ordinaria-2026.pdf"
];

describe("demo document library", () => {
  it.each(documentFiles)("publishes %s as a non-empty PDF", (filename) => {
    const path = join(process.cwd(), "public", "demo", "documentos", filename);
    const signature = readFileSync(path).subarray(0, 5).toString("ascii");

    expect(signature).toBe("%PDF-");
    expect(statSync(path).size).toBeGreaterThan(10_000);
  });
});
