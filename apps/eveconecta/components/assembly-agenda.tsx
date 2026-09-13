"use client";

import { parseAgendaThreshold } from "@/lib/assemblies";
import type {
  AssemblyAgendaItem,
  AssemblyAgendaOverview,
  CreateAgendaItem,
  UpdateAgendaItem
} from "@/lib/contracts";
import { Badge, Button, Card, EmptyState } from "@/lib/ui";
import {
  ArrowDown,
  ArrowUp,
  ClipboardCheck,
  LockKeyhole,
  Pencil,
  Plus,
  Trash2
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Field, SelectInput, TextInput } from "./form-field";
import { Modal } from "./modal";

const decisionTypeLabels: Record<AssemblyAgendaItem["decisionType"], string> = {
  informative: "Informativo",
  economic: "Económica",
  non_economic: "No económica",
  qualified: "Mayoría calificada"
};

const votingRuleLabels: Record<AssemblyAgendaItem["votingRule"], string> = {
  none: "Sin votación",
  unit: "Un voto por unidad",
  coefficient: "Por coeficiente representado",
  qualified_coefficient: "Mayoría calificada · total de coeficientes"
};

const statusLabels: Record<AssemblyAgendaItem["status"], string> = {
  draft: "Borrador",
  ready: "Listo",
  voted: "Votado"
};

function statusTone(status: AssemblyAgendaItem["status"]): "success" | "info" | "neutral" {
  if (status === "voted") return "success";
  if (status === "ready") return "info";
  return "neutral";
}

const lockedReasonLabels: Record<NonNullable<AssemblyAgendaOverview["lockedReason"]>, string> = {
  in_progress: "La asamblea ya está en curso: el orden del día quedó fijo.",
  closed: "La asamblea está cerrada: el orden del día quedó fijo.",
  extraordinary_convocation_sent:
    "Es una asamblea extraordinaria y ya se envió la convocatoria: solo puede decidirse sobre lo anunciado."
};

interface AgendaFormValue {
  title: string;
  decisionType: AssemblyAgendaItem["decisionType"];
  votingRule: AssemblyAgendaItem["votingRule"];
  thresholdPercent: string;
  status: "draft" | "ready";
}

function defaultsFor(item: AssemblyAgendaItem | null): AgendaFormValue {
  return {
    title: item?.title ?? "",
    decisionType: item?.decisionType ?? "non_economic",
    votingRule: item?.votingRule ?? "unit",
    thresholdPercent: item?.thresholdPercent ? String(item.thresholdPercent) : "50",
    status: item?.status === "ready" ? "ready" : "draft"
  };
}

