import { createAssemblyDossier, normalizeAssembly } from "@/lib/assemblies";
import { communityContactChannels } from "@/lib/community-contacts";
import {
  sendAssemblyEmailConvocationSchema,
  type AssemblyItem,
  type CommunityPerson
} from "@/lib/contracts";
import { describe, expect, it } from "vitest";

const assembly: AssemblyItem = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Asamblea ordinaria",
  date: "2026-09-20T14:00:00.000Z",
  mode: "Híbrida",
  type: "ordinary",
  location: "Salón social",
  agenda: "Informe de gestión y presupuesto.",
  quorumPercent: 0,
  representedUnits: 0,
  totalUnits: 50,
  status: "scheduled",
  openVotes: 0
};

const person: CommunityPerson = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Laura Mendoza",
  identificationType: "cc",
  identificationNumber: "1010000001",
  unit: "T1 · 301",
  kind: "owner",
  contact: "laura.mendoza@demo.evetev.invalid · +57 300 555 0131",
  vehicles: 1,
  pets: 1,
  status: "active"
};

describe("assembly email convocation", () => {
  it("extracts email and phone from existing combined contact data", () => {
    expect(communityContactChannels(person)).toEqual({
      email: "laura.mendoza@demo.evetev.invalid",
      phone: "+57 300 555 0131",
      hasEmail: true,
      hasPhone: true
    });
  });

  it("prefers explicit email and phone fields", () => {
    expect(
      communityContactChannels({
        ...person,
        email: "contacto@ejemplo.com",
        phone: "+57 310 000 0000"
      })
    ).toMatchObject({
      email: "contacto@ejemplo.com",
      phone: "+57 310 000 0000"
    });
  });

  it("validates a non-empty, bounded recipient selection", () => {
    expect(sendAssemblyEmailConvocationSchema.safeParse({ personIds: [person.id] }).success).toBe(
      true
    );
    expect(sendAssemblyEmailConvocationSchema.safeParse({ personIds: [] }).success).toBe(false);
    expect(
      sendAssemblyEmailConvocationSchema.safeParse({ personIds: ["not-a-uuid"] }).success
    ).toBe(false);
  });

  it("normalizes older dossiers without recipient delivery records", () => {
    const dossier = createAssemblyDossier(assembly);
    const legacy = {
      ...assembly,
      dossier: {
        ...dossier,
        convocationRecipients: undefined,
        checklist: dossier.checklist.map((item) =>
          item.id === "convocation-sent"
            ? { ...item, label: "Convocatoria enviada a propietarios" }
            : item
        )
      }
    } as unknown as AssemblyItem;

    const normalized = normalizeAssembly(legacy).dossier;
    expect(normalized.convocationRecipients).toEqual([]);
    expect(normalized.checklist.find((item) => item.id === "convocation-sent")?.label).toBe(
      "Convocatoria enviada a residentes registrados"
    );
  });
});
