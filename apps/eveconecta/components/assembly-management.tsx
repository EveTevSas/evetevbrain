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
  AccreditAssemblyAttendee,
  AssemblyAgendaItem,
  AssemblyAgendaOverview,
  AssemblyAgendaVoting,
  AssemblyAttendee,
  AssemblyCapabilities,
  AssemblyDecisionsOverview,
  AssemblyItem,
  AssemblyMinutesOverview,
  AssemblyOwnAccreditation,
  AssemblySettings,
  AssemblyStage,
  AssemblySupportDocument,
  AssemblyVoteLink,
  AssemblyVoteRecord,
  AssemblyVoteTally,
  AttachDecisionEvidence,
  CastSelfServiceVote,
  CastVote,
  CommunityPerson,
  CreateAgendaItem,
  CreateAssemblyDecision,
  CreateAssemblySupport,
  SaveAssemblyMinutes,
  SendAssemblyEmailConvocation,
  UpdateAgendaItem,
  UpdateAssemblyCapabilities,
  UpdateAssemblyChecklist,
  UpdateAssemblyDecision,
  UpdateAssemblyDecisionStatus,
  UpdateAssemblySupportStatus
} from "@/lib/contracts";
import { Badge, Button, Card, EmptyState, Progress, cn } from "@/lib/ui";
import {
  ArrowRight,
  BellRing,
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
  MailCheck,
  MessageSquareText,
  Settings2,
  ShieldCheck,
  Signature,
  SlidersHorizontal,
  UsersRound,
  Vote
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "./modal";
import { StatusBadge } from "./status-badge";
import { AssemblyAccreditationPanel } from "./assembly-accreditation";
import { AssemblyAgendaPanel } from "./assembly-agenda";
import { AssemblySupportPanel } from "./assembly-supports";
import { AssemblyConvocationPanel } from "./assembly-convocation";
import { AssemblyVotingPanel, VotingCapabilityNotice } from "./assembly-voting";
import { AssemblyMinutesPanel } from "./assembly-minutes";
import { AssemblyDecisionsPanel } from "./assembly-decisions";

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

function formatDateTime(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return dateFormatter.format(new Date(`${value}T12:00:00`));
  }
  return dateTimeFormatter.format(new Date(value));
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
  canManage,
  canManageSupports,
  busy,
  agenda,
  agendaLoading,
  onCreateAgendaItem,
  onUpdateAgendaItem,
  onDeleteAgendaItem,
  onReorderAgenda,
  onUploadSupport,
  onSupportStatusChange,
  onDownloadSupport
}: {
  assembly: AssemblyItem & { dossier: NonNullable<AssemblyItem["dossier"]> };
  capabilities: AssemblyCapabilities;
  canManage: boolean;
  canManageSupports: boolean;
  busy: string | null;
  agenda: AssemblyAgendaOverview | null;
  agendaLoading: boolean;
  onCreateAgendaItem: (input: CreateAgendaItem) => Promise<AssemblyAgendaItem | null>;
  onUpdateAgendaItem: (itemId: string, input: UpdateAgendaItem) => Promise<{ id: string } | null>;
  onDeleteAgendaItem: (itemId: string) => Promise<{ id: string } | null>;
  onReorderAgenda: (orderedIds: string[]) => Promise<unknown>;
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
      <AssemblyAgendaPanel
        assemblyId={assembly.id}
        busy={busy}
        canManage={canManage}
        loading={agendaLoading}
        onCreate={onCreateAgendaItem}
        onDelete={onDeleteAgendaItem}
        onReorder={onReorderAgenda}
        onUpdate={onUpdateAgendaItem}
        overview={agenda}
      />
      {capabilities.document_repository ? (
        <AssemblySupportPanel
          agendaItems={agenda?.items ?? []}
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
  capabilities,
  people,
  attendees,
  attendeesLoading,
  canManage,
  busy,
  onAccredit,
  onRevoke,
  onDownloadProxy,
  onGenerateVoteLink,
  onRevokeVoteLink
}: {
  assembly: AssemblyItem & { dossier: NonNullable<AssemblyItem["dossier"]> };
  capabilities: AssemblyCapabilities;
  people: CommunityPerson[];
  attendees: AssemblyAttendee[];
  attendeesLoading: boolean;
  canManage: boolean;
  busy: string | null;
  onAccredit: (
    input: Omit<AccreditAssemblyAttendee, "soportePath">,
    evidenceFile?: File
  ) => Promise<AssemblyAttendee | null>;
  onRevoke: (attendeeId: string) => Promise<{ id: string } | null>;
  onDownloadProxy: (attendee: AssemblyAttendee) => Promise<void>;
  onGenerateVoteLink: (accreditationId: string) => Promise<AssemblyVoteLink | null>;
  onRevokeVoteLink: (accreditationId: string) => Promise<{ acreditacionId: string } | null>;
}) {
  const hasRegistration = capabilities.proxy_management || capabilities.identity_accreditation;
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
          detail="Base deliberatoria"
        />
        <Stat
          label="Poderes"
          value={String(assembly.dossier.validatedProxies)}
          detail="Vigentes en esta asamblea"
        />
        <Stat
          label="Con voz"
          value={String(assembly.dossier.residentsWithoutVote)}
          detail="Residentes sin poder"
        />
      </div>
      {hasRegistration ? (
        <AssemblyAccreditationPanel
          assembly={assembly}
          attendees={attendees}
          attendeesLoading={attendeesLoading}
          busy={busy}
          canManage={canManage}
          onAccredit={onAccredit}
          onDownloadProxy={onDownloadProxy}
          onGenerateVoteLink={onGenerateVoteLink}
          onRevoke={onRevoke}
          onRevokeVoteLink={onRevokeVoteLink}
          people={people}
        />
      ) : (
        <CapabilityNotice label="La acreditación de asistentes y la gestión de poderes" />
      )}
    </div>
  );
}

