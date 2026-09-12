import { describe, expect, it } from "vitest";
import {
  ASSEMBLY_PROXY_MAX_BYTES,
  assemblyProxyPath,
  validateAssemblyProxy
} from "@/lib/assembly-proxies";
import { accreditAssemblyAttendeeSchema } from "@/lib/contracts";

function buildFile(type: string, size: number): File {
  return new File([new Uint8Array(Math.max(size, 0))], "poder.pdf", { type });
}

describe("validateAssemblyProxy", () => {
  it("accepts a PDF within the size limit", () => {
    expect(validateAssemblyProxy(buildFile("application/pdf", 1024))).toBeNull();
  });

  it("rejects an unsupported format", () => {
    expect(validateAssemblyProxy(buildFile("image/gif", 1024))).toMatch(/PDF, JPG o PNG/);
  });

  it("rejects a file over the size limit", () => {
    expect(
      validateAssemblyProxy(buildFile("application/pdf", ASSEMBLY_PROXY_MAX_BYTES + 1))
    ).toMatch(/máximo 5 MB/);
  });

  it("rejects an empty file", () => {
    expect(validateAssemblyProxy(buildFile("application/pdf", 0))).toMatch(/vacío/);
  });
});

describe("assemblyProxyPath", () => {
  it("builds a tenant, assembly and upload scoped path", () => {
    const path = assemblyProxyPath("tenant-1", "assembly-1", "upload-1", "application/pdf");
    expect(path).toBe("tenant-1/assembly-1/upload-1.pdf");
  });

  it("throws for an unsupported mime type", () => {
    expect(() => assemblyProxyPath("tenant-1", "assembly-1", "upload-1", "image/gif")).toThrow();
  });
});

describe("accreditAssemblyAttendeeSchema", () => {
  const base = {
    personaId: "11111111-1111-4111-8111-111111111111",
    canal: "presencial" as const
  };

  it("accepts a propietario tied to a unit", () => {
    const result = accreditAssemblyAttendeeSchema.safeParse({
      ...base,
      calidad: "propietario",
      unidadCodigo: "A-101"
    });
    expect(result.success).toBe(true);
  });

  it("rejects a propietario without a unit", () => {
    const result = accreditAssemblyAttendeeSchema.safeParse({
      ...base,
      calidad: "propietario",
      unidadCodigo: null
    });
    expect(result.success).toBe(false);
  });

  it("requires representaPersonaId for apoderado", () => {
    const result = accreditAssemblyAttendeeSchema.safeParse({
      ...base,
      calidad: "apoderado",
      unidadCodigo: "A-101"
    });
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed apoderado", () => {
    const result = accreditAssemblyAttendeeSchema.safeParse({
      ...base,
      calidad: "apoderado",
      unidadCodigo: "A-101",
      representaPersonaId: "22222222-2222-4222-8222-222222222222"
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invitado with a unit", () => {
    const result = accreditAssemblyAttendeeSchema.safeParse({
      ...base,
      calidad: "invitado",
      unidadCodigo: "A-101"
    });
    expect(result.success).toBe(false);
  });

  it("accepts an invitado without a unit", () => {
    const result = accreditAssemblyAttendeeSchema.safeParse({
      ...base,
      calidad: "invitado",
      unidadCodigo: null
    });
    expect(result.success).toBe(true);
  });

  it("rejects a residente_con_voz with representation", () => {
    const result = accreditAssemblyAttendeeSchema.safeParse({
      ...base,
      calidad: "residente_con_voz",
      unidadCodigo: "A-101",
      representaPersonaId: "22222222-2222-4222-8222-222222222222"
    });
    expect(result.success).toBe(false);
  });
});
