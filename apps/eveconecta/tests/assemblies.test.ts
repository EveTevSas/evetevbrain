import {
  ASSEMBLY_CAPABILITY_DEFINITIONS,
  assemblyReadinessPercent,
  createAssemblyDossier,
  normalizeAssemblySettings
} from "@/lib/assemblies";
import type { AssemblyItem } from "@/lib/contracts";
import { describe, expect, it } from "vitest";

const assembly: AssemblyItem = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Asamblea ordinaria de prueba",
  date: "2026-09-20T14:00:00.000Z",
  mode: "Híbrida",
  type: "ordinary",
  location: "Salón social y videoconferencia",
  agenda: "Verificación del quórum, informes y votaciones.",
  quorumPercent: 0,
  representedUnits: 0,
  totalUnits: 50,
  status: "scheduled",
  openVotes: 0
};

describe("assembly workspace", () => {
  it("enables every capability by default", () => {
    const settings = normalizeAssemblySettings();

    expect(Object.keys(settings.capabilities)).toHaveLength(ASSEMBLY_CAPABILITY_DEFINITIONS.length);
    expect(Object.values(settings.capabilities).every(Boolean)).toBe(true);
  });

  it("keeps an explicitly disabled tenant capability", () => {
    const settings = normalizeAssemblySettings({
      capabilities: {
        ...normalizeAssemblySettings().capabilities,
        secret_ballots: false
      }
    });

    expect(settings.capabilities.secret_ballots).toBe(false);
    expect(settings.capabilities.proxy_management).toBe(true);
  });

  it("excludes inactive capabilities from the readiness denominator", () => {
    const dossier = createAssemblyDossier(assembly);
    const fullSettings = normalizeAssemblySettings();
    const withoutDocuments = normalizeAssemblySettings({
      capabilities: {
        ...fullSettings.capabilities,
        document_repository: false
      }
    });

    expect(assemblyReadinessPercent(dossier, withoutDocuments.capabilities)).toBeGreaterThan(
      assemblyReadinessPercent(dossier, fullSettings.capabilities)
    );
  });

  it("locks the agenda of an extraordinary assembly", () => {
    const dossier = createAssemblyDossier({ ...assembly, type: "extraordinary" });
    expect(dossier.agendaLocked).toBe(true);
  });
});
