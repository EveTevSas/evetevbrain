"use client";

import type {
  AssemblyAgendaItem,
  AssemblyAttendee,
  AssemblyAttendeeQuality,
  AssemblyDecisionItem,
  AssemblyDecisionsOverview,
  AttachDecisionEvidence,
  CreateAssemblyDecision,
  DecisionStatus,
  UpdateAssemblyDecision,
  UpdateAssemblyDecisionStatus
} from "@/lib/contracts";
import { Badge, Button, Card, EmptyState } from "@/lib/ui";
import { ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Field, SelectInput, TextInput } from "./form-field";

const qualityLabels: Record<AssemblyAttendeeQuality, string> = {
  propietario: "Propietario",
  apoderado: "Apoderado",
  residente_con_voz: "Residente con voz",
  invitado: "Invitado"
};

const statusLabels: Record<DecisionStatus, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completada"
};

function statusTone(status: DecisionStatus): "success" | "warning" | "neutral" {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  return "neutral";
}

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric"
});

function formatDate(value: string): string {
  return dateFormatter.format(new Date(`${value}T12:00:00`));
}

function DecisionForm({
  assemblyId,
  overview,
  agendaItems,
  busy,
  onCreate
}: {
  assemblyId: string;
  overview: AssemblyDecisionsOverview;
  agendaItems: AssemblyAgendaItem[];
  busy: string | null;
  onCreate: (input: CreateAssemblyDecision) => Promise<unknown>;
}) {
  const [agendaItemId, setAgendaItemId] = useState("");
  const [title, setTitle] = useState("");
  const [ownerPersonId, setOwnerPersonId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const busyKey = `assembly-decisions-create-${assemblyId}`;

  const attendeeOptions = overview.attendees.filter(
    (attendee) => attendee.personaId && attendee.personaNombre
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!ownerPersonId || !dueDate) {
      setError("Selecciona un responsable y una fecha límite.");
      return;
    }
    const result = await onCreate({
      agendaItemId: agendaItemId || null,
      title,
      ownerPersonId,
      dueDate
    });
    if (result) {
      setAgendaItemId("");
      setTitle("");
      setOwnerPersonId("");
      setDueDate("");
    } else {
      setError("No fue posible crear la decisión; revisa los datos.");
    }
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
      <Field label="Título del compromiso">
        <TextInput
          maxLength={200}
          minLength={5}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ej. Publicar el presupuesto aprobado"
          required
          value={title}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Responsable">
          <SelectInput
            onChange={(event) => setOwnerPersonId(event.target.value)}
            value={ownerPersonId}
          >
            <option value="">Selecciona un asistente…</option>
            {attendeeOptions.map((attendee) => (
              <option key={attendee.id} value={attendee.personaId}>
                {attendee.personaNombre} · {qualityLabels[attendee.calidad]}
                {attendee.unidadCodigo ? ` · ${attendee.unidadCodigo}` : ""}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Fecha límite">
          <TextInput
            onChange={(event) => setDueDate(event.target.value)}
            required
            type="date"
            value={dueDate}
          />
        </Field>
      </div>
      {agendaItems.length ? (
        <Field hint="Opcional." label="Punto del orden del día de origen">
          <SelectInput
            onChange={(event) => setAgendaItemId(event.target.value)}
            value={agendaItemId}
          >
            <option value="">Sin punto asociado</option>
            {agendaItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </SelectInput>
        </Field>
      ) : null}
      {error ? (
        <p className="text-sm font-semibold text-[var(--eve-error)]" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button disabled={busy === busyKey} type="submit">
          <Plus size={15} />
          {busy === busyKey ? "Creando…" : "Crear decisión"}
        </Button>
      </div>
    </form>
  );
}

function DecisionEditForm({
  decision,
  attendeeOptions,
  busy,
  onUpdate,
  onCancel
}: {
  decision: AssemblyDecisionItem;
  attendeeOptions: AssemblyAttendee[];
  busy: string | null;
  onUpdate: (decisionId: string, input: UpdateAssemblyDecision) => Promise<unknown>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(decision.title);
  const [ownerPersonId, setOwnerPersonId] = useState(decision.ownerPersonId);
  const [dueDate, setDueDate] = useState(decision.dueDate);
  const [error, setError] = useState<string | null>(null);
  const busyKey = `assembly-decisions-update-${decision.id}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const result = await onUpdate(decision.id, { title, ownerPersonId, dueDate });
    if (result) onCancel();
    else setError("No fue posible guardar los cambios; revisa los datos.");
  }

  return (
    <form
      className="mt-2 grid gap-3 rounded-lg bg-[var(--wash)] p-3"
      onSubmit={(event) => void submit(event)}
    >
      <Field label="Título del compromiso">
        <TextInput
          maxLength={200}
          minLength={5}
          onChange={(event) => setTitle(event.target.value)}
          required
          value={title}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Responsable">
          <SelectInput
            onChange={(event) => setOwnerPersonId(event.target.value)}
            value={ownerPersonId}
          >
            {attendeeOptions.map((attendee) => (
              <option key={attendee.id} value={attendee.personaId}>
                {attendee.personaNombre} · {qualityLabels[attendee.calidad]}
                {attendee.unidadCodigo ? ` · ${attendee.unidadCodigo}` : ""}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Fecha límite">
          <TextInput
            onChange={(event) => setDueDate(event.target.value)}
            required
            type="date"
            value={dueDate}
          />
        </Field>
      </div>
      {error ? (
        <p className="text-sm font-semibold text-[var(--eve-error)]" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} size="sm" type="button" variant="secondary">
          Cancelar
        </Button>
        <Button disabled={busy === busyKey} size="sm" type="submit">
          {busy === busyKey ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

function DecisionRow({
  decision,
  attendeeOptions,
  canManage,
  canSuperviseDecisions,
  busy,
  onUpdate,
  onUpdateStatus,
  onAttachEvidence,
  onDelete
}: {
  decision: AssemblyDecisionItem;
  attendeeOptions: AssemblyAttendee[];
  canManage: boolean;
  canSuperviseDecisions: boolean;
  busy: string | null;
  onUpdate: (decisionId: string, input: UpdateAssemblyDecision) => Promise<unknown>;
  onUpdateStatus: (decisionId: string, input: UpdateAssemblyDecisionStatus) => Promise<unknown>;
  onAttachEvidence: (decisionId: string, input: AttachDecisionEvidence) => Promise<unknown>;
  onDelete: (decisionId: string) => Promise<unknown>;
}) {
  const [evidenceNote, setEvidenceNote] = useState(decision.evidenceNote ?? "");
  const [editing, setEditing] = useState(false);
  const completed = decision.status === "completed";
  const statusBusyKey = `assembly-decisions-status-${decision.id}`;
  const evidenceBusyKey = `assembly-decisions-evidence-${decision.id}`;
  const deleteBusyKey = `assembly-decisions-delete-${decision.id}`;

  if (editing) {
    return (
      <div className="p-4">
        <DecisionEditForm
          attendeeOptions={attendeeOptions}
          busy={busy}
          decision={decision}
          onCancel={() => setEditing(false)}
          onUpdate={onUpdate}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-start">
      <div>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold">{decision.title}</p>
          {canManage && !completed ? (
            <button
              className="focus-ring flex shrink-0 items-center gap-1 text-xs font-bold text-[var(--accent)] hover:underline"
              onClick={() => setEditing(true)}
              type="button"
            >
              <Pencil size={13} /> Editar
            </button>
          ) : null}
        </div>
        {decision.agendaItemTitle ? (
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Del punto: {decision.agendaItemTitle}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-[var(--muted)]">
          Responsable: {decision.ownerName ?? "—"} · Vence {formatDate(decision.dueDate)}
        </p>
        {decision.evidenceNote ? (
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Evidencia: {decision.evidenceNote}
          </p>
        ) : null}
        {canManage ? (
          <form
            className="mt-2 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (evidenceNote.trim()) void onAttachEvidence(decision.id, { evidenceNote });
            }}
          >
            <TextInput
              className="max-w-xs"
              onChange={(event) => setEvidenceNote(event.target.value)}
              placeholder="Nota de evidencia (enlace o referencia)…"
              value={evidenceNote}
            />
            <Button
              disabled={busy === evidenceBusyKey || !evidenceNote.trim()}
              size="sm"
              type="submit"
              variant="secondary"
            >
              {busy === evidenceBusyKey ? "Guardando…" : "Guardar evidencia"}
            </Button>
          </form>
        ) : null}
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        {canSuperviseDecisions && !completed ? (
          <SelectInput
            className="h-9 w-auto"
            disabled={busy === statusBusyKey}
            onChange={(event) => {
              const status = event.target.value as DecisionStatus;
              if (
                status === "completed" &&
                !window.confirm(
                  "Marcar como completada es definitivo: la decisión ya no podrá editarse. ¿Continuar?"
                )
              ) {
                return;
              }
              void onUpdateStatus(decision.id, { status });
            }}
            value={decision.status}
          >
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </SelectInput>
        ) : (
          <Badge tone={statusTone(decision.status)}>{statusLabels[decision.status]}</Badge>
        )}
        {canManage && !completed ? (
          <button
            className="focus-ring flex items-center gap-1 text-xs font-bold text-[var(--eve-error)] hover:underline"
            disabled={busy === deleteBusyKey}
            onClick={() => void onDelete(decision.id)}
            type="button"
          >
            <Trash2 size={13} /> Eliminar
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function AssemblyDecisionsPanel({
  assemblyId,
  overview,
  agendaItems,
  loading,
  canManage,
  canSuperviseDecisions,
  busy,
  onCreate,
  onUpdate,
  onUpdateStatus,
  onAttachEvidence,
  onDelete
}: {
  assemblyId: string;
  overview: AssemblyDecisionsOverview | null;
  agendaItems: AssemblyAgendaItem[];
  loading: boolean;
  canManage: boolean;
  canSuperviseDecisions: boolean;
  busy: string | null;
  onCreate: (input: CreateAssemblyDecision) => Promise<unknown>;
  onUpdate: (decisionId: string, input: UpdateAssemblyDecision) => Promise<unknown>;
  onUpdateStatus: (decisionId: string, input: UpdateAssemblyDecisionStatus) => Promise<unknown>;
  onAttachEvidence: (decisionId: string, input: AttachDecisionEvidence) => Promise<unknown>;
  onDelete: (decisionId: string) => Promise<unknown>;
}) {
  const attendeeOptions = overview
    ? overview.attendees.filter((attendee) => attendee.personaId && attendee.personaNombre)
    : [];
  if (loading || !overview) {
    return (
      <Card className="p-5 hover:translate-y-0">
        <p className="text-sm text-[var(--muted)]">Cargando decisiones…</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <Card className="p-5 hover:translate-y-0">
          <h3 className="font-extrabold">Nueva decisión</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Solo puede crearse una vez que la asamblea cerró y su acta quedó firmada.
          </p>
          <div className="mt-4">
            <DecisionForm
              agendaItems={agendaItems}
              assemblyId={assemblyId}
              busy={busy}
              onCreate={onCreate}
              overview={overview}
            />
          </div>
        </Card>
      ) : null}

      <Card className="overflow-hidden hover:translate-y-0">
        <div className="border-b border-[var(--line)] p-5">
          <h3 className="font-extrabold">Compromisos aprobados</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            El consejo supervisa su ejecución y la administración aporta evidencias.
          </p>
        </div>
        {overview.decisions.length ? (
          <div className="divide-y divide-[var(--line)]">
            {overview.decisions.map((decision) => (
              <DecisionRow
                attendeeOptions={attendeeOptions}
                busy={busy}
                canManage={canManage}
                canSuperviseDecisions={canSuperviseDecisions}
                decision={decision}
                key={decision.id}
                onAttachEvidence={onAttachEvidence}
                onDelete={onDelete}
                onUpdate={onUpdate}
                onUpdateStatus={onUpdateStatus}
              />
            ))}
          </div>
        ) : (
          <div className="p-5">
            <EmptyState
              icon={<ListChecks size={20} />}
              title="Todavía no hay decisiones por ejecutar"
              description="Al cerrar la asamblea y firmar el acta, cada decisión podrá asignarse con responsable, fecha y evidencia."
            />
          </div>
        )}
      </Card>
    </div>
  );
}