function LiveStage({
  assembly,
  capabilities,
  agendaItems,
  voting,
  votingLoading,
  canManage,
  busy,
  myAccreditations,
  onOpenVoting,
  onCloseVoting,
  onCastVote,
  onRevokeVote,
  onCastSelfServiceVote
}: {
  assembly: AssemblyItem & { dossier: NonNullable<AssemblyItem["dossier"]> };
  capabilities: AssemblyCapabilities;
  agendaItems: AssemblyAgendaItem[];
  voting: AssemblyAgendaVoting[] | null;
  votingLoading: boolean;
  canManage: boolean;
  busy: string | null;
  myAccreditations: AssemblyOwnAccreditation[];
  onOpenVoting: (itemId: string) => Promise<unknown>;
  onCloseVoting: (itemId: string) => Promise<unknown>;
  onCastVote: (itemId: string, input: CastVote) => Promise<unknown>;
  onRevokeVote: (itemId: string, voteId: string) => Promise<unknown>;
  onCastSelfServiceVote: (itemId: string, input: CastSelfServiceVote) => Promise<unknown>;
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
        <AssemblyVotingPanel
          agendaItems={agendaItems}
          busy={busy}
          canManage={canManage}
          capabilities={capabilities}
          loading={votingLoading}
          myAccreditations={myAccreditations}
          onCastSelfServiceVote={onCastSelfServiceVote}
          onCastVote={onCastVote}
          onClose={onCloseVoting}
          onOpen={onOpenVoting}
          onRevokeVote={onRevokeVote}
          voting={voting}
        />
      ) : (
        <VotingCapabilityNotice />
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
  capabilities,
  canManage,
  busy,
  minutes,
  minutesLoading,
  onSaveMinutes,
  onSignMinutes,
  onPublishMinutes
}: {
  assembly: AssemblyItem & { dossier: NonNullable<AssemblyItem["dossier"]> };
  capabilities: AssemblyCapabilities;
  canManage: boolean;
  busy: string | null;
  minutes: AssemblyMinutesOverview | null;
  minutesLoading: boolean;
  onSaveMinutes: (input: SaveAssemblyMinutes) => Promise<unknown>;
  onSignMinutes: () => Promise<unknown>;
  onPublishMinutes: () => Promise<unknown>;
}) {
  if (!capabilities.minutes_workflow) return <CapabilityNotice label="El flujo de acta" />;
  return (
    <AssemblyMinutesPanel
      assemblyId={assembly.id}
      assemblyStatus={assembly.status}
      busy={busy}
      canManage={canManage}
      loading={minutesLoading}
      onPublish={onPublishMinutes}
      onSave={onSaveMinutes}
      onSign={onSignMinutes}
      overview={minutes}
    />
  );
}

