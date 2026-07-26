import { Badge } from "@/lib/ui";

const labels: Record<string, string> = {
  active: "Activo",
  approved: "Aprobado",
  cached: "Datos locales",
  cancelled: "Cancelada",
  closed: "Cerrada",
  completed: "Completada",
  confirmed: "Confirmada",
  critical: "Crítica",
  current: "Vigente",
  declined: "Rechazado",
  departed: "Salió",
  draft: "Borrador",
  expected: "Esperado",
  expiring: "Por vencer",
  high: "Alta",
  in_progress: "En curso",
  inside: "Adentro",
  invited: "Invitado",
  low: "Baja",
  medium: "Media",
  open: "Abierto",
  overdue: "Vencido",
  paid: "Pagado",
  pending: "Pendiente",
  pending_approval: "Por aprobar",
  planned: "Programada",
  published: "Publicado",
  reconciled: "Conciliado",
  resolved: "Resuelto",
  routine: "Rutina",
  scheduled: "Programada",
  success: "Correcto"
};

export function StatusBadge({ status }: { status: string }) {
  const tone = [
    "active",
    "approved",
    "completed",
    "confirmed",
    "current",
    "paid",
    "published",
    "reconciled",
    "resolved",
    "success"
  ].includes(status)
    ? "success"
    : ["critical", "declined", "high", "overdue"].includes(status)
      ? "danger"
      : ["expiring", "medium", "pending", "pending_approval", "planned", "scheduled"].includes(
            status
          )
        ? "warning"
        : ["in_progress", "inside", "open"].includes(status)
          ? "info"
          : "neutral";
  return <Badge tone={tone}>{labels[status] ?? status}</Badge>;
}
