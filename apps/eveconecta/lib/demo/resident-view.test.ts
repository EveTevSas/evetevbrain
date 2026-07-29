import type { DashboardSnapshot } from "@/lib/contracts";
import { describe, expect, it } from "vitest";
import { createResidentSnapshot } from "./resident-view";

const source: DashboardSnapshot = {
  tenant: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Conjunto Demo",
    nit: "900000000-1",
    city: "Bogotá",
    units: 2,
    occupancyPercent: 100
  },
  currentUser: {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Administración",
    role: "Administración",
    initials: "AD"
  },
  metrics: [{ label: "Cartera", value: "$1 M", detail: "General", trend: "neutral" }],
  portfolio: [{ month: "Jul", collected: 10, billed: 12 }],
  fees: [
    {
      id: "fee-own",
      unit: "T1 · 301",
      resident: "Laura Mendoza",
      concept: "Administración",
      dueDate: "2026-07-10",
      amountMinor: 50000000,
      balanceMinor: 50000000,
      status: "pending"
    },
    {
      id: "fee-neighbor",
      unit: "T1 · 302",
      resident: "Vecina Privada",
      concept: "Administración",
      dueDate: "2026-07-10",
      amountMinor: 50000000,
      balanceMinor: 50000000,
      status: "overdue"
    }
  ],
  people: [
    {
      id: "person-own",
      name: "Laura Mendoza",
      unit: "T1 · 301",
      kind: "owner",
      contact: "laura@example.invalid",
      vehicles: 1,
      pets: 1,
      status: "active"
    },
    {
      id: "person-neighbor",
      name: "Vecina Privada",
      unit: "T1 · 302",
      kind: "owner",
      contact: "private@example.invalid",
      vehicles: 1,
      pets: 0,
      status: "active"
    }
  ],
  cases: [
    {
      id: "case-own",
      code: "PQRS-1",
      title: "Caso propio",
      category: "Administración",
      requester: "Laura Mendoza",
      unit: "T1 · 301",
      priority: "low",
      status: "open",
      slaHours: 48,
      elapsedHours: 1,
      createdAt: "2026-07-28T10:00:00-05:00"
    },
    {
      id: "case-neighbor",
      code: "PQRS-2",
      title: "Caso privado de vecina",
      category: "Convivencia",
      requester: "Vecina Privada",
      unit: "T1 · 302",
      priority: "high",
      status: "open",
      slaHours: 8,
      elapsedHours: 2,
      createdAt: "2026-07-28T11:00:00-05:00"
    }
  ],
  reservations: [
    {
      id: "reservation-own",
      amenity: "Salón",
      date: "2026-08-01",
      time: "18:00",
      resident: "Laura Mendoza",
      unit: "T1 · 301",
      amountMinor: 0,
      status: "confirmed"
    },
    {
      id: "reservation-neighbor",
      amenity: "BBQ",
      date: "2026-08-02",
      time: "12:00",
      resident: "Vecina Privada",
      unit: "T1 · 302",
      amountMinor: 0,
      status: "confirmed"
    }
  ],
  visitors: [
    {
      id: "visitor-own",
      name: "Visita propia",
      documentSuffix: "1234",
      unit: "T1 · 301",
      vehiclePlate: null,
      validFrom: "2026-07-28T10:00:00-05:00",
      validUntil: "2026-07-28T18:00:00-05:00",
      status: "expected",
      accessCode: "123456",
      offlineCreated: false
    },
    {
      id: "visitor-neighbor",
      name: "Visita privada",
      documentSuffix: "9876",
      unit: "T1 · 302",
      vehiclePlate: null,
      validFrom: "2026-07-28T10:00:00-05:00",
      validUntil: "2026-07-28T18:00:00-05:00",
      status: "expected",
      accessCode: "654321",
      offlineCreated: false
    }
  ],
  workOrders: [
    {
      id: "work-order",
      code: "OT-1",
      asset: "Activo",
      title: "Orden interna",
      provider: "Proveedor",
      scheduledDate: "2026-07-30",
      estimatedMinor: 10000000,
      status: "planned",
      priority: "routine"
    }
  ],
  expenses: [
    {
      id: "expense",
      concept: "Gasto interno",
      provider: "Proveedor",
      budgetLine: "Mantenimiento",
      amountMinor: 10000000,
      requestedBy: "Administración",
      approvals: 0,
      approvalsRequired: 2,
      status: "pending_approval",
      createdAt: "2026-07-28T10:00:00-05:00"
    }
  ],
  announcements: [
    {
      id: "announcement",
      title: "Aviso comunitario",
      audience: "Residentes",
      channel: "App",
      publishedAt: "2026-07-28T10:00:00-05:00",
      deliveryRate: 100,
      status: "published"
    }
  ],
  assemblies: [
    {
      id: "assembly",
      title: "Asamblea",
      date: "2026-08-10",
      mode: "Virtual",
      quorumPercent: 0,
      representedUnits: 0,
      totalUnits: 2,
      status: "scheduled",
      openVotes: 1
    }
  ],
  documents: [
    {
      id: "document-residents",
      name: "Reglamento.pdf",
      category: "Gobierno",
      version: 1,
      updatedAt: "2026-07-28T10:00:00-05:00",
      visibility: "residents",
      status: "current"
    },
    {
      id: "document-admin",
      name: "Documento privado.pdf",
      category: "Administración",
      version: 1,
      updatedAt: "2026-07-28T10:00:00-05:00",
      visibility: "administration",
      status: "current"
    }
  ],
  audit: [
    {
      id: "audit",
      occurredAt: "2026-07-28T10:00:00-05:00",
      actor: "Administración",
      action: "interno",
      resource: "Privado",
      detail: "Dato interno",
      result: "success"
    }
  ]
};

describe("resident snapshot", () => {
  it("only exposes records for the resident unit and public community content", () => {
    const view = createResidentSnapshot(source, { name: "Laura Mendoza", unit: "T1 · 301" });

    expect(view.fees.map((item) => item.id)).toEqual(["fee-own"]);
    expect(view.people.map((item) => item.id)).toEqual(["person-own"]);
    expect(view.cases.map((item) => item.id)).toEqual(["case-own"]);
    expect(view.reservations.map((item) => item.id)).toEqual(["reservation-own"]);
    expect(view.visitors.map((item) => item.id)).toEqual(["visitor-own"]);
    expect(view.documents.map((item) => item.id)).toEqual(["document-residents"]);
    expect(view.workOrders).toEqual([]);
    expect(view.expenses).toEqual([]);
    expect(view.audit).toEqual([]);
    expect(view.portfolio).toEqual([]);
    expect(view.announcements).toHaveLength(1);
    expect(view.assemblies).toHaveLength(1);
    expect(JSON.stringify(view)).not.toContain("Vecina Privada");
  });

  it("fails closed when the user has no unit metadata", () => {
    const view = createResidentSnapshot(source, { name: "Sin unidad", unit: "" });

    expect(view.fees).toEqual([]);
    expect(view.people).toEqual([]);
    expect(view.cases).toEqual([]);
    expect(view.reservations).toEqual([]);
    expect(view.visitors).toEqual([]);
  });
});
