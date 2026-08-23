import {
  ASSEMBLY_SUPPORT_MAX_BYTES,
  assemblySupportPath,
  formatSupportSize,
  validateAssemblySupport
} from "@/lib/assembly-supports";
import { createAssemblySupportSchema } from "@/lib/contracts";
import { describe, expect, it } from "vitest";

const conjuntoId = "11111111-1111-4111-8111-111111111111";
const assemblyId = "22222222-2222-4222-8222-222222222222";
const documentId = "33333333-3333-4333-8333-333333333333";

function supportFile(type: string, size: number) {
  return { type, size } as File;
}

describe("assembly supports", () => {
  it("builds a tenant, assembly and document scoped path", () => {
    expect(assemblySupportPath(conjuntoId, assemblyId, documentId, 2, "application/pdf")).toBe(
      `${conjuntoId}/${assemblyId}/${documentId}/v2.pdf`
    );
  });

  it("rejects unsupported, empty and oversized files", () => {
    expect(validateAssemblySupport(supportFile("text/plain", 100))).toMatch(/PDF/);
    expect(validateAssemblySupport(supportFile("application/pdf", 0))).toMatch(/vacío/);
    expect(
      validateAssemblySupport(supportFile("application/pdf", ASSEMBLY_SUPPORT_MAX_BYTES + 1))
    ).toMatch(/15 MB/);
  });

  it("accepts the five configured document families", () => {
    const types = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png"
    ];

    expect(types.map((type) => validateAssemblySupport(supportFile(type, 1024)))).toEqual(
      types.map(() => null)
    );
    expect(formatSupportSize(1024)).toBe("1 KB");
  });

  it("validates metadata and blocks paths outside the assembly contract", () => {
    const input = {
      documentId,
      name: "Estados financieros 2026.pdf",
      category: "financial_statements" as const,
      agendaItemId: null,
      version: 1,
      filePath: `${conjuntoId}/${assemblyId}/${documentId}/v1.pdf`,
      mimeType: "application/pdf" as const,
      sizeBytes: 2048
    };

    expect(createAssemblySupportSchema.safeParse(input).success).toBe(true);
    expect(
      createAssemblySupportSchema.safeParse({ ...input, filePath: `otro/${documentId}/v1.pdf` })
        .success
    ).toBe(false);
  });
});