function FollowUpStage({
  assemblyId,
  capabilities,
  canManage,
  canSuperviseDecisions,
  busy,
  agendaItems,
  decisions,
  decisionsLoading,
  onCreateDecision,
  onUpdateDecision,
  onUpdateDecisionStatus,
  onAttachDecisionEvidence,
  onDeleteDecision
}: {
  assemblyId: string;
  capabilities: AssemblyCapabilities;
  canManage: boolean;
  canSuperviseDecisions: boolean;
  busy: string | null;
  agendaItems: AssemblyAgendaItem[];
  decisions: AssemblyDecisionsOverview | null;
  decisionsLoading: boolean;
  onCreateDecision: (input: CreateAssemblyDecision) => Promise<unknown>;
  onUpdateDecision: (decisionId: string, input: UpdateAssemblyDecision) => Promise<unknown>;
  onUpdateDecisionStatus: (
    decisionId: string,
    input: UpdateAssemblyDecisionStatus
  ) => Promise<unknown>;
  onAttachDecisionEvidence: (
    decisionId: string,
    input: AttachDecisionEvidence
  ) => Promise<unknown>;
  onDeleteDecision: (decisionId: string) => Promise<unknown>;
}) {
  if (!capabilities.decision_tracking)
    return <CapabilityNotice label="El seguimiento de decisiones" />;
  return (
    <AssemblyDecisionsPanel
      agendaItems={agendaItems}
      assemblyId={assemblyId}
      busy={busy}
      canManage={canManage}
      canSuperviseDecisions={canSuperviseDecisions}
      loading={decisionsLoading}
      onAttachEvidence={onAttachDecisionEvidence}
      onCreate={onCreateDecision}
      onDelete={onDeleteDecision}
      onUpdate={onUpdateDecision}
      onUpdateStatus={onUpdateDecisionStatus}
      overview={decisions}
    />
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
  attendees,
  attendeesLoading,
  agenda,
  agendaLoading,
  voting,
  votingLoading,
  minutes,
  minutesLoading,
  decisions,
  decisionsLoading,
  canSuperviseDecisions,
  myAccreditations,
  onToggleChecklist,
  onUploadSupport,
  onSupportStatusChange,
  onDownloadSupport,
  onSendEmailConvocation,
  onAccreditAttendee,
  onRevokeAttendee,
  onDownloadProxy,
  onGenerateVoteLink,
  onRevokeVoteLink,
  onCreateAgendaItem,
  onUpdateAgendaItem,
  onDeleteAgendaItem,
  onReorderAgenda,
  onOpenVoting,
  onCloseVoting,
  onCastVote,
  onRevokeVote,
  onCastSelfServiceVote,
  onSaveMinutes,
  onSignMinutes,
  onPublishMinutes,
  onCreateDecision,
  onUpdateDecision,
  onUpdateDecisionStatus,
  onAttachDecisionEvidence,
  onDeleteDecision
}: {
  assembly: AssemblyItem & { dossier: NonNullable<AssemblyItem["dossier"]> };
  people: CommunityPerson[];
  stage: AssemblyStage;
  capabilities: AssemblyCapabilities;
  canManage: boolean;
  canManageSupports: boolean;
  busy: string | null;
  attendees: AssemblyAttendee[];
  attendeesLoading: boolean;
  agenda: AssemblyAgendaOverview | null;
  agendaLoading: boolean;
  voting: AssemblyAgendaVoting[] | null;
  votingLoading: boolean;
  minutes: AssemblyMinutesOverview | null;
  minutesLoading: boolean;
  decisions: AssemblyDecisionsOverview | null;
  decisionsLoading: boolean;
  canSuperviseDecisions: boolean;
  myAccreditations: AssemblyOwnAccreditation[];
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
  onAccreditAttendee: (
    input: Omit<AccreditAssemblyAttendee, "soportePath">,
    evidenceFile?: File
  ) => Promise<AssemblyAttendee | null>;
  onRevokeAttendee: (attendeeId: string) => Promise<{ id: string } | null>;
  onDownloadProxy: (attendee: AssemblyAttendee) => Promise<void>;
  onGenerateVoteLink: (accreditationId: string) => Promise<AssemblyVoteLink | null>;
  onRevokeVoteLink: (accreditationId: string) => Promise<{ acreditacionId: string } | null>;
  onCreateAgendaItem: (input: CreateAgendaItem) => Promise<AssemblyAgendaItem | null>;
  onUpdateAgendaItem: (itemId: string, input: UpdateAgendaItem) => Promise<{ id: string } | null>;
  onDeleteAgendaItem: (itemId: string) => Promise<{ id: string } | null>;
  onReorderAgenda: (orderedIds: string[]) => Promise<unknown>;
  onOpenVoting: (itemId: string) => Promise<unknown>;
  onCloseVoting: (itemId: string) => Promise<unknown>;
  onCastVote: (itemId: string, input: CastVote) => Promise<unknown>;
  onRevokeVote: (itemId: string, voteId: string) => Promise<unknown>;
  onCastSelfServiceVote: (itemId: string, input: CastSelfServiceVote) => Promise<unknown>;
  onSaveMinutes: (input: SaveAssemblyMinutes) => Promise<unknown>;
  onSignMinutes: () => Promise<unknown>;
  onPublishMinutes: () => Promise<unknown>;
  onCreateDecision: (input: CreateAssemblyDecision) => Promise<unknown>;
  onUpdateDecision: (decisionId: string, input: UpdateAssemblyDecision) => Promise<unknown>;
  onUpdateDecisionStatus: (
    decisionId: string,
    input: UpdateAssemblyDecisionStatus
  ) => Promise<unknown>;
  onAttachDecisionEvidence: (
    decisionId: string,
    input: AttachDecisionEvidence
  ) => Promise<unknown>;
  onDeleteDecision: (decisionId: string) => Promise<unknown>;
}) {
  return (
    <div className="space-y-4">
      {stage === "preparation" ? (
        <PreparationStage
          agenda={agenda}
          agendaLoading={agendaLoading}
          assembly={assembly}
          busy={busy}
          canManage={canManage}
          canManageSupports={canManageSupports}
          capabilities={capabilities}
          onCreateAgendaItem={onCreateAgendaItem}
          onDeleteAgendaItem={onDeleteAgendaItem}
          onDownloadSupport={onDownloadSupport}
          onReorderAgenda={onReorderAgenda}
          onSupportStatusChange={onSupportStatusChange}
          onUpdateAgendaItem={onUpdateAgendaItem}
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
        <RegistrationStage
          assembly={assembly}
          attendees={attendees}
          attendeesLoading={attendeesLoading}
          busy={busy}
          canManage={canManage}
          capabilities={capabilities}
          onAccredit={onAccreditAttendee}
          onDownloadProxy={onDownloadProxy}
          onGenerateVoteLink={onGenerateVoteLink}
          onRevoke={onRevokeAttendee}
          onRevokeVoteLink={onRevokeVoteLink}
          people={people}
        />
      ) : null}
      {stage === "live" ? (
        <LiveStage
          agendaItems={agenda?.items ?? []}
          assembly={assembly}
          busy={busy}
          canManage={canManage}
          capabilities={capabilities}
          myAccreditations={myAccreditations}
          onCastSelfServiceVote={onCastSelfServiceVote}
          onCastVote={onCastVote}
          onCloseVoting={onCloseVoting}
          onOpenVoting={onOpenVoting}
          onRevokeVote={onRevokeVote}
          voting={voting}
          votingLoading={votingLoading}
        />
      ) : null}
      {stage === "minutes" ? (
        <MinutesStage
          assembly={assembly}
          busy={busy}
          canManage={canManage}
          capabilities={capabilities}
          minutes={minutes}
          minutesLoading={minutesLoading}
          onPublishMinutes={onPublishMinutes}
          onSaveMinutes={onSaveMinutes}
          onSignMinutes={onSignMinutes}
        />
      ) : null}
      {stage === "follow_up" ? (
        <FollowUpStage
          agendaItems={agenda?.items ?? []}
          assemblyId={assembly.id}
          busy={busy}
          canManage={canManage}
          canSuperviseDecisions={canSuperviseDecisions}
          capabilities={capabilities}
          decisions={decisions}
          decisionsLoading={decisionsLoading}
          onAttachDecisionEvidence={onAttachDecisionEvidence}
          onCreateDecision={onCreateDecision}
          onDeleteDecision={onDeleteDecision}
          onUpdateDecision={onUpdateDecision}
          onUpdateDecisionStatus={onUpdateDecisionStatus}
        />
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
  onSendEmailConvocation,
  onAccreditAttendee,
  onRevokeAttendee,
  onFetchAttendees,
  onDownloadProxy,
  onFetchAgenda,
  onCreateAgendaItem,
  onUpdateAgendaItem,
  onDeleteAgendaItem,
  onReorderAgenda,
  onFetchVoting,
  onOpenVoting,
  onCloseVoting,
  onCastVote,
  onRevokeVote,
  onFetchMyAccreditations,
  onCastSelfServiceVote,
  onGenerateVoteLink,
  onRevokeVoteLink,
  onStartAssembly,
  onCloseAssembly,
  onFetchMinutes,
  onSaveMinutes,
  onSignMinutes,
  onPublishMinutes,
  canSuperviseDecisions,
  onFetchDecisions,
  onCreateDecision,
  onUpdateDecision,
  onUpdateDecisionStatus,
  onAttachDecisionEvidence,
  onDeleteDecision
}: {
  assembly: AssemblyItem & { dossier: NonNullable<AssemblyItem["dossier"]> };
  people: CommunityPerson[];
  settings: AssemblySettings;
  canManage: boolean;
  canManageSupports: boolean;
  canSuperviseDecisions: boolean;
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
  onAccreditAttendee: (
    assemblyId: string,
    input: Omit<AccreditAssemblyAttendee, "soportePath">,
    evidenceFile?: File
  ) => Promise<AssemblyAttendee | null>;
  onRevokeAttendee: (assemblyId: string, attendeeId: string) => Promise<{ id: string } | null>;
  onFetchAttendees: (assemblyId: string) => Promise<AssemblyAttendee[]>;
  onDownloadProxy: (attendee: AssemblyAttendee) => Promise<void>;
  onFetchAgenda: (assemblyId: string) => Promise<AssemblyAgendaOverview>;
  onCreateAgendaItem: (
    assemblyId: string,
    input: CreateAgendaItem
  ) => Promise<AssemblyAgendaItem | null>;
  onUpdateAgendaItem: (
    assemblyId: string,
    itemId: string,
    input: UpdateAgendaItem
  ) => Promise<{ id: string } | null>;
  onDeleteAgendaItem: (assemblyId: string, itemId: string) => Promise<{ id: string } | null>;
  onReorderAgenda: (
    assemblyId: string,
    orderedIds: string[]
  ) => Promise<{ asambleaId: string; total: number } | null>;
  onFetchVoting: (assemblyId: string) => Promise<AssemblyAgendaVoting[]>;
  onOpenVoting: (assemblyId: string, itemId: string) => Promise<{ status: string } | null>;
  onCloseVoting: (assemblyId: string, itemId: string) => Promise<AssemblyVoteTally | null>;
  onCastVote: (
    assemblyId: string,
    itemId: string,
    input: CastVote
  ) => Promise<AssemblyVoteRecord | null>;
  onRevokeVote: (
    assemblyId: string,
    itemId: string,
    voteId: string
  ) => Promise<{ id: string } | null>;
  onFetchMyAccreditations: (assemblyId: string) => Promise<AssemblyOwnAccreditation[]>;
  onCastSelfServiceVote: (
    assemblyId: string,
    itemId: string,
    input: CastSelfServiceVote
  ) => Promise<AssemblyVoteRecord | null>;
  onGenerateVoteLink: (
    assemblyId: string,
    accreditationId: string
  ) => Promise<AssemblyVoteLink | null>;
  onRevokeVoteLink: (
    assemblyId: string,
    accreditationId: string
  ) => Promise<{ acreditacionId: string } | null>;
  onStartAssembly: (assemblyId: string) => Promise<{ status: string } | null>;
  onCloseAssembly: (assemblyId: string) => Promise<{ status: string } | null>;
  onFetchMinutes: (assemblyId: string) => Promise<AssemblyMinutesOverview>;
  onSaveMinutes: (
    assemblyId: string,
    input: SaveAssemblyMinutes
  ) => Promise<{ id: string; version: number } | null>;
  onSignMinutes: (assemblyId: string) => Promise<{ status: string } | null>;
  onPublishMinutes: (assemblyId: string) => Promise<{ status: string } | null>;
  onFetchDecisions: (assemblyId: string) => Promise<AssemblyDecisionsOverview>;
  onCreateDecision: (
    assemblyId: string,
    input: CreateAssemblyDecision
  ) => Promise<{ id: string; status: string } | null>;
  onUpdateDecision: (
    assemblyId: string,
    decisionId: string,
    input: UpdateAssemblyDecision
  ) => Promise<{ id: string } | null>;
  onUpdateDecisionStatus: (
    assemblyId: string,
    decisionId: string,
    input: UpdateAssemblyDecisionStatus
  ) => Promise<{ id: string; status: string } | null>;
  onAttachDecisionEvidence: (
    assemblyId: string,
    decisionId: string,
    input: AttachDecisionEvidence
  ) => Promise<{ id: string } | null>;
  onDeleteDecision: (assemblyId: string, decisionId: string) => Promise<{ id: string } | null>;
}) {
  const [activeStage, setActiveStage] = useState<AssemblyStage>(assembly.dossier.currentStage);
  const [attendees, setAttendees] = useState<AssemblyAttendee[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const readiness = assemblyReadinessPercent(assembly.dossier, settings.capabilities);

  // onFetchAttendees viene de un objeto de contexto que se recrea con cada
  // mutación global (paga una cuota, aprueba un gasto, etc.); leerlo por ref
  // evita que ESE churn, en vez de un cambio real de asamblea/etapa, dispare
  // el efecto de abajo. requestIdRef descarta la respuesta de una llamada que
  // ya no es la más reciente (por ejemplo la que dispara "busy" al iniciar una
  // acreditación, si resuelve después que el refetch posterior a esa acción).
  const onFetchAttendeesRef = useRef(onFetchAttendees);
  onFetchAttendeesRef.current = onFetchAttendees;
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    // React StrictMode simula montar/desmontar/remontar una vez en
    // desarrollo; sin este reinicio, el "desmontaje" simulado deja
    // mountedRef en false para siempre y refreshAttendees nunca vuelve a
    // aplicar su resultado, aunque el componente siga realmente montado.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshAttendees = useCallback(async () => {
    if (!canManage) return;
    const requestId = ++requestIdRef.current;
    setAttendeesLoading(true);
    try {
      const result = await onFetchAttendeesRef.current(assembly.id);
      if (mountedRef.current && requestIdRef.current === requestId) setAttendees(result);
    } finally {
      if (mountedRef.current && requestIdRef.current === requestId) setAttendeesLoading(false);
    }
  }, [assembly.id, canManage]);

  useEffect(() => {
    if (open && activeStage === "registration") void refreshAttendees();
  }, [activeStage, open, refreshAttendees]);

  // Mismo patrón y mismas razones que refreshAttendees arriba, salvo que el
  // orden del día es legible por los cuatro roles (no solo administración):
  // no hay guard de canManage.
  const [agenda, setAgenda] = useState<AssemblyAgendaOverview | null>(null);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const onFetchAgendaRef = useRef(onFetchAgenda);
  onFetchAgendaRef.current = onFetchAgenda;
  const agendaRequestIdRef = useRef(0);

  const refreshAgenda = useCallback(async () => {
    const requestId = ++agendaRequestIdRef.current;
    setAgendaLoading(true);
    try {
      const result = await onFetchAgendaRef.current(assembly.id);
      if (mountedRef.current && agendaRequestIdRef.current === requestId) setAgenda(result);
    } finally {
      if (mountedRef.current && agendaRequestIdRef.current === requestId) {
        setAgendaLoading(false);
      }
    }
  }, [assembly.id]);

  useEffect(() => {
    // "live" también depende de agendaItems (título, regla, umbral de cada
    // punto votable): sin este segundo disparador, abrir el expediente
    // directo en "live" (lo normal con la asamblea ya en_curso, sin pasar
    // por "preparation") deja el panel de votaciones sin puntos que mostrar.
    if (open && (activeStage === "preparation" || activeStage === "live")) void refreshAgenda();
  }, [activeStage, open, refreshAgenda]);

  // Mismo patrón que refreshAgenda: legible por los cuatro roles, disparado
  // solo en la etapa "live" donde vive el panel de votaciones.
  const [voting, setVoting] = useState<AssemblyAgendaVoting[] | null>(null);
  const [votingLoading, setVotingLoading] = useState(false);
  const onFetchVotingRef = useRef(onFetchVoting);
  onFetchVotingRef.current = onFetchVoting;
  const votingRequestIdRef = useRef(0);

  const refreshVoting = useCallback(async () => {
    const requestId = ++votingRequestIdRef.current;
    setVotingLoading(true);
    try {
      const result = await onFetchVotingRef.current(assembly.id);
      if (mountedRef.current && votingRequestIdRef.current === requestId) setVoting(result);
    } finally {
      if (mountedRef.current && votingRequestIdRef.current === requestId) {
        setVotingLoading(false);
      }
    }
  }, [assembly.id]);

  useEffect(() => {
    if (open && activeStage === "live") void refreshVoting();
  }, [activeStage, open, refreshVoting]);

  // Mismo patrón que refreshVoting, también disparado en "live": es lo que
  // alimenta el aviso "Vota ahora" para el asistente autenticado.
  const [myAccreditations, setMyAccreditations] = useState<AssemblyOwnAccreditation[]>([]);
  const onFetchMyAccreditationsRef = useRef(onFetchMyAccreditations);
  onFetchMyAccreditationsRef.current = onFetchMyAccreditations;
  const myAccreditationsRequestIdRef = useRef(0);

  const refreshMyAccreditations = useCallback(async () => {
    const requestId = ++myAccreditationsRequestIdRef.current;
    const result = await onFetchMyAccreditationsRef.current(assembly.id);
    if (mountedRef.current && myAccreditationsRequestIdRef.current === requestId) {
      setMyAccreditations(result);
    }
  }, [assembly.id]);

  useEffect(() => {
    if (open && activeStage === "live") void refreshMyAccreditations();
  }, [activeStage, open, refreshMyAccreditations]);

  // Mismo patrón que refreshVoting, disparado solo en la etapa "minutes"
  // donde vive el acta.
  const [minutes, setMinutes] = useState<AssemblyMinutesOverview | null>(null);
  const [minutesLoading, setMinutesLoading] = useState(false);
  const onFetchMinutesRef = useRef(onFetchMinutes);
  onFetchMinutesRef.current = onFetchMinutes;
  const minutesRequestIdRef = useRef(0);

  const refreshMinutes = useCallback(async () => {
    const requestId = ++minutesRequestIdRef.current;
    setMinutesLoading(true);
    try {
      const result = await onFetchMinutesRef.current(assembly.id);
      if (mountedRef.current && minutesRequestIdRef.current === requestId) setMinutes(result);
    } finally {
      if (mountedRef.current && minutesRequestIdRef.current === requestId) {
        setMinutesLoading(false);
      }
    }
  }, [assembly.id]);

  useEffect(() => {
    if (open && activeStage === "minutes") void refreshMinutes();
  }, [activeStage, open, refreshMinutes]);

  // Mismo patrón que refreshMinutes, disparado en la etapa "follow_up"
  // donde vive el seguimiento de decisiones.
  const [decisions, setDecisions] = useState<AssemblyDecisionsOverview | null>(null);
  const [decisionsLoading, setDecisionsLoading] = useState(false);
  const onFetchDecisionsRef = useRef(onFetchDecisions);
  onFetchDecisionsRef.current = onFetchDecisions;
  const decisionsRequestIdRef = useRef(0);

  const refreshDecisions = useCallback(async () => {
    const requestId = ++decisionsRequestIdRef.current;
    setDecisionsLoading(true);
    try {
      const result = await onFetchDecisionsRef.current(assembly.id);
      if (mountedRef.current && decisionsRequestIdRef.current === requestId) setDecisions(result);
    } finally {
      if (mountedRef.current && decisionsRequestIdRef.current === requestId) {
        setDecisionsLoading(false);
      }
    }
  }, [assembly.id]);

  useEffect(() => {
    if (open && activeStage === "follow_up") void refreshDecisions();
  }, [activeStage, open, refreshDecisions]);
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
          {canManage && assembly.status === "scheduled" ? (
            <Button
              disabled={busy === `assembly-start-${assembly.id}`}
              onClick={() => void onStartAssembly(assembly.id)}
              size="sm"
              variant="secondary"
            >
              {busy === `assembly-start-${assembly.id}` ? "Iniciando…" : "Iniciar asamblea"}
            </Button>
          ) : null}
          {canManage && assembly.status === "in_progress" ? (
            <Button
              disabled={busy === `assembly-close-${assembly.id}`}
              onClick={() => {
                if (
                  window.confirm(
                    "Cerrar la asamblea es necesario para poder firmar su acta y no puede deshacerse. ¿Continuar?"
                  )
                ) {
                  void onCloseAssembly(assembly.id);
                }
              }}
              size="sm"
              variant="secondary"
            >
              {busy === `assembly-close-${assembly.id}` ? "Cerrando…" : "Cerrar asamblea"}
            </Button>
          ) : null}
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
          agenda={agenda}
          agendaLoading={agendaLoading}
          assembly={assembly}
          attendees={attendees}
          attendeesLoading={attendeesLoading}
          busy={busy}
          canManage={canManage}
          canManageSupports={canManageSupports}
          capabilities={settings.capabilities}
          onAccreditAttendee={async (input, evidenceFile) => {
            const result = await onAccreditAttendee(assembly.id, input, evidenceFile);
            if (result) await refreshAttendees();
            return result;
          }}
          onCreateAgendaItem={async (input) => {
            const result = await onCreateAgendaItem(assembly.id, input);
            if (result) await refreshAgenda();
            return result;
          }}
          onDeleteAgendaItem={async (itemId) => {
            const result = await onDeleteAgendaItem(assembly.id, itemId);
            if (result) await refreshAgenda();
            return result;
          }}
          onDownloadProxy={onDownloadProxy}
          onDownloadSupport={onDownloadSupport}
          onGenerateVoteLink={(accreditationId) => onGenerateVoteLink(assembly.id, accreditationId)}
          onRevokeVoteLink={(accreditationId) => onRevokeVoteLink(assembly.id, accreditationId)}
          onRevokeAttendee={async (attendeeId) => {
            const result = await onRevokeAttendee(assembly.id, attendeeId);
            if (result) await refreshAttendees();
            return result;
          }}
          onReorderAgenda={async (orderedIds) => {
            const result = await onReorderAgenda(assembly.id, orderedIds);
            if (result) await refreshAgenda();
            return result;
          }}
          onSendEmailConvocation={onSendEmailConvocation}
          onSupportStatusChange={onSupportStatusChange}
          onToggleChecklist={onToggleChecklist}
          onUpdateAgendaItem={async (itemId, input) => {
            const result = await onUpdateAgendaItem(assembly.id, itemId, input);
            if (result) await refreshAgenda();
            return result;
          }}
          onUploadSupport={onUploadSupport}
          people={people}
          stage={activeStage}
          voting={voting}
          votingLoading={votingLoading}
          onOpenVoting={async (itemId) => {
            const result = await onOpenVoting(assembly.id, itemId);
            if (result) await refreshVoting();
            return result;
          }}
          onCloseVoting={async (itemId) => {
            const result = await onCloseVoting(assembly.id, itemId);
            if (result) await refreshVoting();
            return result;
          }}
          onCastVote={async (itemId, input) => {
            const result = await onCastVote(assembly.id, itemId, input);
            if (result) await refreshVoting();
            return result;
          }}
          onRevokeVote={async (itemId, voteId) => {
            const result = await onRevokeVote(assembly.id, itemId, voteId);
            if (result) await refreshVoting();
            return result;
          }}
          myAccreditations={myAccreditations}
          onCastSelfServiceVote={async (itemId, input) => {
            const result = await onCastSelfServiceVote(assembly.id, itemId, input);
            if (result) {
              await refreshVoting();
              await refreshMyAccreditations();
            }
            return result;
          }}
          minutes={minutes}
          minutesLoading={minutesLoading}
          onSaveMinutes={async (input) => {
            const result = await onSaveMinutes(assembly.id, input);
            if (result) await refreshMinutes();
            return result;
          }}
          onSignMinutes={async () => {
            const result = await onSignMinutes(assembly.id);
            if (result) await refreshMinutes();
            return result;
          }}
          onPublishMinutes={async () => {
            const result = await onPublishMinutes(assembly.id);
            if (result) await refreshMinutes();
            return result;
          }}
          canSuperviseDecisions={canSuperviseDecisions}
          decisions={decisions}
          decisionsLoading={decisionsLoading}
          onCreateDecision={async (input) => {
            const result = await onCreateDecision(assembly.id, input);
            if (result) await refreshDecisions();
            return result;
          }}
          onUpdateDecision={async (decisionId, input) => {
            const result = await onUpdateDecision(assembly.id, decisionId, input);
            if (result) await refreshDecisions();
            return result;
          }}
          onUpdateDecisionStatus={async (decisionId, input) => {
            const result = await onUpdateDecisionStatus(assembly.id, decisionId, input);
            if (result) await refreshDecisions();
            return result;
          }}
          onAttachDecisionEvidence={async (decisionId, input) => {
            const result = await onAttachDecisionEvidence(assembly.id, decisionId, input);
            if (result) await refreshDecisions();
            return result;
          }}
          onDeleteDecision={async (decisionId) => {
            const result = await onDeleteDecision(assembly.id, decisionId);
            if (result) await refreshDecisions();
            return result;
          }}
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
  onSendEmailConvocation,
  onAccreditAttendee,
  onRevokeAttendee,
  onFetchAttendees,
  onDownloadProxy,
  onFetchAgenda,
  onCreateAgendaItem,
  onUpdateAgendaItem,
  onDeleteAgendaItem,
  onReorderAgenda,
  onFetchVoting,
  onOpenVoting,
  onCloseVoting,
  onCastVote,
  onRevokeVote,
  onFetchMyAccreditations,
  onCastSelfServiceVote,
  onGenerateVoteLink,
  onRevokeVoteLink,
  onStartAssembly,
  onCloseAssembly,
  onFetchMinutes,
  onSaveMinutes,
  onSignMinutes,
  onPublishMinutes,
  canSuperviseDecisions,
  onFetchDecisions,
  onCreateDecision,
  onUpdateDecision,
  onUpdateDecisionStatus,
  onAttachDecisionEvidence,
  onDeleteDecision
}: {
  assemblies: AssemblyItem[];
  people: CommunityPerson[];
  settings?: AssemblySettings;
  canManage: boolean;
  canManageSupports: boolean;
  canSuperviseDecisions: boolean;
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
  onAccreditAttendee: (
    assemblyId: string,
    input: Omit<AccreditAssemblyAttendee, "soportePath">,
    evidenceFile?: File
  ) => Promise<AssemblyAttendee | null>;
  onRevokeAttendee: (assemblyId: string, attendeeId: string) => Promise<{ id: string } | null>;
  onFetchAttendees: (assemblyId: string) => Promise<AssemblyAttendee[]>;
  onDownloadProxy: (attendee: AssemblyAttendee) => Promise<void>;
  onFetchAgenda: (assemblyId: string) => Promise<AssemblyAgendaOverview>;
  onCreateAgendaItem: (
    assemblyId: string,
    input: CreateAgendaItem
  ) => Promise<AssemblyAgendaItem | null>;
  onUpdateAgendaItem: (
    assemblyId: string,
    itemId: string,
    input: UpdateAgendaItem
  ) => Promise<{ id: string } | null>;
  onDeleteAgendaItem: (assemblyId: string, itemId: string) => Promise<{ id: string } | null>;
  onReorderAgenda: (
    assemblyId: string,
    orderedIds: string[]
  ) => Promise<{ asambleaId: string; total: number } | null>;
  onFetchVoting: (assemblyId: string) => Promise<AssemblyAgendaVoting[]>;
  onOpenVoting: (assemblyId: string, itemId: string) => Promise<{ status: string } | null>;
  onCloseVoting: (assemblyId: string, itemId: string) => Promise<AssemblyVoteTally | null>;
  onCastVote: (
    assemblyId: string,
    itemId: string,
    input: CastVote
  ) => Promise<AssemblyVoteRecord | null>;
  onRevokeVote: (
    assemblyId: string,
    itemId: string,
    voteId: string
  ) => Promise<{ id: string } | null>;
  onFetchMyAccreditations: (assemblyId: string) => Promise<AssemblyOwnAccreditation[]>;
  onCastSelfServiceVote: (
    assemblyId: string,
    itemId: string,
    input: CastSelfServiceVote
  ) => Promise<AssemblyVoteRecord | null>;
  onGenerateVoteLink: (
    assemblyId: string,
    accreditationId: string
  ) => Promise<AssemblyVoteLink | null>;
  onRevokeVoteLink: (
    assemblyId: string,
    accreditationId: string
  ) => Promise<{ acreditacionId: string } | null>;
  onStartAssembly: (assemblyId: string) => Promise<{ status: string } | null>;
  onCloseAssembly: (assemblyId: string) => Promise<{ status: string } | null>;
  onFetchMinutes: (assemblyId: string) => Promise<AssemblyMinutesOverview>;
  onSaveMinutes: (
    assemblyId: string,
    input: SaveAssemblyMinutes
  ) => Promise<{ id: string; version: number } | null>;
  onSignMinutes: (assemblyId: string) => Promise<{ status: string } | null>;
  onPublishMinutes: (assemblyId: string) => Promise<{ status: string } | null>;
  onFetchDecisions: (assemblyId: string) => Promise<AssemblyDecisionsOverview>;
  onCreateDecision: (
    assemblyId: string,
    input: CreateAssemblyDecision
  ) => Promise<{ id: string; status: string } | null>;
  onUpdateDecision: (
    assemblyId: string,
    decisionId: string,
    input: UpdateAssemblyDecision
  ) => Promise<{ id: string } | null>;
  onUpdateDecisionStatus: (
    assemblyId: string,
    decisionId: string,
    input: UpdateAssemblyDecisionStatus
  ) => Promise<{ id: string; status: string } | null>;
  onAttachDecisionEvidence: (
    assemblyId: string,
    decisionId: string,
    input: AttachDecisionEvidence
  ) => Promise<{ id: string } | null>;
  onDeleteDecision: (assemblyId: string, decisionId: string) => Promise<{ id: string } | null>;
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
          onAccreditAttendee={onAccreditAttendee}
          onCreateAgendaItem={onCreateAgendaItem}
          onDeleteAgendaItem={onDeleteAgendaItem}
          onDownloadProxy={onDownloadProxy}
          onDownloadSupport={onDownloadSupport}
          onFetchAgenda={onFetchAgenda}
          onFetchAttendees={onFetchAttendees}
          onFetchVoting={onFetchVoting}
          onOpenVoting={onOpenVoting}
          onCloseVoting={onCloseVoting}
          onCastVote={onCastVote}
          onRevokeVote={onRevokeVote}
          onFetchMyAccreditations={onFetchMyAccreditations}
          onCastSelfServiceVote={onCastSelfServiceVote}
          onGenerateVoteLink={onGenerateVoteLink}
          onRevokeVoteLink={onRevokeVoteLink}
          onStartAssembly={onStartAssembly}
          onCloseAssembly={onCloseAssembly}
          onFetchMinutes={onFetchMinutes}
          onSaveMinutes={onSaveMinutes}
          onSignMinutes={onSignMinutes}
          onPublishMinutes={onPublishMinutes}
          canSuperviseDecisions={canSuperviseDecisions}
          onFetchDecisions={onFetchDecisions}
          onCreateDecision={onCreateDecision}
          onUpdateDecision={onUpdateDecision}
          onUpdateDecisionStatus={onUpdateDecisionStatus}
          onAttachDecisionEvidence={onAttachDecisionEvidence}
          onDeleteDecision={onDeleteDecision}
          onRevokeAttendee={onRevokeAttendee}
          onReorderAgenda={onReorderAgenda}
          onSendEmailConvocation={onSendEmailConvocation}
          onOpenChange={(open) => {
            if (!open) setSelectedAssemblyId(null);
          }}
          onSupportStatusChange={onSupportStatusChange}
          onToggleChecklist={onToggleChecklist}
          onUpdateAgendaItem={onUpdateAgendaItem}
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