function AgendaItemForm({
  assemblyId,
  open,
  onOpenChange,
  editing,
  busy,
  onCreate,
  onUpdate
}: {
  assemblyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AssemblyAgendaItem | null;
  busy: string | null;
  onCreate: (input: CreateAgendaItem) => Promise<AssemblyAgendaItem | null>;
  onUpdate: (itemId: string, input: UpdateAgendaItem) => Promise<{ id: string } | null>;
}) {
  const [value, setValue] = useState<AgendaFormValue>(() => defaultsFor(editing));
  const [error, setError] = useState<string | null>(null);
  const busyKey = editing
    ? `assembly-agenda-update-${editing.id}`
    : `assembly-agenda-create-${assemblyId}`;

  useEffect(() => {
    if (open) setValue(defaultsFor(editing));
  }, [editing, open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const isInformative = value.decisionType === "informative";
    const thresholdPercent = isInformative ? null : parseAgendaThreshold(value.thresholdPercent);
    if (!isInformative && thresholdPercent === null) {
      setError("Indica un umbral válido, por ejemplo 50 o 70.5.");
      return;
    }
    const result = editing
      ? await onUpdate(editing.id, {
          title: value.title,
          decisionType: value.decisionType,
          votingRule: isInformative ? "none" : value.votingRule,
          thresholdPercent,
          status: value.status
        })
      : await onCreate({
          title: value.title,
          decisionType: value.decisionType,
          votingRule: isInformative ? "none" : value.votingRule,
          thresholdPercent
        });
    if (result) onOpenChange(false);
    else setError("No fue posible guardar el punto; revisa los datos.");
  }

  return (
    <Modal
      description="Cada punto declara su universo electoral y la mayoría aplicable."
      onOpenChange={onOpenChange}
      open={open}
      title={editing ? "Editar punto" : "Agregar punto"}
    >
      <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
        <Field label="Título">
          <TextInput
            maxLength={200}
            minLength={5}
            onChange={(event) => setValue((current) => ({ ...current, title: event.target.value }))}
            placeholder="Ej. Aprobación del presupuesto 2027"
            required
            value={value.title}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo de decisión">
            <SelectInput
              onChange={(event) => {
                const decisionType = event.target.value as AssemblyAgendaItem["decisionType"];
                setValue((current) => ({
                  ...current,
                  decisionType,
                  votingRule: decisionType === "informative" ? "none" : current.votingRule
                }));
              }}
              value={value.decisionType}
            >
              {Object.entries(decisionTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </SelectInput>
          </Field>
          {value.decisionType !== "informative" ? (
            <Field label="Regla de votación">
              <SelectInput
                onChange={(event) =>
                  setValue((current) => ({
                    ...current,
                    votingRule: event.target.value as AssemblyAgendaItem["votingRule"]
                  }))
                }
                value={value.votingRule}
              >
                {Object.entries(votingRuleLabels)
                  .filter(([key]) => key !== "none")
                  .map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
              </SelectInput>
            </Field>
          ) : null}
        </div>
        {value.decisionType !== "informative" ? (
          <Field
            hint={
              value.decisionType === "qualified"
                ? "Una mayoría calificada exige un umbral superior al 50%."
                : "Porcentaje mínimo para aprobar este punto."
            }
            label="Umbral (%)"
          >
            <TextInput
              inputMode="decimal"
              onChange={(event) =>
                setValue((current) => ({ ...current, thresholdPercent: event.target.value }))
              }
              placeholder="50"
              required
              value={value.thresholdPercent}
            />
          </Field>
        ) : null}
        {editing ? (
          <Field label="Estado">
            <SelectInput
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  status: event.target.value as "draft" | "ready"
                }))
              }
              value={value.status}
            >
              <option value="draft">Borrador</option>
              <option value="ready">Listo</option>
            </SelectInput>
          </Field>
        ) : null}
        {error ? (
          <p className="text-sm font-semibold text-[var(--eve-error)]" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} type="button" variant="secondary">
            Cancelar
          </Button>
          <Button disabled={busy === busyKey} type="submit">
            {busy === busyKey ? "Guardando…" : editing ? "Guardar cambios" : "Agregar punto"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function AssemblyAgendaPanel({
  assemblyId,
  overview,
  loading,
  canManage,
  busy,
  onCreate,
  onUpdate,
  onDelete,
  onReorder
}: {
  assemblyId: string;
  overview: AssemblyAgendaOverview | null;
  loading: boolean;
  canManage: boolean;
  busy: string | null;
  onCreate: (input: CreateAgendaItem) => Promise<AssemblyAgendaItem | null>;
  onUpdate: (itemId: string, input: UpdateAgendaItem) => Promise<{ id: string } | null>;
  onDelete: (itemId: string) => Promise<{ id: string } | null>;
  onReorder: (orderedIds: string[]) => Promise<unknown>;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AssemblyAgendaItem | null>(null);
  const items = overview?.items ?? [];
  const editable = canManage && !overview?.locked;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(item: AssemblyAgendaItem) {
    setEditing(item);
    setFormOpen(true);
  }

  const reordering = busy === `assembly-agenda-reorder-${assemblyId}`;

  function move(index: number, direction: -1 | 1) {
    // Bloqueado mientras hay un reorder en vuelo: `items` viene de `overview`
    // y solo se actualiza cuando ese reorder resuelve y refresca la agenda,
    // así que un segundo clic antes de eso calcularía sobre un orden ya
    // obsoleto y podría pisar silenciosamente el primer movimiento.
    if (reordering) return;
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const reordered = [...items];
    const [moved] = reordered.splice(index, 1);
    if (!moved) return;
    reordered.splice(target, 0, moved);
    void onReorder(reordered.map((item) => item.id));
  }

  return (
    <Card className="p-5 hover:translate-y-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-extrabold">Orden del día y reglas</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Cada punto declara el universo electoral y la mayoría aplicable.
          </p>
        </div>
        {overview?.locked ? (
          <Badge tone="warning">
            <LockKeyhole size={12} className="mr-1" /> Bloqueado
          </Badge>
        ) : (
          <Badge tone="info">Editable</Badge>
        )}
      </div>
      {overview?.locked && overview.lockedReason ? (
        <p className="mt-3 rounded-xl bg-[var(--wash)]/65 p-3 text-xs leading-5 text-[var(--muted)]">
          {lockedReasonLabels[overview.lockedReason]}
        </p>
      ) : null}
      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-[var(--muted)]">Cargando orden del día…</p>
        ) : items.length ? (
          items.map((item, index) => (
            <div className="rounded-xl border border-[var(--line)] p-4" key={item.id}>
              <div className="flex items-start gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-xs font-extrabold text-[var(--accent)]">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{item.title}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone="neutral">{decisionTypeLabels[item.decisionType]}</Badge>
                    <Badge tone="neutral">{votingRuleLabels[item.votingRule]}</Badge>
                    {item.thresholdPercent ? (
                      <Badge tone="info">Umbral {item.thresholdPercent}%</Badge>
                    ) : null}
                    <Badge tone={statusTone(item.status)}>{statusLabels[item.status]}</Badge>
                  </div>
                </div>
                {editable ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      aria-label="Mover arriba"
                      className="focus-ring grid size-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--wash)] disabled:opacity-30"
                      disabled={index === 0 || reordering}
                      onClick={() => move(index, -1)}
                      type="button"
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      aria-label="Mover abajo"
                      className="focus-ring grid size-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--wash)] disabled:opacity-30"
                      disabled={index === items.length - 1 || reordering}
                      onClick={() => move(index, 1)}
                      type="button"
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      aria-label="Editar punto"
                      className="focus-ring grid size-8 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--wash)]"
                      onClick={() => openEdit(item)}
                      type="button"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      aria-label="Eliminar punto"
                      className="focus-ring grid size-8 place-items-center rounded-lg text-[var(--eve-error)] hover:bg-[var(--wash)]"
                      disabled={busy === `assembly-agenda-delete-${item.id}`}
                      onClick={() => void onDelete(item.id)}
                      type="button"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            description={
              editable
                ? "Agrega el primer punto para empezar a construir el expediente."
                : "La administración todavía no ha definido el orden del día."
            }
            icon={<ClipboardCheck size={20} />}
            title="Sin puntos definidos"
          />
        )}
      </div>
      {editable ? (
        <Button className="mt-4" onClick={openCreate} size="sm" variant="secondary">
          <Plus size={15} /> Agregar punto
        </Button>
      ) : null}
      <AgendaItemForm
        assemblyId={assemblyId}
        busy={busy}
        editing={editing}
        onCreate={onCreate}
        onOpenChange={setFormOpen}
        onUpdate={onUpdate}
        open={formOpen}
      />
    </Card>
  );
}
