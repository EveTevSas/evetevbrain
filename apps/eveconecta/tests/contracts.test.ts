import {
  createAnnouncementSchema,
  createCaseSchema,
  createExpenseSchema,
  createParkingSpotSchema,
  createPetSchema,
  createRegisteredVehicleSchema,
  formatCop,
  registerVehicleAccessSchema,
  scheduleAssemblySchema,
  updateCommunityPersonSchema,
  updatePetPhotoSchema
} from "@/lib/contracts";
import { describe, expect, it } from "vitest";

describe("web contract helpers", () => {
  it("validates a future hybrid assembly", () => {
    expect(
      scheduleAssemblySchema.parse({
        title: "Asamblea extraordinaria de presupuesto",
        type: "extraordinary",
        mode: "hybrid",
        startsAt: "2099-08-15T22:00:00.000Z",
        location: "Salón social · https://reunion.ejemplo.com/asamblea",
        agenda: "Verificación del quórum, presentación del presupuesto y votación de la propuesta."
      })
    ).toMatchObject({ type: "extraordinary", mode: "hybrid" });
  });

  it("rejects a past assembly and an insecure virtual link", () => {
    expect(() =>
      scheduleAssemblySchema.parse({
        title: "Asamblea ordinaria",
        type: "ordinary",
        mode: "virtual",
        startsAt: "2020-08-15T22:00:00.000Z",
        location: "reunion.ejemplo.com/asamblea",
        agenda: "Verificación del quórum y presentación de los informes administrativos."
      })
    ).toThrow();
  });

  it("accepts up to three private images for a PQRS case", () => {
    const prefix =
      "11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    expect(
      createCaseSchema.parse({
        title: "Humedad en el pasillo comunal",
        category: "Mantenimiento",
        requester: "Laura Mendoza",
        unit: "T1 · 301",
        priority: "medium",
        imagePaths: [`${prefix}/1.jpg`, `${prefix}/2.webp`, `${prefix}/3.png`]
      }).imagePaths
    ).toHaveLength(3);
  });

  it("rejects more than three images for a PQRS case", () => {
    const prefix =
      "11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    expect(() =>
      createCaseSchema.parse({
        title: "Humedad en el pasillo comunal",
        category: "Mantenimiento",
        requester: "Laura Mendoza",
        unit: "T1 · 301",
        priority: "medium",
        imagePaths: [`${prefix}/1.jpg`, `${prefix}/2.jpg`, `${prefix}/3.jpg`, `${prefix}/1.png`]
      })
    ).toThrow();
  });

  it("validates a multichannel announcement", () => {
    expect(
      createAnnouncementSchema.parse({
        title: "Cierre temporal de la piscina",
        message: "La piscina estará cerrada durante la jornada de mantenimiento preventivo.",
        audience: "all_residents",
        channels: ["app", "email"],
        publicationMode: "publish_now",
        scheduledAt: null
      })
    ).toMatchObject({ channels: ["app", "email"], publicationMode: "publish_now" });
  });

  it("rejects a scheduled announcement without a future date", () => {
    expect(() =>
      createAnnouncementSchema.parse({
        title: "Cierre temporal de la piscina",
        message: "La piscina estará cerrada durante la jornada de mantenimiento preventivo.",
        audience: "all_residents",
        channels: ["app"],
        publicationMode: "schedule",
        scheduledAt: null
      })
    ).toThrow();
  });

  it("formats minor COP units without decimals", () => {
    expect(formatCop(48_500_000)).toContain("485.000");
  });

  it("validates a new expense request", () => {
    expect(
      createExpenseSchema.parse({
        concept: "Reparación de motobomba",
        provider: "Hidrosistemas Ltda.",
        providerIdentification: "900.000.101-1",
        budgetLine: "Mantenimiento",
        amountMinor: 485_000_000
      })
    ).toMatchObject({ budgetLine: "Mantenimiento", amountMinor: 485_000_000 });
  });

  it("rejects expenses without a positive amount", () => {
    expect(() =>
      createExpenseSchema.parse({
        concept: "Reparación de motobomba",
        provider: "Hidrosistemas Ltda.",
        providerIdentification: "900.000.101-1",
        budgetLine: "Mantenimiento",
        amountMinor: 0
      })
    ).toThrow();
  });

  it("validates updates to a community person", () => {
    expect(
      updateCommunityPersonSchema.parse({
        name: "Laura Mendoza",
        identificationType: "cc",
        identificationNumber: "1010000001",
        unit: "T1 · 301",
        kind: "owner",
        contact: "laura@example.com · +57 300 555 0131",
        vehicles: 1,
        status: "active"
      })
    ).toMatchObject({ name: "Laura Mendoza", kind: "owner" });
  });

  it("supports both parking identification systems", () => {
    expect(
      createParkingSpotSchema.parse({
        code: "L1-5",
        kind: "zone",
        sector: "L1",
        number: "5",
        linkedUnit: null,
        status: "available"
      })
    ).toMatchObject({ kind: "zone", code: "L1-5" });
    expect(
      createParkingSpotSchema.parse({
        code: "C18-2",
        kind: "unit",
        sector: null,
        number: "2",
        linkedUnit: "Casa 18",
        status: "available"
      })
    ).toMatchObject({ kind: "unit", linkedUnit: "Casa 18" });
  });

  it("rejects an incomplete parking identification", () => {
    expect(() =>
      createParkingSpotSchema.parse({
        code: "L1-5",
        kind: "zone",
        sector: null,
        number: "5",
        linkedUnit: null,
        status: "available"
      })
    ).toThrow();
  });

  it("normalizes vehicle plates at the API boundary", () => {
    expect(
      createRegisteredVehicleSchema.parse({
        plate: "abc123",
        kind: "car",
        brand: "Renault",
        color: "Gris",
        validUntil: null
      }).plate
    ).toBe("ABC123");
    expect(registerVehicleAccessSchema.parse({ plate: "xyz987", direction: "entry" }).plate).toBe(
      "XYZ987"
    );
  });

  it("rejects vehicle ownership and access fields supplied by the client", () => {
    expect(() =>
      createRegisteredVehicleSchema.parse({
        plate: "ABC123",
        kind: "car",
        brand: "Renault",
        color: "Gris",
        validUntil: null,
        personId: "11111111-1111-4111-8111-111111111111",
        accessStatus: "authorized"
      })
    ).toThrow();
  });

  it("validates a resident pet record", () => {
    expect(
      createPetSchema.parse({
        type: "dog",
        birthYear: 2021,
        size: "medium",
        name: "Milo",
        status: "active"
      })
    ).toMatchObject({ type: "dog", name: "Milo", status: "active" });
  });

  it("rejects a future pet birth year", () => {
    expect(() =>
      createPetSchema.parse({
        type: "cat",
        birthYear: new Date().getFullYear() + 1,
        size: "small",
        name: "Luna",
        status: "active"
      })
    ).toThrow();
  });

  it("validates the private storage path of a pet photo", () => {
    expect(
      updatePetPhotoSchema.parse({
        photoPath:
          "11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/perfil.webp"
      })
    ).toMatchObject({ photoPath: expect.stringContaining("/perfil.webp") });
  });

  it("rejects external URLs as pet photo paths", () => {
    expect(() =>
      updatePetPhotoSchema.parse({ photoPath: "https://example.com/mascota.jpg" })
    ).toThrow();
  });
});
