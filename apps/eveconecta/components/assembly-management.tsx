"use client";

import {
  ASSEMBLY_CAPABILITY_DEFINITIONS,
  ASSEMBLY_STAGES,
  assemblyReadinessPercent,
  enabledChecklist,
  normalizeAssembly,
  normalizeAssemblySettings,
  stageProgressPercent
} from "@/lib/assemblies";
import type {
  AssemblyCapabilities,
  AssemblyItem,
  AssemblySettings,
  AssemblyStage,
  AssemblySupportDocument,
  CommunityPerson,
  CreateAssemblySupport,
  SendAssemblyEmailConvocation,
  UpdateAssemblyCapabilities,
  UpdateAssemblyChecklist,
  UpdateAssemblySupportStatus
} from "@/lib/contracts";
import { Badge, Button, Card, EmptyState, Progress, cn } from "@/lib/ui";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  Fingerprint,
  Gauge,
  History,
  Landmark,
  ListChecks,
  LockKeyhole,
  MailCheck,
  MessageSquareText,
  Settings2,
  ShieldCheck,
  Signature,
  SlidersHorizontal,
  UsersRound,
  Vote
} from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "./modal";
import { StatusBadge } from "./status-badge";
import { AssemblySupportPanel } from "./assembly-supports";
import { AssemblyConvocationPanel } from "./assembly-convocation";

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit"
});
const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric"
});

const stageIcons: Record<AssemblyStage, typeof ClipboardCheck> = {
  preparation: ClipboardCheck,
  convocation: BellRing,
  registration: Fingerprint,
  live: Vote,
  minutes: Signature,
  follow_up: ListChecks
};

const votingRuleLabels = {
  none: "Sin votación",
  unit: "Un voto por unidad",
  coefficient: "Por coeficiente representado",
  qualified_coefficient: "Mayoría calificada · total de coeficientes"
} as const;

function formatDateTime(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return dateFormatter.format(new Date(`${value}T12:00:00`));
  }
  return dateTimeFormatter.format(new Date(value));
}

function statusTone(status: string): "success" | "warning" | "info" | "neutral" {
  if (["ready", "published", "completed", "closed"].includes(status)) return "success";
  if (["pending", "in_progress", "open", "in_review"].includes(status)) return "warning";
  if (["draft", "not_started"].includes(status)) return "neutral";
  return "info";
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    ready: "Listo",
    published: "Publicado",
    pending: "Pendiente",
    completed: "Completada",
    in_progress: "En curso",
    open: "Abierta",
    closed: "Cerrada",
    draft: "Borrador",
    not_started: "Sin iniciar",
    in_review: "En revisión"
  };
  return labels[status] ?? status;
}

function typeLabel(type: AssemblyItem["type"]): string {
  if (type === "ordinary") return "Ordinaria";
  if (type === "extraordinary") return "Extraordinaria";
  return "Informativa";
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--wash)]/45 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-[var(--ink)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p>
    </div>
  );
}

function CapabilityNotice({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--wash)]/55 p-5 text-sm text-[var(--muted)]">
      <div className="flex items-center gap-2 font-bold text-[var(--ink)]">
        <SlidersHorizontal size={17} className="text-[var(--accent)]" />
        {label} no está activo para esta copropiedad
      </div>
      <p className="mt-1.5 leading-5">
        La etapa sigue disponible, pero esta capacidad fue inactivada desde la configuración de
        Asambleas.
      </p>
    </div>
  );
}

