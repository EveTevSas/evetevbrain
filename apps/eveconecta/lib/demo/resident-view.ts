import type { DashboardSnapshot } from "@/lib/contracts";
import { formatCop } from "@/lib/contracts";

export interface ResidentIdentity {
  name: string;
  unit: string;
}

export function createResidentSnapshot(
  source: DashboardSnapshot,
  identity: ResidentIdentity
): DashboardSnapshot {
  const snapshot = structuredClone(source);
  const matchesUnit = (unit: string) => Boolean(identity.unit) && unit === identity.unit;

  snapshot.fees = snapshot.fees.filter((item) => matchesUnit(item.unit));
  snapshot.people = snapshot.people.filter((item) => matchesUnit(item.unit));
  snapshot.pets = (snapshot.pets ?? []).filter((item) => matchesUnit(item.unit));
  snapshot.cases = snapshot.cases.filter((item) => matchesUnit(item.unit));
  snapshot.reservations = snapshot.reservations.filter((item) => matchesUnit(item.unit));
  snapshot.visitors = snapshot.visitors.filter((item) => matchesUnit(item.unit));
  snapshot.parkingSpots = (snapshot.parkingSpots ?? []).filter(
    (item) => matchesUnit(item.linkedUnit ?? "") || matchesUnit(item.assignedUnit ?? "")
  );
  snapshot.vehicles = (snapshot.vehicles ?? []).filter((item) => matchesUnit(item.unit));
  snapshot.vehicleAccessEvents = (snapshot.vehicleAccessEvents ?? []).filter((item) =>
    matchesUnit(item.unit ?? "")
  );
  snapshot.workOrders = [];
  snapshot.expenses = [];
  snapshot.audit = [];
  snapshot.portfolio = [];
  snapshot.documents = snapshot.documents.filter((item) => item.visibility === "residents");
  snapshot.assemblies = snapshot.assemblies.map((assembly) => ({
    ...assembly,
    dossier: assembly.dossier
      ? {
          ...assembly.dossier,
          documents: assembly.dossier.documents.filter(
            (document) => document.status === "published"
          )
        }
      : undefined
  }));

  const balanceMinor = snapshot.fees.reduce((total, fee) => total + fee.balanceMinor, 0);
  const nextDueDate = snapshot.fees
    .filter((fee) => fee.balanceMinor > 0)
    .map((fee) => fee.dueDate)
    .sort()[0];

  snapshot.metrics = [
    {
      label: "Mi saldo pendiente",
      value: formatCop(balanceMinor),
      detail: `${snapshot.fees.filter((fee) => fee.balanceMinor > 0).length} obligaciones`,
      trend: balanceMinor > 0 ? "neutral" : "up"
    },
    {
      label: "Próximo vencimiento",
      value: nextDueDate ?? "Al día",
      detail: nextDueDate ? "Consulta el detalle en Finanzas" : "Sin pagos pendientes",
      trend: "neutral"
    },
    {
      label: "Mis solicitudes",
      value: String(snapshot.cases.filter((item) => item.status !== "resolved").length),
      detail: "PQRS activas",
      trend: "neutral"
    },
    {
      label: "Mis reservas",
      value: String(snapshot.reservations.filter((item) => item.status !== "cancelled").length),
      detail: "Próximas reservas",
      trend: "neutral"
    }
  ];

  snapshot.currentUser.name = identity.name;
  return snapshot;
}