function Checklist({
  assembly,
  stage,
  capabilities,
  canManage,
  busy,
  onToggle
}: {
  assembly: AssemblyItem & { dossier: NonNullable<AssemblyItem["dossier"]> };
  stage: AssemblyStage;
  capabilities: AssemblyCapabilities;
  canManage: boolean;
  busy: string | null;
  onToggle: (assemblyId: string, input: UpdateAssemblyChecklist) => Promise<AssemblyItem | null>;
}) {
  const items = enabledChecklist(assembly.dossier, capabilities).filter(
    (item) => item.stage === stage
  );
  if (!items.length) return null;
  return (
    <Card className="p-5 hover:translate-y-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold">Lista de control</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Cada cambio queda registrado en auditoría.
          </p>
        </div>
        <Badge tone={items.every((item) => item.completed) ? "success" : "warning"}>
          {items.filter((item) => item.completed).length} de {items.length}
        </Badge>
      </div>
      <div className="mt-4 divide-y divide-[var(--line)]">
        {items.map((item) => {
          const itemBusy = busy === `assembly-checklist-${item.id}`;
          return (
            <label
              className={cn(
                "flex items-start gap-3 py-3",
                canManage ? "cursor-pointer" : "cursor-default"
              )}
              key={item.id}
            >
              <input
                aria-label={item.label}
                checked={item.completed}
                className="mt-0.5 size-4 rounded border-[var(--line)] accent-[var(--eve-mezclado)]"
                disabled={!canManage || itemBusy}
                onChange={(event) =>
                  void onToggle(assembly.id, {
                    checklistItemId: item.id,
                    completed: event.target.checked
                  })
                }
                type="checkbox"
              />
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-sm font-semibold",
                    item.completed && "text-[var(--muted)] line-through"
                  )}
                >
                  {item.label}
                </span>
                {item.capability ? (
                  <span className="mt-1 block text-xs text-[var(--muted)]">
                    {
                      ASSEMBLY_CAPABILITY_DEFINITIONS.find(({ id }) => id === item.capability)
                        ?.label
                    }
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </Card>
  );
}

function PreparationStage({
  assembly,
  capabilities,
  canManageSupports,
  busy,
  onUploadSupport,
  onSupportStatusChange,
  onDownloadSupport
}: {
  assembly: AssemblyItem & { dossier: NonNullable<AssemblyItem["dossier"]> };
  capabilities: AssemblyCapabilities;
  canManageSupports: boolean;
  busy: string | null;
  onUploadSupport: (
    assemblyId: string,
    input: Omit<CreateAssemblySupport, "filePath" | "mimeType" | "sizeBytes">,
    file: File
  ) => Promise<AssemblySupportDocument | null>;
  onSupportStatusChange: (
    assemblyId: string,
    documentId: string,
    input: UpdateAssemblySupportStatus
  ) => Promise<AssemblySupportDocument | null>;
  onDownloadSupport: (document: AssemblySupportDocument) => Promise<void>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
      <Card className="p-5 hover:translate-y-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-extrabold">Orden del día y reglas</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Cada punto declara el universo electoral y la mayoría aplicable.
            </p>
          </div>
          {assembly.dossier.agendaLocked ? (
            <Badge tone="warning">
              <LockKeyhole size={12} className="mr-1" /> Agenda bloqueada
            </Badge>
          ) : (
            <Badge tone="info">Editable</Badge>
          )}
        </div>
        <div className="mt-4 space-y-3">
          {assembly.dossier.agendaItems.map((item, index) => (
            <div className="rounded-xl border border-[var(--line)] p-4" key={item.id}>
              <div className="flex items-start gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-xs font-extrabold text-[var(--accent)]">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{item.title}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone="neutral">{votingRuleLabels[item.votingRule]}</Badge>
                    {item.thresholdPercent ? (
                      <Badge tone="info">Umbral {item.thresholdPercent}%</Badge>
                    ) : null}
                    <Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      {capabilities.document_repository ? (
        <AssemblySupportPanel
          assembly={assembly}
          busy={busy}
          canManage={canManageSupports}
          onDownload={onDownloadSupport}
          onStatusChange={onSupportStatusChange}
          onUpload={onUploadSupport}
        />
      ) : (
        <CapabilityNotice label="El repositorio de soportes" />
      )}
    </div>
  );
}

function ConvocationStage({
  assembly,
  capabilities,
  people,
  canManage,
  busy,
  onSendEmail
}: {
  assembly: AssemblyItem & { dossier: NonNullable<AssemblyItem["dossier"]> };
  capabilities: AssemblyCapabilities;
  people: CommunityPerson[];
  canManage: boolean;
  busy: string | null;
  onSendEmail: (
    assemblyId: string,
    input: SendAssemblyEmailConvocation
  ) => Promise<AssemblyItem | null>;
}) {
  if (!capabilities.delivery_tracking) {
    return <CapabilityNotice label="La trazabilidad de convocatoria" />;
  }
  const deliveryPercent = assembly.dossier.delivery.sent
    ? Math.round((assembly.dossier.delivery.delivered / assembly.dossier.delivery.sent) * 100)
    : 0;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Enviadas"
          value={String(assembly.dossier.delivery.sent)}
          detail="Unidades convocadas"
        />
        <Stat
          label="Entregadas"
          value={String(assembly.dossier.delivery.delivered)}
          detail={`${deliveryPercent}% con evidencia`}
        />
        <Stat
          label="Consultadas"
          value={String(assembly.dossier.delivery.opened)}
          detail="Apertura confirmada"
        />
      </div>
      <Card className="p-5 hover:translate-y-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold">Cobertura de la convocatoria</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Email como canal activo; WhatsApp queda reservado para su próxima integración.
            </p>
          </div>
          <Badge tone={deliveryPercent >= 90 ? "success" : "warning"}>
            {deliveryPercent}% entregado
          </Badge>
        </div>
        <div className="mt-4">
          <Progress label="Convocatorias entregadas" value={deliveryPercent} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl bg-[#F0FDF4] p-4">
            <MailCheck className="text-[var(--eve-exito)]" size={19} />
            <div>
              <p className="text-sm font-bold">Evidencia conservada</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                Fecha, destinatario, canal y resultado.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-[#FFF7ED] p-4">
            <Clock3 className="text-[var(--eve-alerta)]" size={19} />
            <div>
              <p className="text-sm font-bold">
                {assembly.dossier.delivery.sent - assembly.dossier.delivery.delivered} por gestionar
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                Requieren reintento o canal alternativo.
              </p>
            </div>
          </div>
        </div>
      </Card>
      <AssemblyConvocationPanel
        assembly={assembly}
        busy={busy}
        canManage={canManage}
        onSendEmail={onSendEmail}
        people={people}
      />
    </div>
  );
}

function RegistrationStage({
  assembly,
  capabilities
}: {
  assembly: AssemblyItem & { dossier: NonNullable<AssemblyItem["dossier"]> };
  capabilities: AssemblyCapabilities;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Unidades"
          value={`${assembly.representedUnits} / ${assembly.totalUnits}`}
          detail="Representadas"
        />
        <Stat
          label="Coeficientes"
          value={`${assembly.dossier.representedCoefficientPercent.toFixed(2)}%`}
          detail="Del total de la copropiedad"
        />
        <Stat
          label="Poderes"
          value={String(assembly.dossier.validatedProxies)}
          detail="Validados y vigentes"
        />
        <Stat
          label="Con voz"
          value={String(assembly.dossier.residentsWithoutVote)}
          detail="Residentes sin poder"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {capabilities.proxy_management ? (
          <Card className="p-5 hover:translate-y-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileCheck2 size={19} className="text-[var(--accent)]" />
                <h3 className="font-extrabold">Poderes</h3>
              </div>
              <Badge tone="success">Sin duplicados</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Se conserva propietario, apoderado, unidad, alcance, vigencia y evidencia de cada
              poder.
            </p>
          </Card>
        ) : (
          <CapabilityNotice label="La gestión de poderes" />
        )}
        {capabilities.identity_accreditation ? (
          <Card className="p-5 hover:translate-y-0">
            <div className="flex items-center gap-2">
              <BadgeCheck size={19} className="text-[var(--accent)]" />
              <h3 className="font-extrabold">Calidad de participación</h3>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="info">Propietario</Badge>
              <Badge tone="info">Apoderado</Badge>
              <Badge tone="neutral">Residente con voz</Badge>
              <Badge tone="neutral">Invitado</Badge>
            </div>
          </Card>
        ) : (
          <CapabilityNotice label="La acreditación de identidad" />
        )}
      </div>
    </div>
  );
}

function LiveStage({
  assembly,
  capabilities
}: {
  assembly: AssemblyItem & { dossier: NonNullable<AssemblyItem["dossier"]> };
  capabilities: AssemblyCapabilities;
}) {
  const hasVoting =
    capabilities.unit_voting ||
    capabilities.coefficient_voting ||
    capabilities.qualified_majorities;
  return (
    <div className="space-y-4">
      {capabilities.continuous_quorum ? (
        <Card className="p-5 hover:translate-y-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Gauge size={20} className="text-[var(--accent)]" />
                <h3 className="font-extrabold">Quórum deliberatorio</h3>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {assembly.representedUnits} de {assembly.totalUnits} unidades ·{" "}
                {assembly.dossier.representedCoefficientPercent.toFixed(2)}% de coeficientes
              </p>
            </div>
            <Badge tone={assembly.quorumPercent > 50 ? "success" : "warning"}>
              {assembly.quorumPercent > 50 ? "Alcanzado" : "En formación"}
            </Badge>
          </div>
          <div className="mt-4">
            <Progress label="Quórum continuo" value={assembly.quorumPercent} />
          </div>
        </Card>
      ) : (
        <CapabilityNotice label="El quórum continuo" />
      )}

      {hasVoting ? (
        <Card className="p-5 hover:translate-y-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold">Votaciones</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                El resultado explica regla, denominador y umbral.
              </p>
            </div>
            <Badge tone="info">{assembly.dossier.votes.length} configuradas</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {assembly.dossier.votes.length ? (
              assembly.dossier.votes.map((voteItem) => {
                const enabled =
                  voteItem.rule === "unit"
                    ? capabilities.unit_voting
                    : voteItem.rule === "coefficient"
                      ? capabilities.coefficient_voting
                      : capabilities.qualified_majorities;
                if (!enabled) return null;
                return (
                  <div className="rounded-xl border border-[var(--line)] p-4" key={voteItem.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">{voteItem.title}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {votingRuleLabels[voteItem.rule]} · Umbral {voteItem.thresholdPercent}%
                        </p>
                      </div>
                      <Badge tone={statusTone(voteItem.status)}>
                        {statusLabel(voteItem.status)}
                      </Badge>
                    </div>
                    {voteItem.status === "closed" ? (
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                        <span className="rounded-lg bg-[#F0FDF4] p-2 font-bold text-[var(--eve-exito)]">
                          Sí {voteItem.yesPercent}%
                        </span>
                        <span className="rounded-lg bg-[#FEF2F2] p-2 font-bold text-[var(--eve-error)]">
                          No {voteItem.noPercent}%
                        </span>
                        <span className="rounded-lg bg-[var(--wash)] p-2 font-bold text-[var(--muted)]">
                          Abst. {voteItem.abstentionPercent}%
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <EmptyState
                icon={<Vote size={20} />}
                title="Sin votaciones configuradas"
                description="Los puntos informativos no requieren una decisión electrónica."
              />
            )}
          </div>
        </Card>
      ) : (
        <CapabilityNotice label="Las votaciones digitales" />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {capabilities.resident_questions ? (
          <Card className="p-4 hover:translate-y-0">
            <div className="flex items-start gap-3">
              <MessageSquareText size={19} className="mt-0.5 text-[var(--accent)]" />
              <div>
                <p className="text-sm font-bold">Preguntas y proposiciones</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  Turnos, respuestas y constancias ligados al acta.
                </p>
              </div>
            </div>
          </Card>
        ) : null}
        {capabilities.hybrid_participation ? (
          <Card className="p-4 hover:translate-y-0">
            <div className="flex items-start gap-3">
              <UsersRound size={19} className="mt-0.5 text-[var(--accent)]" />
              <div>
                <p className="text-sm font-bold">Participación híbrida</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  Un solo registro para asistentes presenciales y remotos.
                </p>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function MinutesStage({
  assembly,
  capabilities
}: {
  assembly: AssemblyItem & { dossier: NonNullable<AssemblyItem["dossier"]> };
  capabilities: AssemblyCapabilities;
}) {
  if (!capabilities.minutes_workflow) return <CapabilityNotice label="El flujo de acta" />;
  const minutes = assembly.dossier.minutes;
  return (
    <div className="grid gap-4 lg:grid-cols-[.75fr_1.25fr]">
      <Card className="p-5 hover:translate-y-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Signature size={19} className="text-[var(--accent)]" />
            <h3 className="font-extrabold">Estado del acta</h3>
          </div>
          <Badge tone={statusTone(minutes.status)}>{statusLabel(minutes.status)}</Badge>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Stat
            label="Versión"
            value={minutes.version ? `v${minutes.version}` : "—"}
            detail="Historial conservado"
          />
          <Stat
            label="Firmas"
            value={`${minutes.signaturesCompleted} / ${minutes.signaturesRequired}`}
            detail="Presidencia y secretaría"
          />
        </div>
      </Card>
      <Card className="p-5 hover:translate-y-0">
        <div className="flex items-start gap-3">
          <BookOpenCheck size={21} className="mt-0.5 text-[var(--accent)]" />
          <div>
            <h3 className="font-extrabold">Contenido reproducible</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Convocatoria, asistentes, unidades, coeficientes, poderes, intervenciones y resultado
              de cada votación se reconstruyen desde la evidencia.
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-[var(--wash)]/65 p-4 text-sm">
          <span className="font-bold">Publicación:</span>{" "}
          <span className="text-[var(--muted)]">
            {minutes.publishedAt
              ? formatDateTime(minutes.publishedAt)
              : "Pendiente después de firmas y verificación"}
          </span>
        </div>
      </Card>
    </div>
  );
}

function FollowUpStage({
  assembly,
  capabilities
}: {
  assembly: AssemblyItem & { dossier: NonNullable<AssemblyItem["dossier"]> };
  capabilities: AssemblyCapabilities;
}) {
  if (!capabilities.decision_tracking)
    return <CapabilityNotice label="El seguimiento de decisiones" />;
  if (!assembly.dossier.decisions.length) {
    return (
      <EmptyState
        icon={<ListChecks size={20} />}
        title="Todavía no hay decisiones por ejecutar"
        description="Al cerrar las votaciones, cada decisión podrá asignarse con responsable, fecha y evidencia."
      />
    );
  }
  return (
    <Card className="overflow-hidden hover:translate-y-0">
      <div className="border-b border-[var(--line)] p-5">
        <h3 className="font-extrabold">Compromisos aprobados</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          El consejo supervisa su ejecución y la administración aporta evidencias.
        </p>
      </div>
      <div className="divide-y divide-[var(--line)]">
        {assembly.dossier.decisions.map((decision) => (
          <div
            className="grid gap-3 p-4 sm:grid-cols-[1fr_180px_130px] sm:items-center"
            key={decision.id}
          >
            <div>
              <p className="text-sm font-bold">{decision.title}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Responsable: {decision.owner}</p>
            </div>
            <p className="text-xs text-[var(--muted)]">Vence {formatDateTime(decision.dueDate)}</p>
            <Badge
              className="justify-self-start sm:justify-self-end"
              tone={statusTone(decision.status)}
            >
              {statusLabel(decision.status)}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StageContent({
  assembly,
  people,
  stage,
  capabilities,
  canManage,
  canManageSupports,
  busy,
  onToggleChecklist,
  onUploadSupport,
  onSupportStatusChange,
  onDownloadSupport,
  onSendEmailConvocation
}: {
  assembly: AssemblyItem & { dossier: NonNullable<AssemblyItem["dossier"]> };
  people: CommunityPerson[];
  stage: AssemblyStage;
  capabilities: AssemblyCapabilities;
  canManage: boolean;
  canManageSupports: boolean;
  busy: string | null;
  onToggleChecklist: (
    assemblyId: string,
    input: UpdateAssemblyChecklist
  ) => Promise<AssemblyItem | null>;
  onUploadSupport: (
    assemblyId: string,
    input: Omit<CreateAssemblySupport, "filePath" | "mimeType" | "sizeBytes">,
    file: File
  ) => Promise<AssemblySupportDocument | null>;
  onSupportStatusChange: (
    assemblyId: string,
    documentId: string,
    input: UpdateAssemblySupportStatus
  ) => Promise<AssemblySupportDocument | null>;
  onDownloadSupport: (document: AssemblySupportDocument) => Promise<void>;
  onSendEmailConvocation: (
    assemblyId: string,
    input: SendAssemblyEmailConvocation
  ) => Promise<AssemblyItem | null>;
}) {
  return (
    <div className="space-y-4">
      {stage === "preparation" ? (
        <PreparationStage
          assembly={assembly}
          busy={busy}
          canManageSupports={canManageSupports}
          capabilities={capabilities}
          onDownloadSupport={onDownloadSupport}
          onSupportStatusChange={onSupportStatusChange}
          onUploadSupport={onUploadSupport}
        />
      ) : null}
      {stage === "convocation" ? (
        <ConvocationStage
          assembly={assembly}
          busy={busy}
          canManage={canManage}
          capabilities={capabilities}
          onSendEmail={onSendEmailConvocation}
          people={people}
        />
      ) : null}
      {stage === "registration" ? (
        <RegistrationStage assembly={assembly} capabilities={capabilities} />
      ) : null}
      {stage === "live" ? <LiveStage assembly={assembly} capabilities={capabilities} /> : null}
      {stage === "minutes" ? (
        <MinutesStage assembly={assembly} capabilities={capabilities} />
      ) : null}
      {stage === "follow_up" ? (
        <FollowUpStage assembly={assembly} capabilities={capabilities} />
      ) : null}
      <Checklist
        assembly={assembly}
        busy={busy}
        canManage={canManage}
        capabilities={capabilities}
        onToggle={onToggleChecklist}
        stage={stage}
      />
    </div>
  );
}

function AssemblyWorkspace({
  assembly,
  people,
  settings,
  canManage,
  canManageSupports,
  busy,
  open,
  onOpenChange,
  onToggleChecklist,
  onUploadSupport,
  onSupportStatusChange,
  onDownloadSupport,
  onSendEmailConvocation
}: {
  assembly: AssemblyItem & { dossier: NonNullable<AssemblyItem["dossier"]> };
  people: CommunityPerson[];
  settings: AssemblySettings;
  canManage: boolean;
  canManageSupports: boolean;
  busy: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleChecklist: (
    assemblyId: string,
    input: UpdateAssemblyChecklist
  ) => Promise<AssemblyItem | null>;
  onUploadSupport: (
    assemblyId: string,
    input: Omit<CreateAssemblySupport, "filePath" | "mimeType" | "sizeBytes">,
    file: File
  ) => Promise<AssemblySupportDocument | null>;
  onSupportStatusChange: (
    assemblyId: string,
    documentId: string,
    input: UpdateAssemblySupportStatus
  ) => Promise<AssemblySupportDocument | null>;
  onDownloadSupport: (document: AssemblySupportDocument) => Promise<void>;
  onSendEmailConvocation: (
    assemblyId: string,
    input: SendAssemblyEmailConvocation
  ) => Promise<AssemblyItem | null>;
}) {
  const [activeStage, setActiveStage] = useState<AssemblyStage>(assembly.dossier.currentStage);
  const readiness = assemblyReadinessPercent(assembly.dossier, settings.capabilities);
  return (
    <Modal
      description="Expediente único de preparación, decisión, acta y cumplimiento."
      onOpenChange={onOpenChange}
      open={open}
      size="xl"
      title={assembly.title}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={assembly.status} />
          <Badge tone="info">{assembly.mode}</Badge>
          <Badge tone="neutral">{typeLabel(assembly.type)}</Badge>
          <Badge tone="neutral">
            {assembly.dossier.callType === "first"
              ? "Primera convocatoria"
              : "Segunda convocatoria"}
          </Badge>
          <Badge tone="neutral">
            {assembly.dossier.propertyUse === "mixed" ? "Uso mixto" : "Residencial"}
          </Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Preparación" value={`${readiness}%`} detail="Lista de control activa" />
          <Stat
            label="Representación"
            value={`${assembly.representedUnits} / ${assembly.totalUnits}`}
            detail="Unidades acreditadas"
          />
          <Stat
            label="Coeficientes"
            value={`${assembly.dossier.representedCoefficientPercent.toFixed(2)}%`}
            detail="Base deliberatoria"
          />
          <Stat
            label="Poderes"
            value={String(assembly.dossier.validatedProxies)}
            detail="Validados"
          />
        </div>

        <div
          className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6"
          role="tablist"
          aria-label="Etapas del expediente"
        >
          {ASSEMBLY_STAGES.map((stage) => {
            const Icon = stageIcons[stage.id];
            const progress = stageProgressPercent(
              assembly.dossier,
              stage.id,
              settings.capabilities
            );
            return (
              <button
                aria-selected={activeStage === stage.id}
                className={cn(
                  "focus-ring rounded-xl border p-3 text-left transition",
                  activeStage === stage.id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                    : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--accent)]"
                )}
                key={stage.id}
                onClick={() => setActiveStage(stage.id)}
                role="tab"
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon size={17} />
                  {progress === 100 ? (
                    <CheckCircle2 size={15} className="text-[var(--eve-exito)]" />
                  ) : (
                    <span className="text-[10px] font-bold">{progress}%</span>
                  )}
                </div>
                <span className="mt-2 block text-xs font-bold leading-4">{stage.shortLabel}</span>
              </button>
            );
          })}
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--accent)]">
            {ASSEMBLY_STAGES.find((stage) => stage.id === activeStage)?.label}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {ASSEMBLY_STAGES.find((stage) => stage.id === activeStage)?.description}
          </p>
        </div>

        <StageContent
          assembly={assembly}
          busy={busy}
          canManage={canManage}
          canManageSupports={canManageSupports}
          capabilities={settings.capabilities}
          onDownloadSupport={onDownloadSupport}
          onSendEmailConvocation={onSendEmailConvocation}
          onSupportStatusChange={onSupportStatusChange}
          onToggleChecklist={onToggleChecklist}
          onUploadSupport={onUploadSupport}
          people={people}
          stage={activeStage}
        />
      </div>
    </Modal>
  );
}

function AssemblySettingsModal({
  settings,
  busy,
  open,
  onOpenChange,
  onSave
}: {
  settings: AssemblySettings;
  busy: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: UpdateAssemblyCapabilities) => Promise<AssemblySettings | null>;
}) {
  const [draft, setDraft] = useState<AssemblyCapabilities>({ ...settings.capabilities });
  const activeCount = Object.values(draft).filter(Boolean).length;

  function close() {
    setDraft({ ...settings.capabilities });
    onOpenChange(false);
  }

  async function save() {
    const result = await onSave({ capabilities: draft });
    if (result) onOpenChange(false);
  }

  return (
    <Modal
      description="Todas las capacidades están disponibles por defecto. Inactiva solo las que el reglamento o la operación de esta copropiedad no requieran."
      onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())}
      open={open}
      size="lg"
      title="Configurar funcionalidades"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--wash)] p-4">
          <div>
            <p className="text-sm font-bold">
              {activeCount} de {ASSEMBLY_CAPABILITY_DEFINITIONS.length} activas
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              La configuración aplica únicamente a esta copropiedad.
            </p>
          </div>
          <Button
            onClick={() =>
              setDraft(
                Object.fromEntries(
                  ASSEMBLY_CAPABILITY_DEFINITIONS.map(({ id }) => [id, true])
                ) as AssemblyCapabilities
              )
            }
            size="sm"
            variant="secondary"
          >
            <Check size={15} /> Activar todas
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {ASSEMBLY_CAPABILITY_DEFINITIONS.map((capability) => (
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",
                draft[capability.id]
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]/55"
                  : "border-[var(--line)] bg-white"
              )}
              key={capability.id}
            >
              <input
                checked={draft[capability.id]}
                className="mt-0.5 size-4 accent-[var(--eve-mezclado)]"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    [capability.id]: event.target.checked
                  }))
                }
                type="checkbox"
              />
              <span>
                <span className="block text-sm font-bold">{capability.label}</span>
                <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                  {capability.description}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--line)] pt-4">
          <Button onClick={close} variant="secondary">
            Cancelar
          </Button>
          <Button disabled={busy === "assembly-settings"} onClick={() => void save()}>
            {busy === "assembly-settings" ? "Guardando…" : "Guardar configuración"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function AssemblyManagement({
  assemblies,
  people,
  settings: rawSettings,
  canManage,
  canManageSupports,
  busy,
  onUpdateCapabilities,
  onToggleChecklist,
  onUploadSupport,
  onSupportStatusChange,
  onDownloadSupport,
  onSendEmailConvocation
}: {
  assemblies: AssemblyItem[];
  people: CommunityPerson[];
  settings?: AssemblySettings;
  canManage: boolean;
  canManageSupports: boolean;
  busy: string | null;
  onUpdateCapabilities: (input: UpdateAssemblyCapabilities) => Promise<AssemblySettings | null>;
  onToggleChecklist: (
    assemblyId: string,
    input: UpdateAssemblyChecklist
  ) => Promise<AssemblyItem | null>;
  onUploadSupport: (
    assemblyId: string,
    input: Omit<CreateAssemblySupport, "filePath" | "mimeType" | "sizeBytes">,
    file: File
  ) => Promise<AssemblySupportDocument | null>;
  onSupportStatusChange: (
    assemblyId: string,
    documentId: string,
    input: UpdateAssemblySupportStatus
  ) => Promise<AssemblySupportDocument | null>;
  onDownloadSupport: (document: AssemblySupportDocument) => Promise<void>;
  onSendEmailConvocation: (
    assemblyId: string,
    input: SendAssemblyEmailConvocation
  ) => Promise<AssemblyItem | null>;
}) {
  const settings = normalizeAssemblySettings(rawSettings);
  const normalizedAssemblies = useMemo(
    () => assemblies.map((item) => normalizeAssembly(item)),
    [assemblies]
  );
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const selectedAssembly = normalizedAssemblies.find((item) => item.id === selectedAssemblyId);
  const disabledCount = Object.values(settings.capabilities).filter((enabled) => !enabled).length;
  const nextAssembly =
    normalizedAssemblies.find((item) => item.status !== "closed") ?? normalizedAssemblies[0];

  if (!normalizedAssemblies.length) {
    return (
      <EmptyState
        icon={<Vote size={22} />}
        title="Aún no hay asambleas"
        description="Programa la primera convocatoria para crear su expediente y activar el seguimiento."
      />
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--line)] bg-white p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <ShieldCheck size={20} />
          </span>
          <div>
            <p className="text-sm font-extrabold">Matriz funcional de la copropiedad</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {disabledCount
                ? `${disabledCount} capacidades inactivas; las demás están disponibles.`
                : "Las 13 capacidades recomendadas están activas por defecto."}
            </p>
          </div>
        </div>
        {canManage ? (
          <Button onClick={() => setSettingsOpen(true)} size="sm" variant="secondary">
            <Settings2 size={16} /> Configurar funcionalidades
          </Button>
        ) : (
          <Badge tone="info">Configuración administrada</Badge>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {normalizedAssemblies.map((assembly) => {
            const readiness = assemblyReadinessPercent(assembly.dossier, settings.capabilities);
            const deliveryPercent = assembly.dossier.delivery.sent
              ? Math.round(
                  (assembly.dossier.delivery.delivered / assembly.dossier.delivery.sent) * 100
                )
              : 0;
            return (
              <Card className="p-5 sm:p-6" key={assembly.id}>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={assembly.status} />
                      <Badge tone="info">{assembly.mode}</Badge>
                      <Badge tone="neutral">{typeLabel(assembly.type)}</Badge>
                      {assembly.dossier.agendaLocked ? (
                        <Badge tone="warning">
                          <LockKeyhole className="mr-1" size={12} /> Orden cerrado
                        </Badge>
                      ) : null}
                    </div>
                    <h2 className="mt-3 text-lg font-extrabold">{assembly.title}</h2>
                    <p className="mt-1.5 flex items-center gap-2 text-sm text-[var(--muted)]">
                      <CalendarDays size={15} /> {formatDateTime(assembly.date)}
                    </p>
                    {assembly.location ? (
                      <p className="mt-1.5 flex items-center gap-2 text-sm text-[var(--muted)]">
                        <Landmark size={15} /> {assembly.location}
                      </p>
                    ) : null}
                    {assembly.agenda ? (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--ink)]/75">
                        {assembly.agenda}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    onClick={() => setSelectedAssemblyId(assembly.id)}
                    size="sm"
                    variant="secondary"
                  >
                    Abrir expediente <ArrowRight size={15} />
                  </Button>
                </div>
                <div className="mt-5 grid gap-4 border-t border-[var(--line)] pt-5 sm:grid-cols-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-[var(--muted)]">Preparación</p>
                    <p className="mt-1 text-xl font-extrabold">{readiness}%</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-[var(--muted)]">Convocatoria</p>
                    <p className="mt-1 text-xl font-extrabold">{deliveryPercent}%</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-[var(--muted)]">
                      Representación
                    </p>
                    <p className="mt-1 text-xl font-extrabold">
                      {assembly.representedUnits} / {assembly.totalUnits}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-[var(--muted)]">Coeficientes</p>
                    <p className="mt-1 text-xl font-extrabold">
                      {assembly.dossier.representedCoefficientPercent.toFixed(2)}%
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <Progress label={`Preparación de ${assembly.title}`} value={readiness} />
                </div>
              </Card>
            );
          })}
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-extrabold">Control de gobierno</h3>
              <History size={19} className="text-[var(--accent)]" />
            </div>
            <div className="mt-4 space-y-4">
              <div className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Fingerprint size={17} />
                </span>
                <div>
                  <p className="text-sm font-extrabold">Regla por decisión</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Unidad, coeficiente o mayoría calificada.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <History size={17} />
                </span>
                <div>
                  <p className="text-sm font-extrabold">Historia inmutable</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Poderes, quórum, cambios y resultados.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <FileCheck2 size={17} />
                </span>
                <div>
                  <p className="text-sm font-extrabold">Acta reproducible</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Resultado reconstruible desde evidencia.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {nextAssembly ? (
            <Card className="bg-[var(--ink)] p-5 text-white">
              <Vote size={24} className="text-[var(--eve-cian)]" />
              <h3 className="mt-4 font-extrabold">Próxima convocatoria</h3>
              <p className="mt-2 text-sm font-bold">{nextAssembly.title}</p>
              <p className="mt-1 text-sm leading-6 text-white/65">
                {Math.max(0, nextAssembly.totalUnits - nextAssembly.dossier.delivery.delivered)}{" "}
                entregas pendientes y {nextAssembly.dossier.validatedProxies} poderes validados.
              </p>
              <Button
                className="mt-4 bg-white text-[var(--ink)] hover:bg-[var(--eve-hielo)]"
                onClick={() => setSelectedAssemblyId(nextAssembly.id)}
                size="sm"
              >
                Revisar expediente
              </Button>
            </Card>
          ) : null}
        </div>
      </div>

      {selectedAssembly ? (
        <AssemblyWorkspace
          assembly={selectedAssembly}
          busy={busy}
          canManage={canManage}
          canManageSupports={canManageSupports}
          onDownloadSupport={onDownloadSupport}
          onSendEmailConvocation={onSendEmailConvocation}
          onOpenChange={(open) => {
            if (!open) setSelectedAssemblyId(null);
          }}
          onSupportStatusChange={onSupportStatusChange}
          onToggleChecklist={onToggleChecklist}
          onUploadSupport={onUploadSupport}
          open
          people={people}
          settings={settings}
        />
      ) : null}

      {canManage ? (
        <AssemblySettingsModal
          busy={busy}
          onOpenChange={setSettingsOpen}
          onSave={onUpdateCapabilities}
          open={settingsOpen}
          settings={settings}
        />
      ) : null}
    </>
  );
}
